"use client";

import { memo, useCallback, useMemo, useRef } from "react";
import { StatusBadge } from "@/components/event/StatusBadge";
import { Credit } from "@/components/media/Credit";
import {
  AshSweep,
  BlastHole,
  DigShovel,
  FloodWaves,
  ProclamationClock,
  RiseSlices,
  ScrollRollers,
  SoftHalo,
  TypedNarrative,
  VolcanoMark,
} from "@/components/moments/ObjectMoments";
import { specialFor } from "@/components/moments/registry";
import { sortedEvents, type TimelineEvent } from "@/data";
import { localizeEvent, localizeSite } from "@/lib/i18n";
import { seedOf } from "@/lib/layout";
import { altFor, imagesFor, visualForEvent, type MediaEntry } from "@/lib/media";
import { useObjectMotion } from "@/lib/object-motion";
import { playSfx, type Sfx } from "@/lib/sfx";
import { siteBySlug, siteColor } from "@/lib/sites";
import { isMotionReduced, useSetapakStore } from "@/lib/store";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { ObjectVisual, type VisualMode } from "./ObjectVisual";
import { TypeEffect } from "./effects/TypeEffect";

/** Satu sampai dua kalimat pertama narasi untuk keterangan singkat. */
export function leadOf(text: string): string {
  // akhir kalimat = tanda baca yang diikuti spasi atau akhir teks (bukan titik dalam "22.00" atau "6,5")
  const parts = text.match(/.+?[.!?](?=\s|$)/g) ?? [text];
  const first = parts[0].trim();
  return first.length < 90 && parts[1] ? `${first} ${parts[1].trim()}` : first;
}

/** Urutan kemunculan peristiwa di situsnya (untuk bergiliran memakai foto). */
const indexInSite = (() => {
  const counts = new Map<string, number>();
  const out = new Map<string, number>();
  for (const ev of sortedEvents) {
    if (!ev.siteSlug) continue;
    const n = counts.get(ev.siteSlug) ?? 0;
    out.set(ev.id, n);
    counts.set(ev.siteSlug, n + 1);
  }
  return out;
})();

const SFX_BY_TYPE: Partial<Record<TimelineEvent["type"], Sfx>> = {
  dibangun: "stone",
  dipugar: "stone",
  rusak: "crack",
  ditetapkan: "stamp",
  terkubur: "wave",
  ditemukan: "shimmer",
};

/**
 * Objek animatif peristiwa (docs/OBJECTS.md): visual nyata dari data/media.json, lapisan efek
 * per tipe yang terikat guliran, gerak idle, parallax, kemiringan mengikuti kecepatan, keterangan
 * singkat yang muncul per baris, kredit aset, dan momen istimewa bila ada.
 */
