"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { TimelineLayout } from "@/lib/layout";
import { isMotionReduced, scrollStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Lapisan suasana dekoratif per rentang (docs/ATMOSPHERE.md), tanpa klaim fakta.
 * Bersilang-pudar di perbatasan rentang (opacity per frame), hanya lapisan yang terlihat yang
 * dipasang, dan gerak memakai transform/opacity saja. Beberapa objek bisa diklik untuk efek kecil.
 */

type LayerId = "strata" | "cave" | "forest" | "brick" | "sea" | "paper" | "lamp" | "morning";

const RANGES: { id: LayerId; from: number; to: number }[] = [
  { id: "strata", from: -Infinity, to: -60_000 },
  { id: "cave", from: -60_000, to: -5_000 },
  { id: "forest", from: -5_000, to: 1250 },
  { id: "brick", from: 1250, to: 1500 },
  { id: "sea", from: 1500, to: 1730 },
  { id: "paper", from: 1730, to: 1945 },
  { id: "lamp", from: 1945, to: 1960 },
  { id: "morning", from: 1960, to: Infinity },
];

/** Bilangan semu-acak deterministik agar posisi partikel stabil. */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function AmbientLayers({ layout }: { layout: TimelineLayout }) {
  const spans = useMemo(
    () =>
      RANGES.map((r) => ({
        id: r.id,
        y0: r.from === -Infinity ? -1e9 : layout.scale.yearToY(r.from),
        y1: r.to === Infinity ? 1e9 : layout.scale.yearToY(r.to),
      })),
    [layout]
  );
  const [active, setActive] = useState<LayerId[]>(["strata"]);
  const refs = useRef<Partial<Record<LayerId, HTMLDivElement | null>>>({});

  useEffect(() => {
    let last = "";
    const apply = () => {
      const { y, viewport } = scrollStore.getState();
      const fade = viewport * 1.4;
      const on: LayerId[] = [];
      const reduced = isMotionReduced();
      for (const s of spans) {
        // naik dari 0 ke 1 sepanjang `fade` sebelum awal rentang, turun lagi sepanjang `fade` setelah akhir
        const inF = Math.min(1, Math.max(0, (y - (s.y0 - fade)) / fade));
        const outF = Math.min(1, Math.max(0, (s.y1 + fade - y) / fade));
        const o = Math.min(inF, outF);
        if (o > 0.001) on.push(s.id);
        const el = refs.current[s.id];
        if (el) {
          el.style.opacity = o.toFixed(3);
          if (!reduced && o > 0.001) {
            // parallax: transform langsung ke elemen berkedalaman (tanpa variabel CSS turunan)
            const base = -(y * 0.12) % 2400;
            el.querySelectorAll<HTMLElement>("[data-depth]").forEach((d) => {
              d.style.transform = `translate3d(0, ${(base * Number(d.dataset.depth)).toFixed(1)}px, 0)`;
            });
          }
        }
      }
      const key = on.join(",");
      if (key !== last) {
        last = key;
        setActive(on);
      }
    };
    apply();
    return scrollStore.subscribe(apply);
  }, [spans]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {active.map((id) => (
        <div
          key={id}
          ref={(el) => {
            refs.current[id] = el;
          }}
          className="absolute inset-0"
          style={{ opacity: 0 }}
        >
          {LAYERS[id]()}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lapisan                                                             */
/* ------------------------------------------------------------------ */

const LAYERS: Record<LayerId, () => React.ReactNode> = {
  strata: () => <Strata />,
  cave: () => <Cave />,
  forest: () => <Forest />,
  brick: () => <Brick />,
  sea: () => <Sea />,
  paper: () => <Paper />,
  lamp: () => <Lamp />,
  morning: () => <Morning />,
};

/** Parallax: elemen ber-data-depth digeser per frame oleh AmbientLayers sesuai kedalamannya. */
function parallax(depth: number): { "data-depth": number; style: CSSProperties } {
  return { "data-depth": depth, style: { willChange: "transform" } };
}

function Particles({ n, seed, className, color, size = [1.5, 3.5], drift = "ambient-drift" }: { n: number; seed: number; className?: string; color: string; size?: [number, number]; drift?: string }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const s = size[0] + rand(seed + i) * (size[1] - size[0]);
        return (
          <span
            key={i}
            className={cn("absolute rounded-full", drift, className)}
            style={{
              left: `${rand(seed + i * 3) * 100}%`,
              top: `${rand(seed + i * 7) * 100}%`,
              width: s,
              height: s,
              background: color,
              animationDelay: `${-rand(seed + i * 11) * 20}s`,
              animationDuration: `${14 + rand(seed + i * 5) * 16}s`,
            }}
          />
        );
      })}
    </>
  );
}

function Strata() {
  return (
    <>
      <div className="absolute inset-x-0 -top-[2400px] h-[calc(100%+4800px)]" {...parallax(1)}>
        <svg className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <pattern id="strata-p" width="1200" height="260" patternUnits="userSpaceOnUse">
              <path d="M0 40 Q300 20 600 46 T1200 38" fill="none" stroke="#c9a26b" strokeOpacity="0.10" strokeWidth="1.5" />
              <path d="M0 110 Q250 130 620 104 T1200 116" fill="none" stroke="#8a6b45" strokeOpacity="0.12" strokeWidth="10" />
              <path d="M0 170 Q400 150 760 176 T1200 166" fill="none" stroke="#c9a26b" strokeOpacity="0.07" strokeWidth="1" />
              <path d="M0 225 Q350 240 700 220 T1200 230" fill="none" stroke="#5c4630" strokeOpacity="0.16" strokeWidth="18" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#strata-p)" />
        </svg>
      </div>
      <Particles n={26} seed={3} color="rgba(217,199,167,0.35)" />
    </>
  );
}

function Drip({ left, delay }: { left: string; delay: number }) {
  return (
    <span className="ambient-drip absolute top-0 h-3 w-[3px] rounded-full bg-[#9fb6c2]/50" style={{ left, animationDelay: `${delay}s` }} />
  );
}

function Cave() {
  return (
    <>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.55) 100%)" }} />
      <div className="absolute inset-x-0 -top-[2400px] h-[calc(100%+4800px)] opacity-[0.07]" {...parallax(0.6)}>
        <svg className="h-full w-full">
          <filter id="cave-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="3" seed="7" />
            <feColorMatrix values="0 0 0 0 0.85  0 0 0 0 0.55  0 0 0 0 0.35  0 0 0 0.9 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#cave-noise)" />
        </svg>
      </div>
      <Drip left="18%" delay={0} />
      <Drip left="63%" delay={2.7} />
      <Drip left="81%" delay={5.1} />
      <Drip left="39%" delay={7.4} />
    </>
  );
}

