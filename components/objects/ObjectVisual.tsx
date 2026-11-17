"use client";

import { memo } from "react";
import { seedOf } from "@/lib/layout";
import { altFor, srcSetFor, type MediaEntry } from "@/lib/media";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";

export type VisualMode = "cutout" | "archive" | "photo" | "illustration";

/**
 * Visual utama objek (docs/OBJECTS.md, Anatomi 1):
 * cutout (foto bangunan berlatar transparan), archive (cetak foto tua berbingkai, sedikit miring),
 * photo (foto utuh dengan masker lembut menyatu ke latar), atau siluet SVG berlabel "ilustrasi".
 */
export const ObjectVisual = memo(function ObjectVisual({
  media,
  mode,
  seed,
  priority = false,
}: {
  media: MediaEntry | null;
  mode: VisualMode;
  seed: string;
  /** objek pertama yang sudah terlihat di layar pembuka: muat segera (LCP) */
  priority?: boolean;
}) {
  const load = priority ? ({ loading: "eager", fetchPriority: "high" } as const) : ({ loading: "lazy" } as const);
  const { lang, t } = useCopy();

  if (!media || mode === "illustration") {
    return (
      <div className="relative flex h-full w-full items-end justify-center">
        <svg viewBox="0 0 200 140" className="h-[85%] w-[85%] opacity-70" aria-hidden>
          <path d="M100 8 L112 30 L108 30 L120 52 L114 52 L130 80 L70 80 L86 52 L80 52 L92 30 L88 30 Z" fill="currentColor" fillOpacity="0.35" />
          <rect x="40" y="80" width="120" height="14" fill="currentColor" fillOpacity="0.3" />
          <rect x="28" y="94" width="144" height="16" fill="currentColor" fillOpacity="0.25" />
          <rect x="16" y="110" width="168" height="20" fill="currentColor" fillOpacity="0.2" />
        </svg>
        <span className="absolute left-2 top-2 rounded-full border border-current/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest opacity-75">
          {t.scroll.illustration}
        </span>
      </div>
    );
  }

  const alt = altFor(media, lang);

  if (mode === "cutout" && media.cutout) {
    return (
      <div className="relative flex h-full w-full items-end justify-center">
        <span className="obj-ground absolute inset-x-[8%] bottom-0 h-4 rounded-[50%]" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media.cutout} alt={alt} {...load} decoding="async" draggable={false} className="obj-cutout relative max-h-full max-w-full object-contain object-bottom" />
      </div>
    );
  }

  if (mode === "archive") {
    const rot = ((seedOf(seed) % 7) - 3) * 0.9;
    return (
      <div className="flex h-full w-full items-center justify-center p-1">
        <div className="obj-print relative h-full w-full" style={{ transform: `rotate(${rot}deg)` }}>
          <picture>
            <source type="image/avif" srcSet={srcSetFor(media, "avif")} sizes="320px" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${media.src}-640.webp`}
              srcSet={srcSetFor(media, "webp")}
              sizes="320px"
              alt={alt}
              {...load}
              decoding="async"
              draggable={false}
              className="h-full w-full object-cover sepia-[0.35]"
              style={{ objectPosition: media.focus }}
            />
          </picture>
        </div>
      </div>
    );
  }

  return (
    <picture className="block h-full w-full">
      <source type="image/avif" srcSet={srcSetFor(media, "avif")} sizes="320px" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${media.src}-640.webp`}
        srcSet={srcSetFor(media, "webp")}
        sizes="320px"
        alt={alt}
        {...load}
        decoding="async"
        draggable={false}
        className={cn("obj-photo h-full w-full object-cover")}
        style={{ objectPosition: media.focus }}
      />
    </picture>
  );
});
