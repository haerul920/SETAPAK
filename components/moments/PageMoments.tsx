"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sites, sortedEvents } from "@/data";
import { localizeSite } from "@/lib/i18n";
import type { TimelineLayout } from "@/lib/layout";
import { imagesFor, srcFor } from "@/lib/media";
import { siteColor } from "@/lib/sites";
import { isMotionReduced, scrollStore } from "@/lib/store";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { PAGE_MOMENTS } from "./registry";

/**
 * Lapisan momen di tingkat halaman (fixed, di belakang objek). Hanya dipasang saat garis acuan
 * berada di rentangnya; opacity bersilang-pudar di tepi rentang.
 */
export function useRange(y0: number, y1: number, margin = 1) {
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  useEffect(() => {
    let on = false;
    const apply = () => {
      const { y, viewport } = scrollStore.getState();
      const m = viewport * margin;
      const o = Math.min(1, Math.max(0, (y - (y0 - m)) / m), Math.max(0, (y1 + m - y) / m));
      progress.current = Math.min(1, Math.max(0, (y - y0) / Math.max(1, y1 - y0)));
      const next = o > 0.001;
      if (next !== on) {
        on = next;
        setActive(next);
      }
      if (ref.current) {
        ref.current.style.opacity = o.toFixed(3);
        ref.current.style.setProperty("--rp", progress.current.toFixed(4));
      }
    };
    apply();
    return scrollStore.subscribe(apply);
  }, [y0, y1, margin]);
  return { active, ref, progress };
}

/* ------------------------------------------------------------------ */
/* Gua Maros: dinding gelap dan senter mengikuti kursor atau jari       */
/* ------------------------------------------------------------------ */

export function CaveTorchLayer({ layout }: { layout: TimelineLayout }) {
  const { t } = useCopy();
  const y0 = layout.scale.yearToY(PAGE_MOMENTS.cave.from);
  const y1 = layout.scale.yearToY(PAGE_MOMENTS.cave.to);
  const { active, ref } = useRange(y0, y1, 0.8);
  const torch = useRef<HTMLDivElement>(null);
  const textures = imagesFor("karst-maros-pangkep", ["texture"]);

  useEffect(() => {
    if (!active) return;
    let x = window.innerWidth / 2;
    let yy = window.innerHeight / 2;
    let tx = x;
    let ty = yy;
    let last = performance.now();
    let raf = 0;
    const move = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      last = performance.now();
    };
    const loop = (now: number) => {
      // tanpa masukan selama 3 detik: senter berkelana pelan agar layar tidak gelap total (sentuh)
      if (now - last > 3000 && !isMotionReduced()) {
        tx = window.innerWidth * (0.5 + 0.32 * Math.sin(now / 2600));
        ty = window.innerHeight * (0.55 + 0.2 * Math.cos(now / 3300));
      }
      x += (tx - x) * 0.18;
      yy += (ty - yy) * 0.18;
      if (torch.current) torch.current.style.transform = `translate3d(${x}px, ${yy}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", move, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", move);
      cancelAnimationFrame(raf);
    };
  }, [active]);

  if (!active) return <div ref={ref} hidden />;
  return (
    <div ref={ref} className="pointer-events-none fixed inset-0 -z-[5] overflow-hidden" aria-hidden style={{ opacity: 0 }}>
      {/* dinding: foto cap tangan Pettakere (berlisensi terbuka) dan cap tangan rekonstruksi artistik */}
      <div className="absolute inset-0 grid grid-cols-3">
        {textures.map((m) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={m.id} src={srcFor(m, 1280)} alt="" className="h-full w-full object-cover opacity-80" />
        ))}
      </div>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
        {[
          [120, 140, -18],
          [820, 120, 12],
          [700, 430, -8],
          [240, 460, 20],
          [500, 90, 4],
        ].map(([x, y, r], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${r})`} opacity="0.55">
            <ellipse cx="0" cy="0" rx="46" ry="58" fill="#a8432a" opacity="0.35" />
            <path d="M-12 30 L-14 -4 L-22 -30 M-6 30 L-6 -38 M2 30 L4 -40 M10 30 L14 -34 M16 32 L30 6" stroke="#2a1510" strokeWidth="9" strokeLinecap="round" />
          </g>
        ))}
        <g transform="translate(560 300)" opacity="0.5">
          <path d="M-70 10 C-60 -20 -10 -28 30 -18 C50 -14 66 -4 72 8 L64 10 L60 30 M40 14 L38 32 M-40 14 L-44 34 M-60 10 L-66 30" stroke="#a8432a" strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>
        <text x="990" y="590" textAnchor="end" fontSize="11" fontFamily="monospace" fill="#d9c7a7" opacity="0.7">
          {t.media.reconstruction}
        </text>
      </svg>
      {/* gelap dengan lubang cahaya; hanya translate yang berubah */}
      <div
        ref={torch}
        data-torch
        className="absolute left-0 top-0 h-[300vmax] w-[300vmax]"
        style={{ background: "radial-gradient(circle at center, transparent 0, rgba(255,214,150,0.06) 9vmax, rgba(6,4,3,0.95) 17vmax)" }}
      />
    </div>
  );
}

