"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/store";
import { useQuality } from "./backgroundStore";

/**
 * Lapisan 5: vignette radial lembut dan film grain halus (opasitas sekitar 5%). Grain adalah ubin
 * noise yang dibuat sekali lalu digeser dengan transform bertahap, jadi murah. Vignette melemah
 * sendiri di masa terang (html[data-tone="light"]). Pada mode tanpa animasi atau kualitas hemat,
 * grain diam.
 */
export function FilmGrain() {
  const reduced = useReducedMotion();
  const quality = useQuality();
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    const c = document.createElement("canvas");
    c.width = 192;
    c.height = 192;
    const g = c.getContext("2d");
    if (!g) return;
    const img = g.createImageData(192, 192);
    let seed = 12345;
    for (let i = 0; i < img.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const v = (seed >>> 24) & 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    setUri(c.toDataURL("image/png"));
  }, []);

  const animated = !reduced && quality >= 1;
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-[25]"
        style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 56%, rgba(0,0,0,var(--vig, 0.38)) 100%)" }}
        aria-hidden
        data-vignette
      />
      {uri && (
        <div className="pointer-events-none fixed inset-0 z-[25] overflow-hidden" aria-hidden data-grain>
          <div
            className="absolute -inset-[10%] opacity-[0.05] mix-blend-overlay"
            style={{ backgroundImage: `url(${uri})`, backgroundSize: "192px 192px", animation: animated ? "grain-shift 0.9s steps(6) infinite" : "none" }}
          />
        </div>
      )}
    </>
  );
}
