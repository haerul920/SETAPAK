"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sites, sortedEvents } from "@/data";
import { localizeEvent, localizeSite } from "@/lib/i18n";
import type { TimelineLayout } from "@/lib/layout";
import { siteColor } from "@/lib/sites";
import { isMotionReduced, scrollStore } from "@/lib/store";
import { traces } from "@/lib/traces";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { useRange } from "./PageMoments";
import { MOMENT_EVENTS } from "./registry";

/**
 * Momen halaman v4 (docs/OBJECTS.md, momen 10, 12, dan 13): jalur pala, mini-peta rangkaian 1945,
 * dan air tsunami Aceh. Semua lapisan fixed, hanya dipasang di rentangnya, dan bergerak memakai
 * transform dan opacity. Tanpa penggambaran korban dan tanpa batas wilayah kerajaan.
 */

const eventsById = new Map(sortedEvents.map((e) => [e.id, e]));

function rangeOf(layout: TimelineLayout, ids: readonly string[], before: number, after: number): [number, number] | null {
  const ys = ids.map((id) => layout.eventY.get(id)).filter((v): v is number => typeof v === "number");
  if (!ys.length) return null;
  return [Math.min(...ys) - before, Math.max(...ys) + after];
}

/* ------------------------------------------------------------------ */
/* Tsunami Aceh 26 Desember 2004                                        */
/* ------------------------------------------------------------------ */

/**
 * Lapisan air bergerak menyapu layar dari kiri ke kanan mengikuti guliran, lalu surut. Hanya air:
 * tidak ada gambar manusia. Kapal PLTD Apung bergeser ke daratan dan Masjid Raya tetap berdiri
 * (diatur di EventObject lewat special "drift" dan "steady").
 */
