"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { usePaletteVars } from "@/components/atmosphere/Background";
import { eraStrength, sceneSpans, type SceneEra } from "@/lib/background";
import type { TimelineLayout } from "@/lib/layout";
import { scenePlanes, TILE_H, TILE_W } from "@/lib/scene-shapes";
import { isMotionReduced, scrollStore } from "@/lib/store";

/**
 * Lapisan 2: pemandangan bertingkat per masa (docs/BACKGROUND.md). Tiga bidang siluet generik
 * (jauh, tengah, dekat) bergeser berbeda terhadap guliran (0,2x; 0,45x; 0,75x dari laju geser dasar),
 * makin jauh makin pucat dan biru mengikuti warna kabut. Hanya masa yang kekuatannya > 0 yang
 * dipasang (paling banyak dua). Di perbatasan masa, siluet lama turun dan memudar sementara yang baru
 * naik dari bawah. Gerak hanya transform dan opacity.
 */

/** Faktor geser tiap bidang terhadap guliran, sesuai docs/BACKGROUND.md. */
export const PLANE_FACTORS = [0.2, 0.45, 0.75] as const;
/** Laju geser dasar: px geser horizontal per px guliran pada faktor 1. */
const PAN = 0.32;

/** Koreksi warna per masa (filter matriks warna statis, murah): hangat di klasik, kehijauan di kolonial, netral di masa kini. */
const GRADE: Record<SceneEra, string> = {
  purba: "sepia(0.18) saturate(0.95)",
  "seni-cadas": "sepia(0.25) saturate(1.05)",
  senyap: "saturate(0.95)",
  klasik: "sepia(0.14) saturate(1.1)",
  majapahit: "sepia(0.2) saturate(1.1)",
  maritim: "hue-rotate(-6deg) saturate(1.05)",
  kolonial: "hue-rotate(14deg) saturate(0.88)",
  kemerdekaan: "sepia(0.12) saturate(1.08)",
  kini: "none",
};

const PLANE_FILL = [
  "color-mix(in oklab, var(--bg-bottom, #17110b) 66%, #8aa2b8)",
  "color-mix(in oklab, var(--bg-bottom, #17110b) 70%, #1c2329)",
  "color-mix(in oklab, var(--bg-bottom, #17110b) 34%, #050403)",
] as const;
const PLANE_OPACITY = [0.62, 0.82, 0.96] as const;
/** Masa kini berlatar terang: siluet dekat dilembutkan supaya teks kartu tetap terbaca di atasnya. */
const PLANE_FILL_LIGHT = [
  "color-mix(in oklab, var(--bg-bottom, #17110b) 66%, #8aa2b8)",
  "color-mix(in oklab, var(--bg-bottom, #17110b) 62%, #55606a)",
  "color-mix(in oklab, var(--bg-bottom, #17110b) 50%, #4a4944)",
] as const;
const PLANE_OPACITY_LIGHT = [0.5, 0.6, 0.5] as const;

const EraScene = memo(function EraScene({ era }: { era: SceneEra }) {
  const planes = useMemo(() => scenePlanes(era), [era]);
  const list = [planes.far, planes.mid, planes.near];
  return (
    <>
      {list.map((d, i) => (
        <div key={i} data-plane={i} className="absolute bottom-0 left-0 h-full will-change-transform" style={{ opacity: (era === "kini" ? PLANE_OPACITY_LIGHT : PLANE_OPACITY)[i] }}>
          <svg
            viewBox={`0 0 ${TILE_W * 2} ${TILE_H}`}
            preserveAspectRatio="xMinYMax slice"
            className="h-full w-auto"
            style={{ aspectRatio: `${TILE_W * 2} / ${TILE_H}`, fill: (era === "kini" ? PLANE_FILL_LIGHT : PLANE_FILL)[i] }}
            aria-hidden
          >
            <path d={d} />
            <path d={d} transform={`translate(${TILE_W} 0)`} />
          </svg>
        </div>
      ))}
    </>
  );
});

export function SceneLayers({ layout }: { layout: TimelineLayout }) {
  const spans = useMemo(() => sceneSpans(layout.scale), [layout]);
  const [active, setActive] = useState<SceneEra[]>(["purba"]);
  const refs = useRef<Partial<Record<SceneEra, HTMLDivElement | null>>>({});
  const paletteRef = useRef<HTMLDivElement>(null);
  usePaletteVars(paletteRef);

  useEffect(() => {
    let last = "";
    const apply = () => {
      const { y, viewport } = scrollStore.getState();
      const reduced = isMotionReduced();
      const fade = viewport * 1.2;
      const tile = (TILE_W / TILE_H) * viewport;
      const on: SceneEra[] = [];
      for (const s of spans) {
        const o = eraStrength(s, y, fade);
        if (o > 0.001) on.push(s.era);
        const el = refs.current[s.era];
        if (!el) continue;
        el.style.opacity = o.toFixed(3);
        // siluet baru naik dari bawah, yang lama turun saat memudar
        el.style.transform = reduced ? "none" : `translate3d(0, ${((1 - o) * 14).toFixed(1)}%, 0)`;
        if (o > 0.001) {
          const planes = el.querySelectorAll<HTMLElement>("[data-plane]");
          planes.forEach((pl, i) => {
            const shift = reduced ? 0 : (y * PLANE_FACTORS[i] * PAN) % tile;
            pl.style.transform = `translate3d(${(-shift).toFixed(1)}px, 0, 0)`;
          });
        }
      }
      const key = on.join(",");
      if (key !== last) {
        last = key;
        setActive(on);
      }
    };
    apply();
    window.addEventListener("resize", apply);
    const unsub = scrollStore.subscribe(apply);
    return () => {
      unsub();
      window.removeEventListener("resize", apply);
    };
  }, [spans]);

  return (
    <div ref={paletteRef} className="pointer-events-none fixed inset-0 -z-[15] overflow-hidden" aria-hidden data-scene-layers>
      {active.map((era) => (
        <div
          key={era}
          ref={(el) => {
            refs.current[era] = el;
          }}
          data-era={era}
          className="absolute inset-0"
          style={{ opacity: 0, filter: GRADE[era] }}
        >
          <EraScene era={era} />
        </div>
      ))}
    </div>
  );
}
