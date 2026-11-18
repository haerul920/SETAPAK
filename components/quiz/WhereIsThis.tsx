"use client";

import type { Map as MlMap, Marker } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { NUSANTARA_BOUNDS, osmStyle } from "@/lib/map-style";
import { localizeSite } from "@/lib/i18n";
import { imagesFor } from "@/lib/media";
import { evaluate, quizSite, type Result, type WhereQ } from "@/lib/quiz";
import { isMotionReduced } from "@/lib/store";
import { traces } from "@/lib/traces";
import { useCopy } from "@/lib/useCopy";
import { Feedback, QuizPhoto } from "./shared";

type LngLat = { lat: number; lng: number };

function dot(color: string, size = 18): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #0d0b09;box-shadow:0 0 0 2px rgba(255,255,255,0.5)`;
  return el;
}

/**
 * Di Mana Ini? (docs/KUIS.md, mode 3): foto situs, lalu klik lokasinya di peta Nusantara (gaya peta
 * yang sama dengan Peta Waktu). Skor menurut jarak dalam km; garis beranimasi menghubungkan tebakan
 * dengan lokasi benar.
 */
export function WhereIsThis({ q, onResult, result }: { q: WhereQ; onResult: (guess: LngLat, r: Result) => void; result: Result | null }) {
  const { t, lang } = useCopy();
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const mlRef = useRef<typeof import("maplibre-gl") | null>(null);
  const guessMarker = useRef<Marker | null>(null);
  const [guess, setGuess] = useState<LngLat | null>(null);
  const lockedRef = useRef(false);
  const locked = result !== null;
  lockedRef.current = locked;
  const target = q.traceId ?? q.siteSlug ?? "";
  const media = useMemo(() => imagesFor(target, ["hero", "gallery", "now"]).find((m) => m.id === q.mediaId), [target, q.mediaId]);
  const site = q.siteSlug ? quizSite(q.siteSlug) : undefined;
  const trace = q.traceId ? traces.find((x) => x.id === q.traceId) : undefined;
  const name = site ? localizeSite(site, lang).name : trace ? (lang === "en" && trace.nameEn ? trace.nameEn : trace.name) : "";

  useEffect(() => {
    let cancelled = false;
    void import("maplibre-gl").then((mod) => {
      if (cancelled || !box.current) return;
      mlRef.current = mod;
      mod.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
      const m = new mod.Map({
        container: box.current,
        style: osmStyle(),
        bounds: NUSANTARA_BOUNDS,
        fitBoundsOptions: { padding: 16 },
        minZoom: 2.2,
        maxZoom: 12,
        attributionControl: { compact: false },
        dragRotate: false,
        pitchWithRotate: false,
      });
      m.touchZoomRotate.disableRotation();
      m.addControl(new mod.NavigationControl({ showCompass: false }), "top-right");
      m.on("error", () => undefined);
      m.on("click", (e) => {
        if (lockedRef.current) return;
        const g = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        setGuess(g);
        guessMarker.current?.remove();
        guessMarker.current = new mod.Marker({ element: dot("#e7b75f") }).setLngLat([g.lng, g.lat]).addTo(m);
      });
      m.getCanvas().style.cursor = "crosshair";
      const ro = new ResizeObserver(() => m.resize());
      ro.observe(box.current);
      m.once("remove", () => ro.disconnect());
      mapRef.current = m;
    });
    return () => {
      cancelled = true;
      guessMarker.current?.remove();
      guessMarker.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // setelah dikunci: tampilkan lokasi benar dan garis beranimasi dari tebakan
  useEffect(() => {
    const m = mapRef.current;
    const mod = mlRef.current;
    if (!locked || !m || !mod || !guess) return;
    m.getCanvas().style.cursor = "";
    new mod.Marker({ element: dot("#6fbf8e", 22) }).setLngLat([q.answer.lng, q.answer.lat]).addTo(m);
    const from: [number, number] = [guess.lng, guess.lat];
    const to: [number, number] = [q.answer.lng, q.answer.lat];
    const line = (p: number): GeoJSON.Feature => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [from, [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p]] } });
    const add = () => {
      if (m.getSource("link")) return;
      m.addSource("link", { type: "geojson", data: line(0) });
      m.addLayer({ id: "link", type: "line", source: "link", paint: { "line-color": "#f5ecdc", "line-width": 3, "line-dasharray": [2, 1.6] } });
      const src = m.getSource("link") as import("maplibre-gl").GeoJSONSource;
      if (isMotionReduced()) src.setData(line(1));
      else {
        const t0 = performance.now();
        const step = (now: number) => {
          const p = Math.min(1, (now - t0) / 900);
          src.setData(line(1 - (1 - p) ** 3));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    };
    if (m.isStyleLoaded()) add();
    else m.once("load", add);
    const b = new mod.LngLatBounds(from, from).extend(to);
    m.fitBounds(b, { padding: 70, maxZoom: 9, duration: isMotionReduced() ? 0 : 900 });
  }, [locked, guess, q.answer.lat, q.answer.lng]);

  return (
    <div className="space-y-4">
      <QuizPhoto media={media} />
      <p className="font-display text-xl font-semibold">{t.quiz.prompts.where}</p>
      <div className="relative h-[min(46vh,420px)] min-h-[260px] overflow-hidden rounded-2xl border border-current/20">
        <div className="absolute inset-0">
          <div ref={box} className="h-full w-full" role="application" aria-label={t.quiz.prompts.where} data-quiz-map />
        </div>
        {!guess && !locked && <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs">{t.quiz.mapHint}</p>}
      </div>
      {!locked ? (
        <button type="button" disabled={!guess} onClick={() => guess && onResult(guess, evaluate(q, guess))} className="rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-[#0d0b09] disabled:opacity-40">
          {t.quiz.lock}
        </button>
      ) : (
        <Feedback
          result={result}
          siteSlug={q.siteSlug}
          extra={
            <>
              <p>{t.quiz.answerIs(name)}</p>
              {result.km !== undefined && <p>{t.quiz.distance(Math.round(result.km).toLocaleString(lang === "id" ? "id-ID" : "en-US"))}</p>}
              <p className="font-mono text-[11px] opacity-80">
                <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#e7b75f]" aria-hidden />
                {t.quiz.mapGuess}
                <span className="mx-2 inline-block h-2.5 w-2.5 rounded-full bg-[#6fbf8e]" aria-hidden />
                {t.quiz.mapAnswer}
              </p>
            </>
          }
        />
      )}
    </div>
  );
}
