"use client";

import { ExternalLink, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { categoryLabels, siteBySlug } from "@/data";
import { localizeEvent, localizeSite } from "@/lib/i18n";
import { altFor, imagesFor, srcFor } from "@/lib/media";
import { eventsBySite, inRange, axisYear } from "@/lib/peta-data";
import { usePetaStore } from "@/lib/peta-store";
import { speak, speechSupported, stopSpeaking } from "@/lib/speech";
import { siteColor } from "@/lib/sites";
import { useSetapakStore } from "@/lib/store";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { EVENT_ICON } from "./pins";

/**
 * Kartu situs terpilih (docs/PETA_WAKTU.md bagian 1): foto, nama, kategori, mini linimasa peristiwa
 * situs itu, tombol "Lihat di guliran waktu" (deep link `/?ev=ID`), "Detail", dan bacakan.
 */
export function SiteCard() {
  const { t, lang } = useCopy();
  const slug = usePetaStore((s) => s.site);
  const selectedEv = usePetaStore((s) => s.ev);
  const range = usePetaStore((s) => s.range);
  const select = usePetaStore((s) => s.select);
  const openEvent = useSetapakStore((s) => s.openEvent);
  const [reading, setReading] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  useEffect(() => setCanSpeak(speechSupported()), []);

  useEffect(() => {
    stopSpeaking();
    setReading(false);
  }, [slug]);
  useEffect(() => () => stopSpeaking(), []);

  const site = slug ? siteBySlug[slug] : undefined;
  if (!site) return null;
  const evs = eventsBySite.get(site.slug) ?? [];
  const photo = imagesFor(site.slug, ["hero", "gallery"])[0];
  const loc = localizeSite(site, lang);
  const focus = evs.find((e) => e.id === selectedEv) ?? evs.find((e) => inRange(axisYear(e), range)) ?? evs[0];
  const color = siteColor(site.slug);

  const read = () => {
    if (reading) {
      stopSpeaking();
      setReading(false);
      return;
    }
    const e = focus ? localizeEvent(focus, lang) : null;
    speak(`${loc.name}. ${loc.summary}${e ? ` ${e.dateLabel}. ${e.title}. ${e.narrative}` : ""}`, lang, () => setReading(false));
    setReading(true);
  };

  return (
    <aside className="panel-surface pointer-events-auto w-[min(340px,calc(100vw-1.5rem))] max-h-full overflow-hidden rounded-2xl shadow-2xl" aria-label={loc.name} data-peta-card data-lenis-prevent>
      <div className="overflow-y-auto max-h-full">
        {photo && (
          <div className="relative h-32 overflow-hidden rounded-tl-2xl bg-black/30 max-md:h-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={srcFor(photo, 640)} alt={altFor(photo, lang)} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="space-y-2.5 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold leading-tight">{loc.name}</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs opacity-80">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
                {categoryLabels[site.category][lang]} · {site.location}
              </p>
            </div>
            <button type="button" onClick={() => select(null)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-current/10" aria-label={t.close}>
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <p className="text-sm leading-relaxed opacity-90">{loc.summary}</p>

          <div>
            <p className="mb-1 font-mono text-[11px] uppercase tracking-widest opacity-70">{t.peta.siteEvents}</p>
            <ol className="relative space-y-0.5 border-l border-current/20 pl-3">
              {evs.map((e) => {
                const Icon = EVENT_ICON[e.type];
                const l = localizeEvent(e, lang);
                const inside = inRange(axisYear(e), range);
                return (
                  <li key={e.id}>
                    <button type="button" onClick={() => openEvent(e.id)} className={cn("flex w-full items-start gap-2 rounded px-1 py-0.5 text-left text-xs hover:bg-current/10", inside ? "opacity-100" : "opacity-55", focus?.id === e.id && "ring-1 ring-[var(--accent)]")}>
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" aria-hidden />
                      <span>
                        <span className="block font-mono text-[10px] text-[var(--accent)]">{l.dateLabel}</span>
                        <span className="block leading-snug">{l.title}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {focus && (
              <Link href={`/?ev=${focus.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#0d0b09]">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                {t.peta.viewInScroll}
              </Link>
            )}
            {focus && (
              <button type="button" onClick={() => openEvent(focus.id)} className="rounded-full border border-current/30 px-3 py-1.5 text-xs hover:border-[var(--accent)]">
                {t.peta.detail}
              </button>
            )}
            {canSpeak && (
              <button type="button" onClick={read} aria-pressed={reading} className="inline-flex items-center gap-1.5 rounded-full border border-current/30 px-3 py-1.5 text-xs hover:border-[var(--accent)]">
                {reading ? <VolumeX className="h-3.5 w-3.5" aria-hidden /> : <Volume2 className="h-3.5 w-3.5" aria-hidden />}
                {reading ? t.peta.readStop : t.peta.readAloud}
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
