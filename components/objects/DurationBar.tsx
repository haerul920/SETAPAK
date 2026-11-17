"use client";

import { memo, useMemo, useRef } from "react";
import type { TimelineEvent } from "@/data";
import { localizeEvent } from "@/lib/i18n";
import type { Bar } from "@/lib/layout";
import { imagesFor, srcFor } from "@/lib/media";
import { useObjectMotion } from "@/lib/object-motion";
import { siteColor } from "@/lib/sites";
import { useSetapakStore } from "@/lib/store";
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
export const DurationBar = memo(function DurationBar({ event, bar }: { event: TimelineEvent; bar: Bar }) {
  const { lang } = useCopy();
  const hoverSite = useSetapakStore((s) => s.hoverSite);
  const ref = useRef<HTMLDivElement>(null);
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

  useObjectMotion(ref, { y: bar.y0, range: [bar.y0, bar.y1] });

  return (
    <div
      ref={ref}
      data-type={event.type}
      className={cn("bar pointer-events-none absolute w-3 transition-opacity duration-300", hoverSite && !lit && "opacity-30")}
      style={{ top: bar.y0, height: bar.y1 - bar.y0, left: 18 + bar.lane * LANE_W }}
      aria-hidden
    >
      <div className="absolute inset-y-0 left-1 w-[3px] rounded-full" style={{ background: color, opacity: lit ? 1 : 0.35 }} />
      <div className="bar-fill absolute inset-y-0 left-1 w-[3px] origin-top rounded-full" style={{ background: color }} />
      <div className="absolute left-1 top-0 h-2.5 w-2.5 -translate-x-[3.5px] rounded-full" style={{ background: color }} />
      <div className="sticky -mt-6 flex w-max items-center gap-2 pl-0.5" style={{ top: `calc(50% - 24px + ${bar.lane * 56}px)` }}>
        {thumb && (
          <span className="bar-thumb relative hidden h-12 w-12 overflow-hidden rounded-lg ring-2 md:block" style={{ ["--tw-ring-color" as string]: color }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb.src} alt="" loading="lazy" className={cn("bar-thumb-img h-full w-full", thumb.cutout ? "object-contain object-bottom" : "object-cover")} />
            <span className="bar-thumb-cover absolute inset-0" />
          </span>
        )}
        <span className="block h-2.5 w-2.5 -translate-x-[3.5px] rounded-full md:hidden" style={{ background: color }} />
        <span className="hidden max-w-[150px] truncate whitespace-nowrap font-mono text-[10px] opacity-80 xl:inline">{loc.title}</span>
      </div>
      <div className="absolute bottom-0 left-1 flex -translate-x-[3.5px] translate-y-full items-center gap-1 pt-1">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="hidden whitespace-nowrap font-mono text-[10px] opacity-75 md:inline">
          {start === end ? loc.dateLabel : `${tickLabel(start, lang)} → ${tickLabel(end, lang)}`}
        </span>
      </div>
    </div>
  );
});