export function TsunamiWater({ layout }: { layout: TimelineLayout }) {
  const { t } = useCopy();
  const r = rangeOf(layout, MOMENT_EVENTS.tsunami, 700, 220) ?? [0, 0];
  const { active, ref } = useRange(r[0], r[1], 0.25);
  if (!active) return <div ref={ref} hidden />;
  return (
    <div ref={ref} className="pointer-events-none fixed inset-0 -z-[5] overflow-hidden" aria-hidden data-moment="tsunami" style={{ opacity: 0 }} title={t.moments.tsunami}>
      <div className="tsunami-water absolute inset-y-0 left-0 w-screen">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="tsu-body" x1="0" x2="1">
              <stop offset="0" stopColor="#1f5f77" stopOpacity="0" />
              <stop offset="0.5" stopColor="#2f7f99" stopOpacity="0.42" />
              <stop offset="1" stopColor="#3f93ad" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          <path d="M0 0 H88 Q94 6 88 12 T88 24 T88 36 T88 48 T88 60 T88 72 T88 84 T88 96 L88 100 H0 Z" fill="url(#tsu-body)" />
          <path className="tsunami-foam" d="M88 0 Q94 6 88 12 T88 24 T88 36 T88 48 T88 60 T88 72 T88 84 T88 96 L88 100" fill="none" stroke="#e8f4f7" strokeOpacity="0.5" strokeWidth="0.5" />
        </svg>
      </div>
      <div className="tsunami-water tsunami-water-2 absolute inset-y-0 left-0 w-screen opacity-60">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 0 H80 Q86 8 80 16 T80 32 T80 48 T80 64 T80 80 T80 96 L80 100 H0 Z" fill="#1f5f77" fillOpacity="0.3" />
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Jalur pala 1575 sampai 1621                                         */
/* ------------------------------------------------------------------ */

const SPICE_SITES = ["benteng-oranje", "benteng-victoria", "banda-neira"] as const;
/** Bingkai peta: Maluku tengah dan utara (proyeksi ekuirektangular sederhana). */
const SPICE_LON: [number, number] = [126.5, 130.7];
const SPICE_LAT: [number, number] = [-5.4, 1.3];
const FORT_EVENT: Record<string, string> = { "benteng-victoria": "ev-victoria-1575", "benteng-oranje": "ev-oranje-1607", "banda-neira": "ev-belgica-1611" };
/** Nama benteng pada label peta kecil. */
const FORT_NAME: Record<string, string> = { "benteng-victoria": "Victoria", "benteng-oranje": "Oranje", "banda-neira": "Belgica" };

/**
 * Kapal-kapal kecil berlayar di antara Ternate, Ambon, dan Banda di atas peta laut. Benteng muncul
 * di tahunnya (Victoria 1575, Oranje 1607, Belgica 1611). Setelah peristiwa Banda 1621 kapal
 * berhenti dan meredup, tanpa adegan kekerasan.
 */
export function SpiceRoute({ layout }: { layout: TimelineLayout }) {
  const { t, lang } = useCopy();
  const r = rangeOf(layout, MOMENT_EVENTS.spice, 0, 0);
  const y0 = r ? r[0] - 300 : 0;
  const y1 = r ? r[1] : 0;
  const { active, ref } = useRange(y0, y1, 0.8);
  const box = useRef<HTMLDivElement>(null);
  const shipRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const pts = useMemo(
    () =>
      SPICE_SITES.map((slug) => {
        const s = sites.find((x) => x.slug === slug)!;
        const ev = eventsById.get(FORT_EVENT[slug])!;
        return {
          slug,
          name: FORT_NAME[slug],
          x: ((s.coords.lng - SPICE_LON[0]) / (SPICE_LON[1] - SPICE_LON[0])) * 100,
          y: ((SPICE_LAT[1] - s.coords.lat) / (SPICE_LAT[1] - SPICE_LAT[0])) * 100,
          yy: layout.eventY.get(ev.id) ?? 0,
          year: Math.floor(ev.sortKey),
        };
      }),
    [layout, lang]
  );
  const endY = layout.eventY.get("ev-banda-1621") ?? y1;

  useEffect(() => {
    if (!active) return;
    const el = box.current;
    if (!el) return;
    const dots = Array.from(el.querySelectorAll<HTMLElement>("[data-fort]"));
    let lastHush = "";
    const apply = () => {
      const { y } = scrollStore.getState();
      const w = el.clientWidth;
      const h = el.clientHeight;
      const rp = Math.min(1, Math.max(0, (y - y0) / Math.max(1, endY - y0)));
      const reduced = isMotionReduced();
      shipRefs.current.forEach((s, i) => {
        if (!s) return;
        // lintasan tertutup Ternate, Ambon, Banda, Ternate; tiga kapal berjarak sepertiga putaran
        const u = (((reduced ? 0.35 : rp * 2.4) + i / 3) % 1) * 3;
        const leg = Math.floor(u);
        const f = u - leg;
        const a = pts[leg % 3];
        const b = pts[(leg + 1) % 3];
        const x = ((a.x + (b.x - a.x) * f) / 100) * w;
        const yy = ((a.y + (b.y - a.y) * f) / 100) * h;
        s.style.transform = `translate3d(${x.toFixed(1)}px, ${yy.toFixed(1)}px, 0)`;
      });
      dots.forEach((d, i) => {
        const on = y >= pts[i].yy ? "1" : "0";
        if (d.dataset.on !== on) d.dataset.on = on;
      });
      const hush = y >= endY ? "1" : "0";
      if (hush !== lastHush) {
        lastHush = hush;
        el.dataset.hush = hush;
      }
    };
    apply();
    window.addEventListener("resize", apply);
    const unsub = scrollStore.subscribe(apply);
    return () => {
      unsub();
      window.removeEventListener("resize", apply);
    };
  }, [active, pts, y0, endY]);

  if (!active) return <div ref={ref} hidden />;
  return (
    <div ref={ref} className="pointer-events-none fixed inset-0 -z-[5] overflow-hidden" aria-hidden data-moment="spice" style={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 75% 70%, rgba(47,127,153,0.22), transparent 62%)" }} />
      <div className="absolute bottom-[8%] right-[5%] aspect-[4.2/6.6] w-[min(30vw,300px)] max-md:bottom-[3%] max-md:right-[3%] max-md:w-[34vw]">
        <p className="absolute -top-6 left-0 right-0 truncate whitespace-nowrap font-mono text-[10px] uppercase tracking-widest opacity-80 max-md:-left-24">{t.moments.spiceTitle}</p>
        <div ref={box} className="spice-box absolute inset-0 rounded-xl border border-current/15 bg-[rgba(20,60,76,0.22)]" data-hush="0">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d={`M${pts[0].x} ${pts[0].y} L${pts[1].x} ${pts[1].y} L${pts[2].x} ${pts[2].y} Z`} fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="0.6" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
          </svg>
          {pts.map((p) => (
            <span key={p.slug} data-fort data-on="0" className="spice-fort absolute" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              <span className="spice-fort-dot block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-black/40" style={{ background: siteColor(p.slug) }} />
              <span className={cn("spice-fort-label absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px]", p.x > 60 ? "right-2" : "left-2")}>
                {p.name} {p.year}
              </span>
            </span>
          ))}
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              ref={(el) => {
                shipRefs.current[i] = el;
              }}
              className="spice-ship absolute left-0 top-0 block"
            >
              <svg width="22" height="20" viewBox="0 0 22 20" className="-translate-x-1/2 -translate-y-[85%]">
                <path d="M2 14 L20 14 L17 18 L5 18 Z" fill="#2a1d10" fillOpacity="0.85" />
                <path d="M11 2 L11 14" stroke="#2a1d10" strokeWidth="1" />
                <path d="M11 3 C16 6 17 10 16 13 L11 13 Z" fill="#efe4cc" fillOpacity="0.9" />
              </svg>
            </span>
          ))}
          <p className="spice-hush absolute inset-x-0 bottom-1.5 text-center font-mono text-[10px] uppercase tracking-widest">{t.moments.spiceHush}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rangkaian 1945: mini-peta yang menyalakan lokasi satu per satu       */
/* ------------------------------------------------------------------ */

const MAP_LON: [number, number] = [94.5, 141.5];
const MAP_LAT: [number, number] = [-11.2, 6.4];

const project = (lat: number, lng: number): [number, number] => [((lng - MAP_LON[0]) / (MAP_LON[1] - MAP_LON[0])) * 100, ((MAP_LAT[1] - lat) / (MAP_LAT[1] - MAP_LAT[0])) * 56];

/**
 * Mini-peta Nusantara dari titik-titik situs kurasi dan jejak (tanpa garis pantai atau batas
 * wilayah). Tujuh lokasi peristiwa Agustus sampai Desember 1945 menyala berurutan; yang sudah
 * lewat tetap redup, yang sedang berlangsung berdenyut dan keterangannya tampil di bawah peta.
 */
export function Sequence1945Map({ layout }: { layout: TimelineLayout }) {
  const { t, lang } = useCopy();
  const r = rangeOf(layout, MOMENT_EVENTS.seq1945, 700, 900) ?? [0, 0];
  const { active, ref } = useRange(r[0], r[1], 0.5);
  const [idx, setIdx] = useState(-1);
  const dotsPath = useMemo(() => {
    const pts: [number, number][] = [...sites.map((s) => project(s.coords.lat, s.coords.lng)), ...traces.map((tr) => project(tr.lat, tr.lng))];
    return pts.map(([x, y]) => `M${x.toFixed(1)} ${y.toFixed(1)}h0.01`).join("");
  }, []);
  const stops = useMemo(
    () =>
      MOMENT_EVENTS.seq1945.map((id) => {
        const ev = eventsById.get(id)!;
        const site = sites.find((s) => s.slug === ev.siteSlug)!;
        const [x, y] = project(site.coords.lat, site.coords.lng);
        return { id, ev, site, x, y, yy: layout.eventY.get(id) ?? 0 };
      }),
    [layout]
  );

  useEffect(() => {
    if (!active) return;
    let last = -2;
    const apply = () => {
      const { y } = scrollStore.getState();
      let n = -1;
      for (let i = 0; i < stops.length; i++) if (y >= stops[i].yy - 40) n = i;
      if (n !== last) {
        last = n;
        setIdx(n);
      }
    };
    apply();
    return scrollStore.subscribe(apply);
  }, [active, stops]);

  if (!active) return <div ref={ref} hidden />;
  const cur = idx >= 0 ? stops[idx] : null;
  return (
    <div
      ref={ref}
      className="pointer-events-none fixed bottom-4 left-3 z-[8] w-[min(240px,17vw)] max-md:bottom-2 max-md:left-auto max-md:right-14 max-md:w-[26vw]"
      role="img"
      aria-label={t.moments.map1945Aria}
      data-moment="map1945"
      style={{ opacity: 0 }}
    >
      <div className="caption-plate rounded-xl border border-current/15 p-2">
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest opacity-80 max-md:hidden">{t.moments.map1945Title}</p>
        <svg viewBox="0 0 100 56" className="block w-full">
          <path d={dotsPath} stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.3" strokeLinecap="round" fill="none" />
          {stops.map((s, i) => (
            <g key={s.id} transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)})`} data-state={i === idx ? "now" : i < idx ? "past" : "off"} className="map1945-stop">
              <circle className="map1945-ring" r="3.2" fill="none" strokeWidth="0.7" style={{ stroke: siteColor(s.site.slug) }} />
              <circle className="map1945-dot" r="1.5" style={{ fill: siteColor(s.site.slug) }} />
            </g>
          ))}
        </svg>
        <p className={cn("mt-1 min-h-[2.6em] text-[11px] leading-tight max-md:sr-only", cur ? "opacity-95" : "opacity-50")} aria-live="polite">
          {cur ? (
            <>
              <span className="block font-mono text-[10px] text-[var(--accent)]">{localizeEvent(cur.ev, lang).dateLabel}</span>
              <span className="block">{localizeSite(cur.site, lang).name}</span>
            </>
          ) : (
            t.moments.map1945Wait
          )}
        </p>
      </div>
    </div>
  );
}
