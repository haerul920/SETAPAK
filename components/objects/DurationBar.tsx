"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import type { TimelineEvent } from "@/data";
import { localizeEvent } from "@/lib/i18n";
import type { Bar } from "@/lib/layout";
import { imagesFor, srcFor } from "@/lib/media";
import { useObjectMotion } from "@/lib/object-motion";
import { siteColor } from "@/lib/sites";
import { scrollStore, useSetapakStore } from "@/lib/store";
import { tickLabel } from "@/lib/time-scale";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";

const LANE_W = 14;

/**
 * Batang durasi untuk peristiwa ber-endKey (docs/OBJECTS.md): garis 3 px berwarna situs dari
 * awal sampai akhir rentang, objek mini yang menempel (sticky) sepanjang batang dan berubah
 * keadaan mengikuti progres batang (--p dari useObjectMotion dengan rentang batang), serta label
 * rentang di ujung.
 */
export const DurationBar = memo(function DurationBar({ event, bar, lo, hi }: { event: TimelineEvent; bar: Bar; lo: number; hi: number }) {
  const { lang } = useCopy();
  const hoverSite = useSetapakStore((s) => s.hoverSite);
  const ref = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const color = siteColor(event.siteSlug);
  const loc = localizeEvent(event, lang);
  const lit = hoverSite !== null && hoverSite === event.siteSlug;
  const start = Math.floor(event.sortKey);
  const end = Math.floor(event.endKey ?? event.sortKey);
  const thumb = useMemo(() => {
    if (!event.siteSlug) return null;
    const cut = imagesFor(event.siteSlug).find((m) => m.cutout);
    if (cut) return { src: cut.cutout!, cutout: true };
    const any = imagesFor(event.siteSlug, ["hero", "gallery", "now"])[0];
    return any ? { src: srcFor(any, 640), cutout: false } : null;
  }, [event.siteSlug]);

  // Geometri dipangkas ke jendela virtualisasi: batang bisa setinggi puluhan ribu piksel, dan elemen
  // setinggi itu (plus sticky di dalamnya) sangat mahal dirasterisasi dan dihitung ulang tiap gulir.
  const full = bar.y1 - bar.y0;
  const top = Math.max(bar.y0, lo);
  const boxH = Math.max(1, Math.min(bar.y1, hi) - top);
  const startsHere = bar.y0 >= lo;
  const endsHere = bar.y1 <= hi;
  const showThumb = !!thumb && full >= 150 + bar.lane * 56;

  useObjectMotion(ref, { y: bar.y0, range: [bar.y0, bar.y1] });

  // Thumbnail mengikuti garis acuan lewat transform (sebelumnya position: sticky) dan berhenti di ujung batang.
  useEffect(() => {
    const el = stickRef.current;
    if (!el) return;
    const minT = bar.y0 + bar.lane * 56 - 24 - top;
    const maxT = Math.max(minT, bar.y1 - 48 - top);
    let last = NaN;
    const apply = () => {
      const { y } = scrollStore.getState();
      const t = Math.round(Math.min(maxT, Math.max(minT, y - 24 + bar.lane * 56 - top)));
      if (t === last) return;
      last = t;
      el.style.transform = `translate3d(0, ${t}px, 0)`;
    };
    apply();
    return scrollStore.subscribe(apply);
  }, [bar.y0, bar.y1, bar.lane, top]);

  return (
    <div
      ref={ref}
      data-type={event.type}
      className={cn("bar pointer-events-none absolute w-3 transition-opacity duration-300", hoverSite && !lit && "opacity-30")}
      style={{ top, height: boxH, left: 18 + bar.lane * LANE_W }}
      aria-hidden
    >
      <div className="absolute inset-y-0 left-1 w-[3px] rounded-full" style={{ background: color, opacity: lit ? 1 : 0.35 }} />
      <div
        className="bar-fill absolute inset-y-0 left-1 w-[3px] origin-top rounded-full"
        style={{ background: color, ["--H" as string]: full, ["--off" as string]: top - bar.y0, ["--bh" as string]: boxH }}
      />
      {startsHere && <div className="absolute left-1 top-0 h-2.5 w-2.5 -translate-x-[3.5px] rounded-full" style={{ background: color }} />}
      <div ref={stickRef} className="absolute left-0 top-0 flex w-max items-center gap-2 pl-0.5 will-change-transform">
        {showThumb && (
          <span className="bar-thumb relative hidden h-12 w-12 overflow-hidden rounded-lg ring-2 md:block" style={{ ["--tw-ring-color" as string]: color }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb!.src} alt="" loading="lazy" className={cn("bar-thumb-img h-full w-full", thumb!.cutout ? "object-contain object-bottom" : "object-cover")} />
            <span className="bar-thumb-cover absolute inset-0" />
          </span>
        )}
        <span className="block h-2.5 w-2.5 -translate-x-[3.5px] rounded-full md:hidden" style={{ background: color }} />
      </div>
      {endsHere && (
        <div className="absolute left-1 flex -translate-x-[3.5px] items-center gap-1 pt-1" style={{ top: `calc(100% + ${bar.lane * 14}px)` }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
          <span className="hidden whitespace-nowrap font-mono text-[10px] opacity-75 md:inline">
            {start === end ? loc.dateLabel : `${tickLabel(start, lang)} → ${tickLabel(end, lang)}`}
          </span>
        </div>
      )}
    </div>
  );
});
