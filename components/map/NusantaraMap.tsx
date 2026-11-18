"use client";

import type { Map as MlMap } from "maplibre-gl";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Supercluster from "supercluster";
import { sites } from "@/data";
import { localizeSite } from "@/lib/i18n";
import { NUSANTARA_BOUNDS, osmStyle } from "@/lib/map-style";
import type { PinState } from "@/lib/peta-data";
import { type FlyTarget, usePetaPrefs, usePetaStore } from "@/lib/peta-store";
import { isMotionReduced, useSetapakStore } from "@/lib/store";
import { traces } from "@/lib/traces";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { PinGlyph } from "./pins";

export { NUSANTARA_BOUNDS };

type Ml = typeof import("maplibre-gl");

const ROUTE_SITES = ["prambanan", "borobudur", "trowulan", "muarajambi"];

interface MapProps {
  pins: PinState[];
  toYear: number;
  /** situs yang peristiwanya baru saja terjadi (denyut sekali) */
  pulse: ReadonlySet<string>;
  glow: { lat: number; lng: number; name: string } | null;
  onReady: (map: MlMap) => void;
}

/** Penanda HTML yang isinya dirender React lewat portal. */
function MarkerPortal({ ml, map, lng, lat, children, z = 1 }: { ml: Ml; map: MlMap; lng: number; lat: number; children: ReactNode; z?: number }) {
  const el = useMemo(() => {
    const d = document.createElement("div");
    d.style.zIndex = String(z);
    return d;
  }, [z]);
  useEffect(() => {
    const marker = new ml.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]).addTo(map);
    return () => {
      marker.remove();
    };
  }, [ml, map, el, lng, lat]);
  return createPortal(children, el);
}