function Leaf({ i }: { i: number }) {
  const [spin, setSpin] = useState(0);
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={() => setSpin((s) => s + 1)}
      className="ambient-fall pointer-events-auto absolute top-0 cursor-pointer p-2"
      style={{ left: `${8 + rand(40 + i) * 84}%`, animationDelay: `${-rand(90 + i) * 26}s`, animationDuration: `${22 + rand(i) * 14}s` }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 20 20"
        className="transition-transform duration-700 ease-out"
        style={{ transform: `rotate(${spin * 540}deg) scale(${spin ? 1.2 : 1})` }}
      >
        <path d="M10 1 C16 5 17 13 10 19 C3 13 4 5 10 1 Z" fill="#6f8f4a" fillOpacity="0.55" />
        <path d="M10 3 L10 18" stroke="#c9d6a0" strokeOpacity="0.4" strokeWidth="0.8" />
      </svg>
    </button>
  );
}

function Firefly({ i }: { i: number }) {
  const [burst, setBurst] = useState(false);
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={() => {
        setBurst(true);
        window.setTimeout(() => setBurst(false), 900);
      }}
      className="ambient-drift pointer-events-auto absolute cursor-pointer p-3"
      style={{ left: `${rand(200 + i) * 100}%`, top: `${30 + rand(300 + i) * 65}%`, animationDelay: `${-rand(i * 7) * 20}s`, animationDuration: `${18 + rand(i * 3) * 12}s` }}
    >
      <span
        className="ambient-blink block h-1.5 w-1.5 rounded-full bg-[#f3e27a] transition-transform duration-700"
        style={{ boxShadow: "0 0 10px 3px rgba(243,226,122,0.55)", transform: burst ? "scale(3.5)" : "scale(1)", animationDelay: `${-rand(i) * 4}s` }}
      />
    </button>
  );
}

function Forest() {
  return (
    <>
      <div className="ambient-mist absolute -left-1/4 bottom-[18%] h-40 w-[150%]" style={{ background: "radial-gradient(closest-side, rgba(207,216,196,0.06), transparent)" }} />
      <div className="ambient-mist absolute -left-1/4 bottom-[45%] h-28 w-[150%]" style={{ animationDelay: "-14s", background: "radial-gradient(closest-side, rgba(207,216,196,0.05), transparent)" }} />
      {Array.from({ length: 6 }, (_, i) => (
        <Leaf key={i} i={i} />
      ))}
      {Array.from({ length: 10 }, (_, i) => (
        <Firefly key={i} i={i} />
      ))}
    </>
  );
}

function Brick() {
  return (
    <>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 85% 10%, rgba(240,150,80,0.14), transparent 60%)" }} />
      <Particles n={34} seed={51} color="rgba(208,116,60,0.45)" size={[1, 2.5]} />
    </>
  );
}

