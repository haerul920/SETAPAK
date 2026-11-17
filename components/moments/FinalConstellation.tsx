"use client";

import type { Map as MlMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { sites, sortedEvents } from "@/data";
import { localizeSite } from "@/lib/i18n";
import { imagesFor, srcFor } from "@/lib/media";
import { goToEvent } from "@/lib/navigator";
import { siteColor } from "@/lib/sites";
import { isMotionReduced } from "@/lib/store";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";

const FLY_MS = 1100;
const BOUNDS: [[number, number], [number, number]] = [
  [95, -11],
  [141, 6],
];
/** Total urutan menyala dibatasi ±2,4 detik berapa pun jumlah situsnya. */
const STAGGER_MS = Math.max(25, Math.min(170, Math.round(2400 / sites.length)));

/**
 * Konstelasi penutup: semua situs mengecil dan terbang ke titik koordinatnya di peta Nusantara
 * (MapLibre + OpenStreetMap), lalu menyala satu per satu. Klik titik untuk kembali ke kemunculan
 * terakhir situs itu di guliran.
 */
export function FinalConstellation() {
  const { t, lang } = useCopy();
  const box = useRef<HTMLDivElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [phase, setPhase] = useState<"idle" | "fly" | "done">("idle");
  const [lit, setLit] = useState(0);

  // pasang peta hanya saat penutup sudah dekat
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "1200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near || !mapEl.current || map.current) return;
    let cancelled = false;
    void import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !mapEl.current) return;
      // worker disalin ke public/vendor oleh scripts/copy-vendor.mjs
      maplibregl.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
      const m = new maplibregl.Map({
        container: mapEl.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              maxzoom: 19,
              attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm", paint: { "raster-saturation": -0.55, "raster-opacity": 0.9 } }],
        },
        bounds: BOUNDS,
        fitBoundsOptions: { padding: 24 },
        attributionControl: { compact: false },
        cooperativeGestures: true,
        dragRotate: false,
        pitchWithRotate: false,
      });
      m.scrollZoom.disable();
      m.touchZoomRotate.disableRotation();
      map.current = m;
      const project = () => setPoints(sites.map((s) => m.project([s.coords.lng, s.coords.lat])));
      const fit = () => {
        m.resize();
        m.fitBounds(BOUNDS, { padding: 24, duration: 0 });
        project();
      };
      m.on("load", () => {
        fit();
        setReady(true);
      });
      m.on("move", project);
      // ubin gagal dimuat (misal sedang offline): peta tetap tampil dengan titik situs, tanpa galat konsol
      m.on("error", () => undefined);
      const ro = new ResizeObserver(() => fit());
      ro.observe(mapEl.current);
      m.once("remove", () => ro.disconnect());
    });
    return () => {
      cancelled = true;
    };
  }, [near]);

  useEffect(
    () => () => {
      map.current?.remove();
      map.current = null;
    },
    []
  );

  // mulai terbang saat peta terlihat
  useEffect(() => {
    const el = box.current;
    if (!el || !ready || phase !== "idle") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        if (isMotionReduced()) {
          setPhase("done");
          setLit(sites.length);
          return;
        }
        requestAnimationFrame(() => setPhase("fly"));
      },
      { threshold: 0.45 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ready, phase]);

  useEffect(() => {
    if (phase !== "fly") return;
    const timers = sites.map((_, i) => window.setTimeout(() => setLit((n) => Math.max(n, i + 1)), FLY_MS + i * STAGGER_MS));
    const end = window.setTimeout(() => setPhase("done"), FLY_MS + sites.length * STAGGER_MS + 200);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(end);
    };
  }, [phase]);

  const lastEventOf = (slug: string) => [...sortedEvents].reverse().find((e) => e.siteSlug === slug);

  return (
    <div ref={box} className="relative mx-auto aspect-[16/10] w-full max-w-5xl overflow-hidden rounded-3xl border border-current/15 max-md:aspect-[4/5]" data-lenis-prevent>
      <div ref={mapEl} className="h-full w-full" role="region" aria-label={t.outro.mapLabel(sites.length)} />
      {ready &&
        sites.map((s, i) => {
          const p = points[i];
          if (!p) return null;
          const on = i < lit;
          const last = lastEventOf(s.slug);
          return (
            <button
              key={s.slug}
              type="button"
              onClick={() => last && goToEvent(last.id)}
              className={cn("group absolute z-[2] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500", on ? "opacity-100" : "opacity-0")}
              style={{ left: p.x, top: p.y }}
              aria-label={`${localizeSite(s, lang).name}: ${t.outro.backToSite}`}
              tabIndex={on ? 0 : -1}
            >
              <span className="constellation-dot block h-3.5 w-3.5 rounded-full ring-2 ring-white/80" style={{ background: siteColor(s.slug), boxShadow: `0 0 18px 6px ${siteColor(s.slug)}88` }} />
              <span className="pointer-events-none absolute left-1/2 top-full z-[3] mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-2 py-0.5 font-mono text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {localizeSite(s, lang).name.replace(/ \(.*\)$/, "")}
              </span>
            </button>
          );
        })}
      {ready && phase !== "done" && (
        <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden>
          {sites.map((s, i) => {
            const p = points[i];
            const img = imagesFor(s.slug).find((m) => m.cutout) ?? imagesFor(s.slug, ["hero", "gallery", "now"])[0];
            if (!p || !img) return null;
            const w = box.current?.clientWidth ?? 800;
            const startX = ((i + 0.5) / sites.length) * w;
            const flying = phase === "fly";
            return (
              <span
                key={s.slug}
                className="absolute left-0 top-0 block h-16 w-16 overflow-hidden rounded-xl shadow-lg ring-2"
                style={{
                  ["--tw-ring-color" as string]: siteColor(s.slug),
                  transform: flying ? `translate3d(${p.x - 32}px, ${p.y - 32}px, 0) scale(0.2)` : `translate3d(${startX - 32}px, 24px, 0) scale(1)`,
                  opacity: flying ? 0 : 1,
                  transition: `transform ${FLY_MS}ms cubic-bezier(0.5, 0, 0.2, 1) ${i * STAGGER_MS}ms, opacity 300ms ease ${FLY_MS - 250 + i * STAGGER_MS}ms`,
                  background: "rgba(0,0,0,0.35)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.cutout ?? srcFor(img, 640)} alt="" className={img.cutout ? "h-full w-full object-contain" : "h-full w-full object-cover"} />
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