/** Petunjuk obor: lapisan sendiri di atas objek supaya tidak tertutup kartu peristiwa yang masuk layar. */
export function CaveHint({ layout }: { layout: TimelineLayout }) {
  const { t } = useCopy();
  const y0 = layout.scale.yearToY(PAGE_MOMENTS.cave.from);
  const y1 = layout.scale.yearToY(PAGE_MOMENTS.cave.to);
  const { active, ref } = useRange(y0, y1, 0.8);
  if (!active) return <div ref={ref} hidden />;
  return (
    <p ref={ref as unknown as React.RefObject<HTMLParagraphElement>} className="pointer-events-none fixed bottom-16 left-1/2 z-[33] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full bg-black/80 px-4 py-1.5 text-center font-mono text-[10px] uppercase tracking-widest text-[#f5ecdc] md:text-[11px]" style={{ opacity: 0 }}>
      {t.cave.torch}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Perang Makassar 1666 sampai 1669: kapal-kapal kecil melintas         */
/* ------------------------------------------------------------------ */

export function SiegeShips({ layout }: { layout: TimelineLayout }) {
  const war = sortedEvents.find((e) => e.id === "ev-perang-makassar");
  const y0 = war ? layout.scale.yearToY(war.sortKey) : 0;
  const y1 = war?.endKey ? layout.scale.yearToY(war.endKey) : y0;
  const { active, ref } = useRange(y0, y1, 0.6);
  if (!war || !active) return <div ref={ref} hidden />;
  return (
    <div ref={ref} className="pointer-events-none fixed inset-0 -z-[5] overflow-hidden" aria-hidden style={{ opacity: 0 }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="siege-ship absolute" style={{ top: `${58 + i * 9}%`, ["--lane" as string]: i }}>
          <svg width={70 - i * 8} height={56 - i * 6} viewBox="0 0 70 56" className="ambient-bob">
            <path d="M6 42 L64 42 L56 52 L14 52 Z" fill="#3a2a1c" fillOpacity="0.8" />
            <path d="M24 6 L24 41 M42 10 L42 41" stroke="#3a2a1c" strokeWidth="2" />
            <path d="M25 8 C36 16 37 28 35 38 L25 38 Z M43 12 C52 20 53 30 51 38 L43 38 Z" fill="#efe4cc" fillOpacity="0.75" />
          </svg>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Jejak penemuan 1811 sampai 1820: garis tinta antarsitus              */
/* ------------------------------------------------------------------ */

const ROUTE = ["ev-prambanan-1811", "ev-borobudur-1814", "ev-trowulan-1815", "ev-muarajambi-crooke"];
// bingkai proyeksi ekuirektangular sederhana untuk Jawa dan Sumatra bagian selatan
const LON: [number, number] = [101.5, 113.5];
const LAT: [number, number] = [-9, -0.5];

export function DiscoveryRoute({ layout }: { layout: TimelineLayout }) {
  const { t, lang } = useCopy();
  const y0 = layout.scale.yearToY(PAGE_MOMENTS.discovery.from);
  const y1 = layout.scale.yearToY(PAGE_MOMENTS.discovery.to);
  const { active, ref } = useRange(y0, y1, 0.8);
  const segRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const map = imagesFor("global", ["then"])[0];

  const points = useMemo(
    () =>
      ROUTE.map((id) => {
        const ev = sortedEvents.find((e) => e.id === id)!;
        const site = sites.find((s) => s.slug === ev.siteSlug)!;
        return {
          ev,
          site,
          x: ((site.coords.lng - LON[0]) / (LON[1] - LON[0])) * 100,
          y: ((LAT[1] - site.coords.lat) / (LAT[1] - LAT[0])) * 100,
          yy: layout.scale.yearToY(ev.sortKey),
        };
      }),
    [layout]
  );

  useEffect(() => {
    if (!active) return;
    const apply = () => {
      const { y } = scrollStore.getState();
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const tt = Math.min(1, Math.max(0, (y - a.yy) / Math.max(1, b.yy - a.yy)));
        const el = segRefs.current[i];
        if (el) el.style.transform = `rotate(var(--ang)) scaleX(${isMotionReduced() ? 1 : tt.toFixed(3)})`;
      }
    };
    apply();
    return scrollStore.subscribe(apply);
  }, [active, points]);

  if (!active) return <div ref={ref} hidden />;
  return (
    <div ref={ref} className="pointer-events-none fixed inset-0 -z-[5] overflow-hidden" aria-hidden style={{ opacity: 0 }}>
      {map && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={srcFor(map, 1920)} alt="" className="absolute inset-x-0 top-1/2 w-full -translate-y-1/2 object-contain opacity-[0.14] sepia" />
      )}
      <div className="absolute bottom-[10%] right-[6%] aspect-[12/8.5] w-[min(46vw,560px)] max-md:bottom-[4%] max-md:right-[4%] max-md:w-[70vw]">
        <p className="absolute -top-6 left-0 font-mono text-[10px] uppercase tracking-widest opacity-80">{t.route.title}</p>
        {points.slice(1).map((b, idx) => {
          const a = points[idx];
          return (
            <span
              key={b.ev.id}
              ref={(el) => {
                segRefs.current[idx + 1] = el;
              }}
              className="absolute h-[2px] origin-left rounded-full"
              style={{
                left: `${a.x}%`,
                top: `${a.y}%`,
                width: `calc(${Math.hypot(b.x - a.x, (b.y - a.y) * (8.5 / 12))}% )`,
                background: "repeating-linear-gradient(90deg, #2a1d10 0 6px, transparent 6px 10px)",
                ["--ang" as string]: `${Math.atan2((b.y - a.y) * 8.5, (b.x - a.x) * 12)}rad`,
                transform: "rotate(var(--ang)) scaleX(0)",
              }}
            />
          );
        })}
        {points.map((p, i) => (
          <span
            key={p.ev.id}
            className={cn("absolute flex -translate-y-1/2 items-center gap-1", i === 1 ? "-translate-x-full flex-row-reverse" : "")}
            style={{ left: `calc(${p.x}% + ${i === 1 ? 5 : -5}px)`, top: `${p.y}%` }}
          >
            <span className="h-2.5 w-2.5 rounded-full ring-2 ring-black/40" style={{ background: siteColor(p.site.slug) }} />
            <span className="whitespace-nowrap font-mono text-[10px]">
              {localizeSite(p.site, lang).name.replace(/^(Candi|Situs|Kawasan Cagar Budaya Nasional) /, "")} {Math.floor(p.ev.sortKey)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