export function NusantaraMap({ pins, toYear, pulse, glow, onReady }: MapProps) {
  const { t, lang } = useCopy();
  const box = useRef<HTMLDivElement>(null);
  const [ml, setMl] = useState<Ml | null>(null);
  const [map, setMap] = useState<MlMap | null>(null);
  const [zoom, setZoom] = useState(3.6);
  const [bbox, setBbox] = useState<[number, number, number, number]>([NUSANTARA_BOUNDS[0][0], NUSANTARA_BOUNDS[0][1], NUSANTARA_BOUNDS[1][0], NUSANTARA_BOUNDS[1][1]]);
  const layers = usePetaStore((s) => s.layers);
  const selected = usePetaStore((s) => s.site);
  const hoverSite = usePetaStore((s) => s.hoverSite);
  const select = usePetaStore((s) => s.select);
  const setView = usePetaStore((s) => s.setView);
  const fly = usePetaStore((s) => s.fly);
  const cvd = usePetaPrefs((s) => s.colorblind);
  const openTrace = useSetapakStore((s) => s.openTrace);
  const initialView = useRef(usePetaStore.getState().view);
  const lastFly = useRef<FlyTarget | null>(null);

  // peta dipasang sekali
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let cancelled = false;
    let created: MlMap | null = null;
    void import("maplibre-gl").then((mod) => {
      if (cancelled || !box.current) return;
      const maplibregl: Ml = mod;
      // worker disalin ke public/vendor oleh scripts/copy-vendor.mjs
      maplibregl.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
      const v = initialView.current;
      const m = new maplibregl.Map({
        container: box.current,
        style: osmStyle(),
        ...(v ? { center: [v.lng, v.lat] as [number, number], zoom: v.zoom } : { bounds: NUSANTARA_BOUNDS, fitBoundsOptions: { padding: 24 } }),
        minZoom: 2.2,
        maxZoom: 16,
        attributionControl: { compact: false },
        dragRotate: false,
        pitchWithRotate: false,
        // dibutuhkan untuk menyimpan peta sebagai gambar
        canvasContextAttributes: { preserveDrawingBuffer: true },
      });
      m.touchZoomRotate.disableRotation();
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      m.addControl(new maplibregl.FullscreenControl(), "top-right");
      created = m;
      const sync = () => {
        const b = m.getBounds();
        setZoom(m.getZoom());
        setBbox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      };
      m.on("load", () => {
        // lapisan jejak Wikidata dan jalur penemuan (disembunyikan sampai dinyalakan)
        m.addSource("traces", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: traces.map((tr) => ({ type: "Feature", properties: { id: tr.id, name: tr.name, year: tr.year }, geometry: { type: "Point", coordinates: [tr.lng, tr.lat] } })),
          },
        });
        m.addLayer({
          id: "traces",
          type: "circle",
          source: "traces",
          layout: { visibility: "none" },
          paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2.2, 9, 5], "circle-color": "#e7b75f", "circle-opacity": 0.6, "circle-stroke-color": "#0d0b09", "circle-stroke-width": 1 },
        });
        const routeCoords = ROUTE_SITES.map((slug) => sites.find((s) => s.slug === slug)).filter((s): s is NonNullable<typeof s> => Boolean(s)).map((s) => [s.coords.lng, s.coords.lat]);
        m.addSource("route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: routeCoords } } });
        m.addLayer({ id: "route", type: "line", source: "route", layout: { visibility: "none" }, paint: { "line-color": "#e7b75f", "line-width": 2.4, "line-dasharray": [2, 2], "line-opacity": 0.85 } });
        m.on("click", "traces", (e) => {
          const id = e.features?.[0]?.properties?.id as string | undefined;
          if (id) openTrace(id);
        });
        m.on("mouseenter", "traces", () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", "traces", () => (m.getCanvas().style.cursor = ""));
        sync();
        setMap(m);
        onReady(m);
      });
      m.on("moveend", () => {
        sync();
        const c = m.getCenter();
        setView({ lat: c.lat, lng: c.lng, zoom: m.getZoom() });
      });
      // ubin gagal dimuat (misal sedang offline): peta tetap tampil dengan pin, tanpa galat konsol
      m.on("error", () => undefined);
      const ro = new ResizeObserver(() => m.resize());
      ro.observe(box.current);
      m.once("remove", () => ro.disconnect());
      setMl(maplibregl);
    });
    return () => {
      cancelled = true;
      created?.remove();
      setMap(null);
    };
  }, [onReady, openTrace, setView]);

  // lapisan jejak dan jalur
  useEffect(() => {
    if (!map) return;
    map.setLayoutProperty("traces", "visibility", layers.traces ? "visible" : "none");
    map.setLayoutProperty("route", "visibility", layers.route ? "visible" : "none");
  }, [map, layers.traces, layers.route]);
  useEffect(() => {
    if (!map) return;
    map.setFilter("traces", ["<=", ["get", "year"], toYear]);
  }, [map, toYear]);

  // terbang ke target (pencarian, pilihan, atur ulang)
  useEffect(() => {
    if (!map || !fly || lastFly.current?.nonce === fly.nonce) return;
    lastFly.current = fly;
    map.flyTo({ center: [fly.lng, fly.lat], zoom: fly.zoom, duration: isMotionReduced() ? 0 : 1200, essential: false });
  }, [map, fly]);

  // klaster
  const index = useMemo(() => {
    const idx = new Supercluster<{ slug: string }, { n: number }>({ radius: 52, maxZoom: 11, minPoints: 3 });
    idx.load(pins.map((p) => ({ type: "Feature" as const, properties: { slug: p.site.slug }, geometry: { type: "Point" as const, coordinates: [p.site.coords.lng, p.site.coords.lat] } })));
    return idx;
  }, [pins]);
  const pinBySlug = useMemo(() => new Map(pins.map((p) => [p.site.slug, p])), [pins]);
  const items = useMemo(() => index.getClusters(bbox, Math.min(16, Math.max(0, Math.floor(zoom)))), [index, bbox, zoom]);

  const zoomToCluster = useCallback(
    (id: number, lng: number, lat: number) => {
      if (!map) return;
      map.easeTo({ center: [lng, lat], zoom: Math.min(14, index.getClusterExpansionZoom(id) + 0.2), duration: isMotionReduced() ? 0 : 600 });
    },
    [map, index]
  );

  return (
    <div className="relative h-full w-full" data-peta-map>
      {/* MapLibre memberi wadahnya position: relative, jadi ukuran diatur lewat pembungkus absolut */}
      <div className="absolute inset-0">
        <div ref={box} className="h-full w-full" role="application" aria-label={t.peta.mapLabel} />
      </div>
      {map && ml && layers.pins && items.map((f) => {
        const [lng, lat] = f.geometry.coordinates;
        const props = f.properties as { cluster?: boolean; cluster_id?: number; point_count?: number; slug?: string };
        if (props.cluster && props.cluster_id !== undefined) {
          const n = props.point_count ?? 0;
          const size = 30 + Math.min(18, Math.log2(n) * 5);
          return (
            <MarkerPortal key={`c-${props.cluster_id}-${n}`} ml={ml} map={map} lng={lng} lat={lat} z={2}>
              <button
                type="button"
                onClick={() => zoomToCluster(props.cluster_id as number, lng, lat)}
                aria-label={t.peta.cluster(n)}
                className="flex items-center justify-center rounded-full border-2 border-[#0d0b09] bg-[var(--accent)] font-mono text-xs font-semibold text-[#0d0b09] shadow-lg transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                style={{ width: size, height: size }}
              >
                {n}
              </button>
            </MarkerPortal>
          );
        }
        const pin = props.slug ? pinBySlug.get(props.slug) : undefined;
        if (!pin) return null;
        const name = localizeSite(pin.site, lang).name;
        const size = pin.exists ? 22 + Math.min(6, pin.count) * 3 : 16;
        const isSel = selected === pin.site.slug;
        const pulsing = pulse.has(pin.site.slug);
        const showLabel = layers.labels && (isSel || pulsing || hoverSite === pin.site.slug || zoom >= 6.2);
        return (
          <MarkerPortal key={`s-${pin.site.slug}`} ml={ml} map={map} lng={lng} lat={lat} z={isSel ? 5 : pulsing ? 4 : 3}>
            <button
              type="button"
              onClick={() => select(pin.site.slug)}
              aria-label={pin.exists ? (pin.active ? t.peta.pinLabel(name, pin.count) : t.peta.pinLabelIdle(name)) : t.peta.pinLabelFuture(name)}
              aria-pressed={isSel}
              data-pin={pin.site.slug}
              className={cn("peta-pin group relative flex items-center justify-center rounded-full outline-none transition-[transform,opacity] duration-300", !pin.active && pin.exists && "opacity-60", !pin.exists && "opacity-45", isSel && "scale-125", pulsing && "peta-pin-pulse")}
              style={{ width: size, height: size }}
              onPointerEnter={() => usePetaStore.getState().setHoverSite(pin.site.slug)}
              onPointerLeave={() => usePetaStore.getState().setHoverSite(null)}
            >
              <span className="absolute inset-[-4px] rounded-full opacity-0 ring-2 ring-white transition-opacity group-focus-visible:opacity-100" aria-hidden />
              <PinGlyph category={pin.site.category} size={size} cvd={cvd} dim={!pin.exists} />
              {showLabel && (
                <span className="pointer-events-none absolute left-full top-1/2 ml-1.5 -translate-y-1/2 whitespace-nowrap rounded-full bg-[rgba(13,11,9,0.82)] px-2 py-0.5 text-[11px] text-[#f5ecdc]">{name}</span>
              )}
            </button>
          </MarkerPortal>
        );
      })}
      {map && ml && glow && (
        <MarkerPortal ml={ml} map={map} lng={glow.lng} lat={glow.lat} z={0}>
          <div className="peta-glow pointer-events-none relative" aria-hidden>
            <span className="absolute left-1/2 top-1/2 block h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(closest-side, rgba(255,214,150,0.5), rgba(255,214,150,0) 72%)" }} />
            <span className="absolute left-1/2 top-1/2 mt-5 -translate-x-1/2 whitespace-nowrap rounded-full bg-[rgba(13,11,9,0.8)] px-2 py-0.5 font-mono text-[10px] text-[#f5ecdc]">
              {glow.name} · {t.peta.kingdomCenter}
            </span>
          </div>
        </MarkerPortal>
      )}
    </div>
  );
}

