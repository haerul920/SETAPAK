"use client";

import { memo, useMemo } from "react";
import type { TimelineLayout } from "@/lib/layout";
import { SITE_COLORS } from "@/lib/sites";
import { useSetapakStore } from "@/lib/store";

interface Pt {
  x: number;
  /** titik masuk (atas visual) */
  y: number;
  /** titik keluar (bawah keterangan) */
  yOut: number;
}

/**
 * Benang situs: garis tipis berwarna situs yang menghubungkan semua kemunculan situs yang sama
 * sepanjang guliran. Hanya potongan di sekitar jendela yang terlihat yang digambar (satu SVG
 * setinggi jendela). Saat objek disorot, benang situsnya menyala dan yang lain meredup.
 */
export const SiteThreads = memo(function SiteThreads({ layout, lo, hi }: { layout: TimelineLayout; lo: number; hi: number }) {
  const hoverSite = useSetapakStore((s) => s.hoverSite);

  const bySite = useMemo(() => {
    const block = layout.mobile ? 400 : 410; // tinggi visual + keterangan
    const map = new Map<string, Pt[]>();
    for (const c of layout.clusters) {
      for (const pe of c.events) {
        const slug = pe.event.siteSlug;
        if (!slug) continue;
        const list = map.get(slug) ?? [];
        const top = c.y - layout.objectHeight * 0.35 + pe.dy - 8;
        list.push({ x: pe.x * 100, y: top, yOut: top + block });
        map.set(slug, list);
      }
    }
    return map;
  }, [layout]);

  const h = Math.max(1, hi - lo);
  const paths: { slug: string; d: string }[] = [];
  for (const [slug, pts] of bySite) {
    if (pts.length < 2) continue;
    // titik dalam jendela, ditambah satu tetangga di luar kiri dan kanan supaya garis masuk dan keluar
    let first = pts.findIndex((p) => p.y >= lo);
    if (first === -1) continue;
    let last = pts.length - 1;
    for (let i = pts.length - 1; i >= 0; i--) {
      if (pts[i].y <= hi) {
        last = i;
        break;
      }
    }
    first = Math.max(0, first - 1);
    last = Math.min(pts.length - 1, last + 1);
    if (last <= first) continue;
    // satu potongan per pasangan berurutan: dari bawah keterangan objek ke atas visual berikutnya,
    // sehingga benang tidak pernah menembus objek atau teksnya
    let d = "";
    for (let i = first + 1; i <= last; i++) {
      const q = pts[i - 1];
      const p = pts[i];
      const y0 = q.yOut - lo;
      const y1 = p.y - lo;
      if (y1 <= y0) continue;
      const my = ((y0 + y1) / 2).toFixed(1);
      d += `M${q.x.toFixed(2)} ${y0.toFixed(1)} C${q.x.toFixed(2)} ${my} ${p.x.toFixed(2)} ${my} ${p.x.toFixed(2)} ${y1.toFixed(1)} `;
    }
    if (!d) continue;
    paths.push({ slug, d });
  }

  return (
    <svg className="pointer-events-none absolute left-0" style={{ top: lo, height: h, width: "100%" }} viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" aria-hidden>
      {paths.map(({ slug, d }) => {
        const lit = hoverSite === slug;
        return (
          <path
            key={slug}
            d={d}
            fill="none"
            stroke={SITE_COLORS[slug]}
            strokeWidth={lit ? 2.5 : 1.25}
            strokeOpacity={lit ? 0.95 : hoverSite ? 0.06 : 0.2}
            strokeDasharray={lit ? undefined : "2 6"}
            vectorEffect="non-scaling-stroke"
            style={{ transition: "stroke-opacity 0.3s ease" }}
          />
        );
      })}
    </svg>
  );
});
