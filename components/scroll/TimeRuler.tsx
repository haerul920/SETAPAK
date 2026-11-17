"use client";

import { useEffect, useRef } from "react";
import { localizeEvent } from "@/lib/i18n";
import { clusterAtY, nextClusterAfter, type TimelineLayout } from "@/lib/layout";
import { goToY } from "@/lib/navigator";
import { siteColor } from "@/lib/sites";
import { scrollStore, useSetapakStore } from "@/lib/store";
import { boundaryLabel, formatYear } from "@/lib/time-scale";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";

/**
 * Penggaris waktu / minimap di sisi kanan (desktop). Mewakili seluruh lintasan: batas segmen,
 * titik tiap peristiwa (warna situs), dan penanda posisi. Klik atau seret untuk melompat.
 */
export function TimeRuler({ layout }: { layout: TimelineLayout }) {
  const { t, lang } = useCopy();
  const hoverSite = useSetapakStore((s) => s.hoverSite);
  const rail = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const apply = () => {
      const { y, total } = scrollStore.getState();
      const h = rail.current?.clientHeight ?? 0;
      if (marker.current) marker.current.style.transform = `translate3d(0, ${(y / total) * h}px, 0)`;
      if (rail.current) {
        rail.current.setAttribute("aria-valuenow", String(Math.round(y)));
        rail.current.setAttribute("aria-valuetext", formatYear(scrollStore.getState().year, lang));
      }
    };
    apply();
    window.addEventListener("resize", apply);
    const unsub = scrollStore.subscribe(apply);
    return () => {
      unsub();
      window.removeEventListener("resize", apply);
    };
  }, [lang]);

  const yFromPointer = (clientY: number) => {
    const r = rail.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientY - r.top) / r.height)) * layout.total;
  };

  const pct = (y: number) => `${(y / layout.total) * 100}%`;

  return (
    <div className="pointer-events-none fixed bottom-6 right-3 top-20 z-30 hidden w-12 md:block">
      <div
        ref={rail}
        role="slider"
        tabIndex={0}
        aria-label={t.scroll.ruler}
        aria-valuemin={0}
        aria-valuemax={Math.round(layout.total)}
        aria-valuenow={0}
        aria-orientation="vertical"
        className="ruler-ink pointer-events-auto relative h-full w-full cursor-pointer touch-none select-none"
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          goToY(yFromPointer(e.clientY));
        }}
        onPointerMove={(e) => {
          if (dragging.current) goToY(yFromPointer(e.clientY), { immediate: true });
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onKeyDown={(e) => {
          const y = scrollStore.getState().y;
          if (e.key === "ArrowDown" || e.key === "PageDown") {
            const next = nextClusterAfter(layout, y);
            if (next) goToY(next.y);
            e.preventDefault();
          } else if (e.key === "ArrowUp" || e.key === "PageUp") {
            const cur = clusterAtY(layout, y);
            const prev = [...layout.clusters].reverse().find((c) => c.y < (cur ? cur.y : y) - 4);
            goToY(prev ? prev.y : 0);
            e.preventDefault();
          } else if (e.key === "Home") {
            goToY(0);
            e.preventDefault();
          } else if (e.key === "End") {
            goToY(layout.total);
            e.preventDefault();
          }
        }}
      >
        <div className="absolute inset-y-0 right-3 w-px bg-current opacity-25" />
        <DensityHistogram density={layout.density} />
        {layout.segmentMarks.map((m) => (
          <div key={m.segment.id} className="absolute right-0 flex w-full items-center justify-end gap-1" style={{ top: pct(m.y) }}>
            <span className="font-mono text-[8px] leading-none opacity-50">{boundaryLabel(m.segment.from, lang)}</span>
            <span className="h-px w-3 bg-current opacity-40" />
          </div>
        ))}
        {layout.clusters.flatMap((c) =>
          c.events.map((pe, i) => (
            <span
              key={pe.event.id}
              title={`${localizeEvent(pe.event, lang).dateLabel}: ${localizeEvent(pe.event, lang).title}`}
              className={cn(
                "absolute h-1.5 w-1.5 rounded-full transition-transform duration-300",
                hoverSite && pe.event.siteSlug === hoverSite ? "scale-[2.2]" : hoverSite ? "opacity-30" : ""
              )}
              style={{ top: pct(c.y), right: 10 + i * 4 - 2, background: siteColor(pe.event.siteSlug) }}
            />
          ))
        )}
        <div ref={marker} className="absolute -top-px right-0 flex w-full items-center justify-end will-change-transform" aria-hidden>
          <span className="sr-only">{t.scroll.rulerHere}</span>
          <span className="h-0.5 w-7 rounded-full bg-[var(--accent)]" />
        </div>
      </div>
    </div>
  );
}

/**
 * Histogram kepadatan: batang tipis di sisi kiri garis penggaris. Panjang batang mengikuti
 * jumlah peristiwa (bobot 3) dan jejak (bobot 1) di tiap potongan lintasan, supaya terlihat
 * di mana sejarah sedang ramai.
 */
function DensityHistogram({ density }: { density: number[] }) {
  const max = Math.max(1, ...density);
  const h = 100 / density.length;
  return (
    <svg className="pointer-events-none absolute inset-y-0 right-4 h-full w-8 opacity-60" viewBox="0 0 32 100" preserveAspectRatio="none" aria-hidden data-density>
      {density.map((v, i) =>
        v > 0 ? <rect key={i} x={32 - 32 * Math.sqrt(v / max)} y={i * h} width={32 * Math.sqrt(v / max)} height={Math.max(0.25, h - 0.15)} fill="currentColor" /> : null
      )}
    </svg>
  );
}
