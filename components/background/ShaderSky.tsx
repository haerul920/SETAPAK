"use client";

import { useEffect, useMemo, useRef } from "react";
import { atmosphereStore } from "@/components/atmosphere/Background";
import { sortedEvents } from "@/data";
import { hexToOklch, hexToRgb, mixOklch, oklchToHex } from "@/lib/atmosphere";
import { createSky, fxAt, fxWindows, shaderScale } from "@/lib/background";
import type { TimelineLayout } from "@/lib/layout";
import { scrollStore, useReducedMotion } from "@/lib/store";
import { backgroundStore, useSkyStatus } from "./backgroundStore";
import { FRAGMENT, VERTEX } from "./shaders";

/** Gradien cadangan bertekstur noise statis (SVG feTurbulence sebagai data-URI), tanpa WebGL. */
const NOISE_URI =
  "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * Lapisan 1: langit berbasis shader di satu kanvas layar penuh, dirender pada 0,5x resolusi lalu
 * diperbesar CSS. Jeda saat tab tersembunyi. Bila WebGL tidak tersedia atau mode tanpa animasi
 * aktif, yang tampil adalah gradien Background dengan lapisan noise statis.
 */
export function ShaderSky({ layout }: { layout: TimelineLayout }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const status = useSkyStatus();
  const sky = useMemo(() => createSky(layout.scale), [layout]);
  const windows = useMemo(() => fxWindows(sortedEvents, layout.eventY, 500), [layout]);

  useEffect(() => {
    const el = canvas.current;
    if (reduced || !el) {
      backgroundStore.setState({ sky: "fallback" });
      return;
    }
    let disposed = false;
    let raf = 0;
    let cleanup: (() => void) | null = null;

    (async () => {
      let ogl: typeof import("ogl");
      try {
        ogl = await import("ogl");
      } catch {
        backgroundStore.setState({ sky: "fallback" });
        return;
      }
      if (disposed) return;
      let renderer: InstanceType<typeof ogl.Renderer>;
      try {
        renderer = new ogl.Renderer({ canvas: el, dpr: 1, alpha: false, antialias: false, depth: false, powerPreference: "low-power" });
      } catch {
        backgroundStore.setState({ sky: "fallback" });
        return;
      }
      const gl = renderer.gl;
      if (!gl) {
        backgroundStore.setState({ sky: "fallback" });
        return;
      }
      const program = new ogl.Program(gl, {
        vertex: VERTEX,
        fragment: FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uRes: { value: [2, 2] },
          uMouse: { value: [0.5, 0.5] },
          uVel: { value: 0 },
          uTop: { value: [0, 0, 0] },
          uMid: { value: [0, 0, 0] },
          uBottom: { value: [0, 0, 0] },
          uLight: { value: [1, 1, 1] },
          uFog: { value: 0.5 },
          uRays: { value: 0 },
          uCaustic: { value: 0 },
          uEmber: { value: 0 },
          uQuality: { value: 1 },
        },
      });
      const mesh = new ogl.Mesh(gl, { geometry: new ogl.Triangle(gl), program });
      backgroundStore.setState({ sky: "webgl" });
      document.documentElement.dataset.sky = "webgl";

      const resize = () => {
        const s = shaderScale(backgroundStore.getState().quality);
        renderer.setSize(Math.max(2, Math.round(window.innerWidth * s)), Math.max(2, Math.round(window.innerHeight * s)));
        el.style.width = "100%";
        el.style.height = "100%";
        program.uniforms.uRes.value = [renderer.width, renderer.height];
      };
      resize();
      window.addEventListener("resize", resize);
      const unsubQuality = backgroundStore.subscribe((s, prev) => {
        if (s.quality !== prev.quality) resize();
      });

      const mouse = { tx: 0.5, ty: 0.5, x: 0.5, y: 0.5 };
      const onPointer = (e: PointerEvent) => {
        mouse.tx = e.clientX / window.innerWidth;
        mouse.ty = 1 - e.clientY / window.innerHeight;
      };
      window.addEventListener("pointermove", onPointer, { passive: true });

      const onLost = (e: Event) => {
        e.preventDefault();
        cancelAnimationFrame(raf);
        backgroundStore.setState({ sky: "fallback" });
        delete document.documentElement.dataset.sky;
      };
      el.addEventListener("webglcontextlost", onLost);

      let lastHex = "";
      let top: [number, number, number] = [0, 0, 0];
      let mid: [number, number, number] = [0, 0, 0];
      let bottom: [number, number, number] = [0, 0, 0];
      let lastFrame = 0;
      let lastFx = 0;
      let emaMs = 0;
      const t0 = performance.now();

      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);
        if (document.hidden) return;
        const quality = backgroundStore.getState().quality;
        // pada kualitas hemat, render 30 kali per detik
        if (quality < 2 && now - lastFrame < 30) return;
        lastFrame = now;
        const { y, velocity } = scrollStore.getState();
        const atm = atmosphereStore.getState();
        const hex = atm.top + atm.bottom;
        if (hex !== lastHex) {
          lastHex = hex;
          top = hexToRgb(atm.top);
          bottom = hexToRgb(atm.bottom);
          mid = hexToRgb(oklchToHex(mixOklch(hexToOklch(atm.top), hexToOklch(atm.bottom), 0.5)));
        }
        const sp = sky(y);
        const ember = fxAt(windows, y, 900);
        if (Math.abs(ember - lastFx) > 0.02) {
          lastFx = ember;
          backgroundStore.setState({ eventFx: ember });
        }
        mouse.x += (mouse.tx - mouse.x) * 0.04;
        mouse.y += (mouse.ty - mouse.y) * 0.04;
        const u = program.uniforms;
        u.uTime.value = (now - t0) / 1000;
        u.uMouse.value = [mouse.x, mouse.y];
        u.uVel.value = Math.min(1, Math.abs(velocity) / 4000);
        u.uTop.value = top;
        u.uMid.value = mid;
        u.uBottom.value = bottom;
        u.uLight.value = sp.light;
        u.uFog.value = sp.fog;
        u.uRays.value = sp.rays;
        u.uCaustic.value = sp.caustics;
        u.uEmber.value = ember;
        u.uQuality.value = quality >= 2 ? 1 : 0;
        const s0 = performance.now();
        renderer.render({ scene: mesh });
        emaMs = emaMs * 0.92 + (performance.now() - s0) * 0.08;
        if (Math.abs(emaMs - backgroundStore.getState().skyMs) > 0.05) backgroundStore.setState({ skyMs: emaMs });
      };
      raf = requestAnimationFrame(tick);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onPointer);
        el.removeEventListener("webglcontextlost", onLost);
        unsubQuality();
        delete document.documentElement.dataset.sky;
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      };
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, [reduced, sky, windows]);

  return (
    <>
      {!reduced && <canvas ref={canvas} className="pointer-events-none fixed inset-0 -z-[19] h-full w-full" aria-hidden data-sky-canvas />}
      {(reduced || status === "fallback") && <div className="pointer-events-none fixed inset-0 -z-[19] opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: NOISE_URI }} aria-hidden data-sky-fallback />}
    </>
  );
}
