"use client";

import { useState } from "react";
import { SourceList } from "@/components/event/SourceList";
import type { Site } from "@/data";
import { localizeHotspot } from "@/lib/i18n";
import { altFor, imagesFor } from "@/lib/media";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";

/**
 * Titik cerita situs (site.hotspots). Bila situs punya foto berlatar transparan, titik ditaruh di
 * atasnya pada posisi perkiraan dari data; daftar di bawahnya selalu tersedia untuk keyboard dan
 * pembaca layar.
 */
export function Hotspots({ site }: { site: Site }) {
  const { t, lang } = useCopy();
  const [open, setOpen] = useState<string | null>(null);
  if (!site.hotspots.length) return null;
  const base = imagesFor(site.slug).find((m) => m.cutout);

  return (
    <div className="space-y-3">
      {base?.cutout && (
        <div className="relative mx-auto aspect-[4/3] w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={base.cutout} alt={altFor(base, lang)} className="h-full w-full object-contain" loading="lazy" />
          {site.hotspots.map((h, i) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setOpen(open === h.id ? null : h.id)}
              className={cn(
                "absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-mono text-xs font-bold shadow-lg ring-2 ring-white/80 transition-transform hover:scale-110",
                open === h.id ? "bg-white text-black" : "bg-[var(--accent)] text-[#0d0b09]"
              )}
              style={{ left: `${h.x}%`, top: `${h.y}%` }}
              aria-label={localizeHotspot(h, lang).title}
              aria-expanded={open === h.id}
            >
              {i + 1}
            </button>
          ))}
          <p className="absolute bottom-0 right-0 font-mono text-[9px] opacity-60">{t.detail.hotspotNote}</p>
        </div>
      )}
      <ol className="space-y-2">
        {site.hotspots.map((h, i) => {
          const loc = localizeHotspot(h, lang);
          const isOpen = open === h.id;
          return (
            <li key={h.id} className="rounded-xl border border-current/15">
              <button type="button" onClick={() => setOpen(isOpen ? null : h.id)} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] font-mono text-xs font-bold text-[#0d0b09]">{i + 1}</span>
                <span className="font-semibold">{loc.title}</span>
              </button>
              {isOpen && (
                <div className="space-y-2 px-3 pb-3 text-sm leading-relaxed opacity-90">
                  <p>{loc.body}</p>
                  {h.sourceIds?.length ? <SourceList ids={h.sourceIds} /> : null}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