export const EventObject = memo(function EventObject({ event, y, priority = false }: { event: TimelineEvent; y: number; priority?: boolean }) {
  const { t, lang } = useCopy();
  const openEvent = useSetapakStore((s) => s.openEvent);
  const setHoverSite = useSetapakStore((s) => s.setHoverSite);
  const hoverSite = useSetapakStore((s) => s.hoverSite);
  const ref = useRef<HTMLElement>(null);
  const loc = localizeEvent(event, lang);
  const site = siteBySlug(event.siteSlug);
  const color = siteColor(event.siteSlug);
  const lit = hoverSite !== null && hoverSite === event.siteSlug;
  const dim = hoverSite !== null && hoverSite !== event.siteSlug;
  const special = useMemo(() => specialFor(event), [event]);
  const seed = seedOf(event.id);

  const visual = useMemo((): { media: MediaEntry | null; mode: VisualMode } => {
    if (special?.kind === "closing") return { media: null, mode: "illustration" };
    if (special?.kind === "cave") {
      const tex = imagesFor("karst-maros-pangkep", ["texture"]);
      return { media: tex[(special.texture - 1) % Math.max(1, tex.length)] ?? null, mode: "photo" };
    }
    if (special?.kind === "rise") {
      const cut = imagesFor("borobudur").find((m) => m.cutout);
      if (cut) return { media: cut, mode: "cutout" };
    }
    const v = visualForEvent(event, indexInSite.get(event.id) ?? 0);
    return v ? { media: v.media, mode: v.mode } : { media: null, mode: "illustration" };
  }, [event, special]);

  const depthEl = useRef<HTMLElement | null>(null);
  const onProgress = useCallback(
    (p: number) => {
      if (special?.kind !== "volcano" || typeof special.depth !== "number") return;
      const el = (depthEl.current ??= ref.current?.querySelector<HTMLElement>("[data-depth]") ?? null);
      if (el) el.textContent = `${(special.depth * p).toLocaleString(lang === "id" ? "id-ID" : "en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m`;
    },
    [special, lang]
  );

  const onCross = useCallback(
    (th: number, forward: boolean) => {
      const el = ref.current;
      if (!el) return;
      if (th === 0.5) {
        el.classList.toggle("is-stamped", forward);
        if (forward) {
          const s = special?.kind === "flood" ? "wave" : SFX_BY_TYPE[event.type];
          if (s) playSfx(s);
        }
      }
      if (th === 0.6 && forward && !isMotionReduced()) {
        if (special?.kind === "quake") {
          el.classList.remove("is-quaking");
          void el.offsetWidth;
          el.classList.add("is-quaking");
        } else if (event.type === "rusak" && special?.kind !== "steady") {
          el.classList.remove("is-shaking");
          void el.offsetWidth;
          el.classList.add("is-shaking");
        }
        if (special?.kind === "blast") el.classList.add("is-flashed");
      }
    },
    [event.type, special]
  );

  useObjectMotion(ref, { y, speed: 0.9 + (seed % 21) / 100, thresholds: [0.5, 0.6], onCross, onProgress });

  // Banjir memakai ombak, abu 2010 memakai sapuan abu sendiri, penutup dan sekop tanpa efek tipe.
  const effectType = special && ["flood", "ashSweep", "closing", "dig", "steady"].includes(special.kind) ? null : event.type;
  const isClosing = special?.kind === "closing";

  return (
    <article
      ref={ref}
      id={event.id}
      data-type={event.type}
      data-mode={visual.mode}
      data-special={special?.kind}
      className={cn("obj group pointer-events-auto w-[min(300px,74vw)] transition-opacity duration-300", dim && "opacity-40", lit && "is-lit")}
      style={{ ["--float-dur" as string]: `${5 + (seed % 21) / 10}s`, ["--site" as string]: color }}
      onPointerEnter={() => event.siteSlug && setHoverSite(event.siteSlug)}
      onPointerLeave={() => setHoverSite(null)}
    >
      {!isClosing && (
        <div className="obj-move">
          <div className="obj-float">
            <div className="obj-box relative aspect-[16/10] w-full">
              <div className="obj-visual absolute inset-0">
                {special?.kind === "rise" && visual.media?.cutout ? (
                  <RiseSlices src={visual.media.cutout} alt={altFor(visual.media, lang)} />
                ) : (
                  <ObjectVisual media={visual.media} mode={visual.mode} seed={event.id} priority={priority} />
                )}
              </div>
              {effectType && <TypeEffect type={effectType} depth={special?.kind === "volcano" ? special.depth : undefined} />}
              {special?.kind === "scroll" && <ScrollRollers />}
              {special?.kind === "blast" && <BlastHole />}
              {special?.kind === "flood" && <FloodWaves />}
              {special?.kind === "ashSweep" && <AshSweep />}
              {special?.kind === "volcano" && <VolcanoMark />}
              {special?.kind === "clock" && <ProclamationClock />}
              {special?.kind === "steady" && <SoftHalo />}
              <button
                type="button"
                onClick={() => openEvent(event.id)}
                onFocus={() => event.siteSlug && setHoverSite(event.siteSlug)}
                onBlur={() => setHoverSite(null)}
                aria-label={t.scroll.openDetail(loc.title)}
                className="obj-hit absolute inset-0 z-[2] rounded-xl"
              />
              {special?.kind === "dig" && <DigShovel depth={special.depth} label={special.label || site?.name || ""} />}
              {visual.media && (
                <Credit
                  media={visual.media}
                  align={seed % 2 ? "left" : "right"}
                  className="z-[5] opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                />
              )}
            </div>
          </div>
        </div>
      )}
      <div className={cn("caption-plate obj-caption mt-3 max-w-[320px] space-y-1", isClosing && "text-center")}>
        <p className="obj-line font-mono text-[11px] uppercase tracking-widest text-[var(--accent)]" style={{ ["--li" as string]: 0 }}>
          {loc.dateLabel}
        </p>
        {site && (
          <p className="obj-line flex items-center gap-1.5 text-[11px] uppercase tracking-wider opacity-75" style={{ ["--li" as string]: 1 }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} aria-hidden />
            {localizeSite(site, lang).name}
          </p>
        )}
        <h2 className="obj-line font-display text-lg font-semibold leading-snug md:text-xl" style={{ ["--li" as string]: 2 }}>
          {loc.title}
        </h2>
        {special?.kind === "clock" ? (
          <TypedNarrative text={leadOf(loc.narrative)} />
        ) : (
          <p className="obj-line text-sm leading-relaxed opacity-85" style={{ ["--li" as string]: 3 }}>
            {isClosing ? loc.narrative : leadOf(loc.narrative)}
          </p>
        )}
        {special?.kind === "cave" && (
          <p className="obj-line font-mono text-[10px] opacity-70" style={{ ["--li" as string]: 4 }}>
            {t.cave.photoNote}
          </p>
        )}
        {!isClosing && (
          <div className="obj-line" style={{ ["--li" as string]: 4 }}>
            <StatusBadge status={event.status} className="mt-1" />
          </div>
        )}
      </div>
    </article>
  );
});
