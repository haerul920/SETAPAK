"use client";

import { Shovel } from "lucide-react";
import { useRef, useState } from "react";
import { getNavLayout } from "@/lib/navigator";
import { useObjectMotion } from "@/lib/object-motion";
import { playSfx } from "@/lib/sfx";
import { isMotionReduced } from "@/lib/store";
import { useCopy } from "@/lib/useCopy";

/* ------------------------------------------------------------------ */
/* Borobudur tersusun bertahap: cutout dibagi 8 irisan horizontal       */
/* ------------------------------------------------------------------ */

const SLICES = 8;

export function RiseSlices({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative flex h-full w-full items-end justify-center">
      <span className="obj-ground absolute inset-x-[8%] bottom-0 h-4 rounded-[50%]" aria-hidden />
      <div className="relative h-full w-full">
        {Array.from({ length: SLICES }, (_, i) => {
          // i = 0 irisan paling bawah; tersusun dari kaki ke puncak
          const top = 100 - ((i + 1) / SLICES) * 100;
          const bottom = (i / SLICES) * 100;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={i === 0 ? alt : ""}
              aria-hidden={i !== 0}
              draggable={false}
              loading="lazy"
              className="fx-slice obj-cutout absolute inset-0 h-full w-full object-contain object-bottom"
              style={{ clipPath: `inset(${top}% 0 ${bottom}% 0)`, ["--i" as string]: i }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sekop: seret ke bawah untuk menggali lapisan tanah                  */
/* ------------------------------------------------------------------ */

export function DigShovel({ depth, label }: { depth: number | string; label: string }) {
  const { t, lang } = useCopy();
  const [dug, setDug] = useState(0);
  const drag = useRef<{ startY: number; start: number } | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const lastSfx = useRef(0);
  const reduced = isMotionReduced();

  const set = (v: number) => {
    const n = Math.min(1, Math.max(0, v));
    if (Math.floor(n * 5) > lastSfx.current) {
      lastSfx.current = Math.floor(n * 5);
      playSfx("shovel");
    }
    setDug(n);
  };

  const depthText =
    typeof depth === "number"
      ? `${(depth * dug).toLocaleString(lang === "id" ? "id-ID" : "en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} m`
      : dug >= 1
        ? `${depth} ${lang === "id" ? "meter" : "meters"}`
        : "…";

  return (
    <div ref={area} className="absolute inset-0 z-[3]" onClick={(e) => e.stopPropagation()}>
      {/* lapisan tanah yang menutup visual; makin digali makin tersingkap dari atas */}
      <div className="dig-soil absolute inset-0 overflow-hidden rounded-xl" style={{ clipPath: `inset(${dug * 100}% 0 0 0)` }} aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="block" style={{ height: "20%", background: ["#6b4f35", "#57402b", "#7a6044", "#4a3524", "#3d2c1e"][i] }} />
        ))}
      </div>
      <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[11px] text-[#f5ecdc]">
        {t.dig.depth}: {depthText}
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label={t.dig.label(label)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(dug * 100)}
        aria-valuetext={depthText}
        className="absolute right-2 flex h-11 w-11 cursor-grab touch-none items-center justify-center rounded-full bg-[var(--accent)] text-[#0d0b09] shadow-lg active:cursor-grabbing"
        style={{ top: `calc(${dug * 100}% * 0.82 + 4px)`, transition: reduced ? undefined : "top 80ms linear" }}
        onPointerDown={(e) => {
          e.stopPropagation();
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          drag.current = { startY: e.clientY, start: dug };
        }}
        onPointerMove={(e) => {
          if (!drag.current || !area.current) return;
          set(drag.current.start + (e.clientY - drag.current.startY) / area.current.clientHeight);
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowRight") set(dug + 0.1);
          else if (e.key === "ArrowUp" || e.key === "ArrowLeft") set(dug - 0.1);
          else if (e.key === "End") set(1);
          else if (e.key === "Home") set(0);
          else return;
          e.preventDefault();
        }}
      >
        <Shovel className="h-5 w-5" aria-hidden />
      </div>
      {dug < 0.05 && <p className="pointer-events-none absolute inset-x-2 bottom-2 text-center font-mono text-[10px] uppercase tracking-widest text-[#f5ecdc]/85">{t.dig.hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Jam dinding 16 sampai 17 Agustus 1945                               */
/* ------------------------------------------------------------------ */

function proclamationRange(): [number, number] {
  const layout = getNavLayout();
  if (!layout) return [0, 1];
  return [layout.scale.yearToY(1945.6), layout.scale.yearToY(1945.64)];
}

/**
 * Jam berdetak mulai pukul 22.00 (dari narasi data) selama bagian guliran yang diperlambat.
 * Jarum berputar kurang dari dua jam, sesuai narasi "kurang dari dua jam"; tidak ada jam akhir
 * yang dikarang.
 */
export function ProclamationClock() {
  const { t } = useCopy();
  const ref = useRef<HTMLDivElement>(null);
  const lastTick = useRef(0);
  useObjectMotion(ref, {
    y: 0,
    range: proclamationRange(),
    onProgress: (p) => {
      const step = Math.floor(p * 24);
      if (step !== lastTick.current) {
        lastTick.current = step;
        playSfx("tick");
      }
    },
  });
  return (
    <div ref={ref} className="fx-clock absolute -right-3 -top-6 z-[4] h-20 w-20 md:-right-10 md:h-24 md:w-24" aria-label={t.clock.label} role="img">
      <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-lg">
        <circle cx="50" cy="50" r="46" fill="#f3ead6" stroke="#5a3b1c" strokeWidth="4" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="50" y1="9" x2="50" y2={i % 3 === 0 ? 17 : 13} stroke="#3a2a1a" strokeWidth={i % 3 === 0 ? 3 : 1.6} transform={`rotate(${i * 30} 50 50)`} />
        ))}
        <line className="fx-hand-hour" x1="50" y1="50" x2="50" y2="28" stroke="#2a1d10" strokeWidth="4.5" strokeLinecap="round" />
        <line className="fx-hand-min" x1="50" y1="50" x2="50" y2="16" stroke="#2a1d10" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="50" cy="50" r="3.5" fill="#8a2a22" />
      </svg>
    </div>
  );
}

/** Narasi muncul seperti diketik mesin tik, terikat guliran bagian yang diperlambat. */
export function TypedNarrative({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useObjectMotion(ref, { y: 0, range: proclamationRange() });
  const chars = Array.from(text);
  return (
    <p ref={ref} className="fx-typed font-mono text-[13px] leading-relaxed" style={{ ["--n" as string]: chars.length }}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {chars.map((c, i) => (
          <span key={i} style={{ ["--i" as string]: i }}>
            {c}
          </span>
        ))}
      </span>
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Momen kecil lain di dalam kotak visual                              */
/* ------------------------------------------------------------------ */

/** Perjanjian Bungaya: gulungan terbuka dari tengah. */
export function ScrollRollers() {
  return (
    <div className="fx-layer z-[2]" aria-hidden>
      <span className="fx-roller fx-roller-l" />
      <span className="fx-roller fx-roller-r" />
    </div>
  );
}

/**
 * 14 Juni 1669: lubang di tembok dan kilatan sekali (aman fotosensitif). Kelas .is-flashed
 * dipasang EventObject saat progres melewati 0,6 untuk pertama kali.
 */
export function BlastHole() {
  return (
    <div className="fx-layer z-[2]" aria-hidden>
      <span className="fx-hole" />
      <span className="fx-flash" />
    </div>
  );
}

/** 24 Juni 1669: ombak naik menutup. */
export function FloodWaves() {
  return (
    <div className="fx-layer z-[2]" aria-hidden>
      <svg className="fx-flood" viewBox="0 0 300 220" preserveAspectRatio="none">
        <path className="fx-flood-wave" d="M0 30 Q37 18 75 30 T150 30 T225 30 T300 30 T375 30 T450 30 T525 30 T600 30 V220 H0 Z" fill="#2f7f99" fillOpacity="0.78" />
        <path className="fx-flood-wave fx-flood-wave-2" d="M0 44 Q37 34 75 44 T150 44 T225 44 T300 44 T375 44 T450 44 T525 44 T600 44 V220 H0 Z" fill="#1f5f77" fillOpacity="0.7" />
      </svg>
    </div>
  );
}

/** 2010: abu Merapi menutup Borobudur, lalu disapu bersih. */
export function AshSweep() {
  return (
    <div className="fx-layer z-[2]" aria-hidden>
      <span className="fx-ashsweep" />
      <span className="fx-broom" />
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className="fx-ash fx-ash-early" style={{ left: `${(i * 31) % 100}%`, animationDelay: `${-(i * 0.37) % 3}s` }} />
      ))}
    </div>
  );
}

/** Masjid Raya Baiturrahman 2004: tetap berdiri dengan cahaya lembut (tanpa retakan). */
export function SoftHalo() {
  return (
    <div className="fx-layer z-[1]" aria-hidden>
      <span className="fx-halo" />
    </div>
  );
}

/** Gunung siluet kecil meletus di tepi visual (lahar Merapi dan Sindoro). */
export function VolcanoMark() {
  return (
    <div className="pointer-events-none absolute -left-12 bottom-0 z-[1] h-24 w-28 md:-left-20" aria-hidden>
      <svg viewBox="0 0 120 90" className="h-full w-full">
        <path d="M0 90 L46 22 L54 18 L62 22 L120 90 Z" fill="currentColor" fillOpacity="0.28" />
        <path d="M46 22 L54 30 L62 22" fill="#d9785b" fillOpacity="0.6" />
      </svg>
      {[0, 1, 2].map((i) => (
        <span key={i} className="fx-puff" style={{ animationDelay: `${i * 1.1}s` }} />
      ))}
    </div>
  );
}