function Boat() {
  const [bob, setBob] = useState(false);
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={() => {
        setBob(true);
        window.setTimeout(() => setBob(false), 1200);
      }}
      className="ambient-sail pointer-events-auto absolute bottom-[70px] cursor-pointer p-2"
    >
      <svg width="54" height="44" viewBox="0 0 54 44" className={cn("transition-transform duration-500", bob && "-translate-y-3 rotate-6")}>
        <path d="M8 34 L46 34 L40 41 L14 41 Z" fill="#cfe3ea" fillOpacity="0.45" />
        <path d="M27 4 L27 33" stroke="#cfe3ea" strokeOpacity="0.5" strokeWidth="1.5" />
        <path d="M28 6 C40 14 42 24 40 31 L28 31 Z" fill="#e8f2f5" fillOpacity="0.4" />
        <path d="M26 10 C18 18 16 25 18 31 L26 31 Z" fill="#e8f2f5" fillOpacity="0.28" />
      </svg>
    </button>
  );
}

function Sea() {
  return (
    <>
      <div className="absolute inset-x-0 bottom-0 h-40">
        {[0, 1, 2].map((i) => (
          <svg key={i} className="ambient-wave absolute bottom-0 left-0 h-full w-[200%]" style={{ bottom: i * 18, animationDuration: `${16 + i * 7}s`, opacity: 0.22 - i * 0.05 }} viewBox="0 0 1600 100" preserveAspectRatio="none">
            <path d="M0 60 Q100 40 200 60 T400 60 T600 60 T800 60 T1000 60 T1200 60 T1400 60 T1600 60 V100 H0 Z" fill="#4fa3b8" />
          </svg>
        ))}
      </div>
      <Boat />
    </>
  );
}

function Paper() {
  return (
    <>
      <div className="absolute inset-x-0 -top-[2400px] h-[calc(100%+4800px)]" {...parallax(0.8)}>
        <svg className="h-full w-full opacity-[0.10]">
          <defs>
            <pattern id="map-grid" width="180" height="180" patternUnits="userSpaceOnUse">
              <path d="M0 0 H180 M0 0 V180" stroke="#d9c7a7" strokeWidth="0.8" strokeDasharray="2 6" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#map-grid)" />
        </svg>
      </div>
      <svg className="absolute left-[6%] top-[22%] h-40 w-40 opacity-[0.08]" viewBox="0 0 100 100">
        <path d="M50 8 C72 10 92 30 86 52 C80 76 60 94 38 86 C18 80 6 58 14 36 C20 20 34 7 50 8 Z" fill="#1a120a" />
      </svg>
      <svg className="absolute bottom-[14%] right-[10%] h-24 w-24 opacity-[0.07]" viewBox="0 0 100 100">
        <path d="M30 20 C55 5 90 25 80 55 C72 80 40 92 22 70 C8 52 12 32 30 20 Z" fill="#1a120a" />
      </svg>
      <div
        className="absolute inset-x-0 top-0 h-6 opacity-[0.12]"
        style={{ background: "#e9dcc3", clipPath: "polygon(0 0,100% 0,100% 40%,92% 70%,85% 45%,76% 80%,66% 50%,55% 85%,44% 55%,33% 75%,22% 45%,12% 80%,0 50%)" }}
      />
    </>
  );
}

function Lamp() {
  return (
    <>
      <div className="ambient-glow absolute right-[12%] top-[8%] h-[60vh] w-[60vh] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,214,120,0.18), transparent 65%)" }} />
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className="ambient-float absolute h-3 w-2.5 bg-[#f1e7d3]/25"
          style={{ left: `${rand(500 + i) * 100}%`, top: `${rand(600 + i) * 100}%`, animationDelay: `${-rand(i) * 18}s`, animationDuration: `${20 + rand(i * 2) * 12}s` }}
        />
      ))}
    </>
  );
}

function Bird({ i }: { i: number }) {
  const [flee, setFlee] = useState(false);
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={() => setFlee(true)}
      onAnimationEnd={() => setFlee(false)}
      className={cn("ambient-fly pointer-events-auto absolute cursor-pointer p-2", flee && "ambient-flee")}
      style={{ top: `${10 + rand(700 + i) * 30}%`, animationDelay: flee ? "0s" : `${-rand(800 + i) * 40}s`, animationDuration: flee ? "1.2s" : `${34 + rand(i) * 20}s` }}
    >
      <svg width="22" height="12" viewBox="0 0 22 12" className="ambient-flap">
        <path d="M1 8 Q6 1 11 7 Q16 1 21 8" fill="none" stroke="#3a4650" strokeOpacity="0.6" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function Morning() {
  return (
    <>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 20% 0%, rgba(255,236,200,0.35), transparent 55%)" }} />
      {[0, 1, 2].map((i) => (
        <svg key={i} className="ambient-cloud absolute h-24 w-72" style={{ top: `${8 + i * 17}%`, animationDelay: `${-i * 30}s`, animationDuration: `${80 + i * 25}s`, opacity: 0.5 - i * 0.1 }} viewBox="0 0 300 100">
          <ellipse cx="90" cy="60" rx="70" ry="26" fill="#ffffff" />
          <ellipse cx="150" cy="48" rx="60" ry="32" fill="#ffffff" />
          <ellipse cx="210" cy="62" rx="64" ry="24" fill="#ffffff" />
        </svg>
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <Bird key={i} i={i} />
      ))}
    </>
  );
}
