"use client";

import { useEffect, useRef } from "react";
import { PARTICLES, particleCount, sceneEraAt, type ParticleKind, type ParticleSpec, type SceneEra } from "@/lib/background";
import { rng } from "@/lib/scene-shapes";
import { scrollStore, useIsMobile, useReducedMotion } from "@/lib/store";
import { backgroundStore } from "./backgroundStore";

/**
 * Lapisan 4: partikel depan yang besar, sedikit (12 sampai 36), dan buram (kedalaman bidang).
 * Debu emas, abu, daun, percikan air, serpihan kertas sesuai masa. Digambar di kanvas 2D setengah
 * resolusi memakai sprite lembut yang dibuat sekali, tanpa filter blur per frame. Bergerak lebih
 * cepat dari guliran untuk memberi kedalaman, dan menjauh perlahan dari kursor.
 */

const SPRITE = 96;
const MAX = 40;

interface P {
  x: number;
  y: number;
  /** kedalaman 0,35..1: makin dekat makin besar, cepat, dan buram */
  z: number;
  size: number;
  rot: number;
  vr: number;
  phase: number;
  /** dorongan dari kursor yang meluruh */
  px: number;
  py: number;
}

/** Sprite lembut untuk satu jenis partikel (digambar ke kanvas luar layar, hanya sekali). */
function makeSprite(spec: ParticleSpec): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = SPRITE;
  c.height = SPRITE;
  const g = c.getContext("2d");
  if (!g) return c;
  const [r, gr, b] = spec.color;
  const mid = SPRITE / 2;
  const blob = (rx: number, ry: number, rot: number, a: number) => {
    g.save();
    g.translate(mid, mid);
    g.rotate(rot);
    g.scale(rx, ry);
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    grad.addColorStop(0, `rgba(${r},${gr},${b},${a})`);
    grad.addColorStop(0.55, `rgba(${r},${gr},${b},${a * 0.55})`);
    grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, 1, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  const shapes: Record<ParticleKind, () => void> = {
    dust: () => blob(mid * 0.82, mid * 0.82, 0, 0.55),
    ash: () => {
      blob(mid * 0.6, mid * 0.5, 0.4, 0.5);
      blob(mid * 0.4, mid * 0.45, -0.7, 0.4);
    },
    leaf: () => {
      blob(mid * 0.9, mid * 0.38, 0.5, 0.6);
      blob(mid * 0.5, mid * 0.18, 0.5, 0.35);
    },
    drop: () => blob(mid * 0.34, mid * 0.78, 0, 0.55),
    spray: () => {
      blob(mid * 0.7, mid * 0.7, 0, 0.35);
      blob(mid * 0.32, mid * 0.32, 0, 0.55);
    },
    paper: () => blob(mid * 0.8, mid * 0.6, 0.15, 0.55),
    pollen: () => {
      blob(mid * 0.85, mid * 0.85, 0, 0.3);
      blob(mid * 0.3, mid * 0.3, 0, 0.7);
    },
    brick: () => blob(mid * 0.62, mid * 0.5, -0.3, 0.55),
  };
  shapes[spec.kind]();
  return c;
}

function spawn(seed: number, n: number): P[] {
  const r = rng(seed);
  return Array.from({ length: MAX }, (_, i) => ({
    x: r(),
    y: r(),
    z: 0.35 + r() * 0.65,
    size: r(),
    rot: r() * Math.PI * 2,
    vr: (r() - 0.5) * 0.6,
    phase: r() * Math.PI * 2 + i,
    px: 0,
    py: 0,
  })).slice(0, Math.max(n, 0) || MAX);
}

export function ForegroundParticles() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const mobile = useIsMobile();

  useEffect(() => {
    const canvas = ref.current;
    if (reduced || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const SCALE = 0.5;
    let w = 0;
    let h = 0;
    const resize = () => {
      w = Math.max(2, Math.round(window.innerWidth * SCALE));
      h = Math.max(2, Math.round(window.innerHeight * SCALE));
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    window.addEventListener("resize", resize);

    const parts = spawn(7, MAX);
    let era: SceneEra = sceneEraAt(scrollStore.getState().year);
    let sprite = makeSprite(PARTICLES[era]);
    let spec = PARTICLES[era];
    let alpha = 1;
    let pendingEra: SceneEra | null = null;
    const mouse = { x: -9999, y: -9999 };
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX * SCALE;
      mouse.y = e.clientY * SCALE;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let last = performance.now();
    let lastDraw = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) {
        last = now;
        return;
      }
      const quality = backgroundStore.getState().quality;
      // partikel besar bergerak lambat: 30 gambar per detik cukup di semua kualitas
      if (now - lastDraw < (quality < 1 ? 45 : 31)) return;
      lastDraw = now;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      const { year, velocity } = scrollStore.getState();
      const nextEra = sceneEraAt(year);
      if (nextEra !== era && pendingEra !== nextEra) pendingEra = nextEra;
      if (pendingEra) {
        alpha -= dt * 2.4;
        if (alpha <= 0) {
          era = pendingEra;
          pendingEra = null;
          spec = PARTICLES[era];
          sprite = makeSprite(spec);
          alpha = 0;
        }
      } else if (alpha < 1) alpha = Math.min(1, alpha + dt * 1.6);

      const count = Math.min(MAX, particleCount(quality, Boolean(mobile)));
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < count; i++) {
        const p = parts[i];
        const depth = p.z;
        // gerak sendiri (jatuh atau naik) + gerak melawan guliran, lebih cepat untuk partikel dekat
        p.y += ((spec.speed * depth * dt) / (h / SCALE)) - (velocity * 0.0009 * dt * (0.5 + depth));
        p.x += Math.sin(now / 1800 + p.phase) * (spec.sway * dt * depth) / (w / SCALE) * 0.5;
        p.rot += p.vr * dt;
        // dorongan kursor
        const sx = p.x * w + p.px;
        const sy = p.y * h + p.py;
        const dx = sx - mouse.x;
        const dy = sy - mouse.y;
        const d2 = dx * dx + dy * dy;
        const R = 90;
        if (d2 < R * R && d2 > 1) {
          const d = Math.sqrt(d2);
          const push = ((R - d) / R) * 70 * dt;
          p.px += (dx / d) * push;
          p.py += (dy / d) * push;
        }
        p.px *= 1 - Math.min(1, dt * 1.6);
        p.py *= 1 - Math.min(1, dt * 1.6);
        // bungkus layar
        if (p.y > 1.08) p.y = -0.08;
        if (p.y < -0.08) p.y = 1.08;
        if (p.x > 1.05) p.x = -0.05;
        if (p.x < -0.05) p.x = 1.05;
        const s = (spec.size[0] + (spec.size[1] - spec.size[0]) * p.size) * (0.55 + 0.7 * depth) * SCALE;
        ctx.globalAlpha = alpha * (0.35 + 0.55 * depth) * 0.9;
        ctx.save();
        ctx.translate(p.x * w + p.px, p.y * h + p.py);
        ctx.rotate(p.rot);
        ctx.drawImage(sprite, -s / 2, -s / 2, s, s);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, mobile]);

  if (reduced) return null;
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[24] h-full w-full" aria-hidden data-fg-particles />;
}
