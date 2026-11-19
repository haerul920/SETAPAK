"use client";

import { Info, MapPin, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { siteBySlug, type TimelineEvent } from "@/data";
import { localizeEvent, localizeSite } from "@/lib/i18n";
import { imagesFor, srcFor } from "@/lib/media";
import { usePetaStore } from "@/lib/peta-store";
import { speak, speechSupported, stopSpeaking } from "@/lib/speech";
import { siteColor } from "@/lib/sites";
import { useSetapakStore } from "@/lib/store";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { EVENT_ICON } from "./pins";

/** Batas baris yang dirender sekaligus; sisanya dimuat saat daftar digulir ke bawah. */
const PAGE = 60;

/**
 * Daftar kronologis peristiwa di rentang aktif (docs/PETA_WAKTU.md bagian 4). Hover baris
 * menyorot pin, klik baris otomatis memilih situs dan mengarahkan peta ke lokasi peristiwa.
 */
export function RangeEventList({ events }: { events: TimelineEvent[] }) {
  const { t, lang } = useCopy();
  const openEvent = useSetapakStore((s) => s.openEvent);
  const setHoverSite = usePetaStore((s) => s.setHoverSite);
  const select = usePetaStore((s) => s.select);
  const flyTo = usePetaStore((s) => s.flyTo);
  const setSheet = usePetaStore((s) => s.setSheet);
  const selectedEv = usePetaStore((s) => s.ev);
  const [shown, setShown] = useState(PAGE);
  const [reading, setReading] = useState<string | null>(null);
  const [canSpeak, setCanSpeak] = useState(false);
  useEffect(() => setCanSpeak(speechSupported()), []);
  const box = useRef<HTMLDivElement>(null);
  const sitesCount = useMemo(() => new Set(events.map((e) => e.siteSlug)).size, [events]);

  const handleSelectEvent = (e: TimelineEvent) => {
    const site = e.siteSlug ? siteBySlug[e.siteSlug] : undefined;
    if (site) {
      select(site.slug, e.id);
      flyTo(site.coords.lat, site.coords.lng, 8);
      // Jika di layar sempit / sheet sedang terbuka, tutup sheet agar peta langsung terlihat
      if (usePetaStore.getState().sheet === "list") {
        setSheet("none");
      }
    } else {
      openEvent(e.id);
    }
  };

  useEffect(() => {
    setShown(PAGE);
    box.current?.scrollTo({ top: 0 });
  }, [events]);
  useEffect(() => () => stopSpeaking(), []);

  const toggleRead = (e: TimelineEvent) => {
    if (reading === e.id) {
      stopSpeaking();
      setReading(null);
      return;
    }
    const loc = localizeEvent(e, lang);
    speak(`${loc.dateLabel}. ${loc.title}. ${loc.narrative}`, lang, () => setReading(null));
    setReading(e.id);
  };

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label={t.peta.list}>
      <header className="shrink-0 border-b border-current/10 px-3 py-2.5">
        <h2 className="font-display text-base font-semibold">{t.peta.list}</h2>
        <p className="font-mono text-[11px] opacity-75" aria-live="polite" data-peta-count>
          {t.peta.count(events.length, sitesCount)}
        </p>
      </header>
      <div ref={box} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent onScroll={(e) => {
        const el = e.currentTarget;
        if (el.scrollTop + el.clientHeight > el.scrollHeight - 240) setShown((n) => Math.min(events.length, n + PAGE));
      }}>
        {events.length === 0 ? (
          <p className="p-4 text-sm opacity-80">{t.peta.empty}</p>
        ) : (
          <ul className="divide-y divide-current/10">
            {events.slice(0, shown).map((e) => {
              const site = e.siteSlug ? siteBySlug[e.siteSlug] : undefined;
              const Icon = EVENT_ICON[e.type];
              const loc = localizeEvent(e, lang);
              const photo = e.siteSlug ? imagesFor(e.siteSlug, ["hero", "gallery", "then"])[0] : undefined;
              return (
                <li key={e.id} className={cn("group relative", selectedEv === e.id && "bg-[var(--accent)]/15")}>
                  <button
                    type="button"
                    onClick={() => handleSelectEvent(e)}
                    onPointerEnter={() => setHoverSite(e.siteSlug)}
                    onPointerLeave={() => setHoverSite(null)}
                    onFocus={() => setHoverSite(e.siteSlug)}
                    onBlur={() => setHoverSite(null)}
                    className="flex w-full items-start gap-2.5 px-3 py-2 pr-10 text-left outline-none hover:bg-current/5 focus-visible:bg-current/10"
                    data-ev={e.id}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={srcFor(photo, 640)} alt="" loading="lazy" width={56} height={40} className="h-10 w-14 shrink-0 rounded object-cover" />
                    ) : (
                      <span className="h-10 w-14 shrink-0 rounded bg-current/10" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--accent)]">
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {loc.dateLabel}
                      </span>
                      <span className="block text-sm font-medium leading-snug">{loc.title}</span>
                      {site && (
                        <span className="flex items-center gap-1 text-[11px] opacity-75">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: siteColor(site.slug) }} aria-hidden />
                          <span className="truncate">{localizeSite(site, lang).name}</span>
                        </span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      openEvent(e.id);
                    }}
                    className="absolute right-1.5 top-2 rounded-full p-1.5 opacity-60 hover:bg-current/10 hover:opacity-100 focus-visible:opacity-100"
                    aria-label={`${t.peta.detail}: ${loc.title}`}
                    title={t.peta.detail}
                  >
                    <Info className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {shown < events.length && <p className="p-3 text-center font-mono text-[11px] opacity-60">… {events.length - shown}</p>}
      </div>
      {events.length > 0 && canSpeak && (
        <footer className="shrink-0 border-t border-current/10 p-2">
          <button
            type="button"
            onClick={() => toggleRead(events.find((x) => x.id === selectedEv) ?? events[0])}
            className="inline-flex items-center gap-1.5 rounded-full border border-current/25 px-3 py-1.5 text-xs hover:border-[var(--accent)]"
            aria-pressed={reading !== null}
          >
            {reading ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
            {reading ? t.peta.readStop : t.peta.readAloud}
          </button>
        </footer>
      )}
    </section>
  );
}
