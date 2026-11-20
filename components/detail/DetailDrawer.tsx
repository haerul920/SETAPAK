"use client";

import { AlertTriangle, MapPin, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getLenis } from "@/components/layout/SmoothScrollProvider";
import { SourceList } from "@/components/event/SourceList";
import { StatusBadge } from "@/components/event/StatusBadge";
import { sortedEvents } from "@/data";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { localizeEvent, localizeSite } from "@/lib/i18n";
import { galleryFor, imagesFor, thenNowPair } from "@/lib/media";
import { siteBySlug, siteColor } from "@/lib/sites";
import { useSetapakStore } from "@/lib/store";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { BeforeAfter } from "./BeforeAfter";
import { Gallery } from "./Gallery";
import { Hotspots } from "./Hotspots";

/**
 * Laci detail: samping kanan di desktop, lembar bawah di mobile. Berisi galeri berkredit, narasi
 * lengkap, slider Dulu dan Kini, titik cerita, status sumber, versi alternatif, dan daftar sumber.
 * Guliran utama dihentikan selama laci terbuka dan tetap di tempat saat ditutup.
 */
export function DetailDrawer() {
  const { t, lang } = useCopy();
  const openId = useSetapakStore((s) => s.openEventId);
  const openEvent = useSetapakStore((s) => s.openEvent);
  const pathname = usePathname();
  // laci milik guliran: tutup saat pindah halaman (mis. lewat "Lihat di Peta Waktu")
  useEffect(() => {
    openEvent(null);
  }, [pathname, openEvent]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [shownId, setShownId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const close = useCallback(() => openEvent(null), [openEvent]);

  // buka/tutup dengan transisi; isi tetap terpasang selama animasi tutup
  useEffect(() => {
    if (openId) {
      setShownId(openId);
      const r = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(r);
    }
    setVisible(false);
    const tm = window.setTimeout(() => setShownId(null), 320);
    return () => window.clearTimeout(tm);
  }, [openId]);

  // kunci guliran utama tanpa mengubah posisinya
  useEffect(() => {
    if (!openId) return;
    const lenis = getLenis();
    lenis?.stop();
    const html = document.documentElement;
    const prev = html.style.overflow;
    const sbw = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    if (sbw > 0) html.style.paddingRight = `${sbw}px`;
    return () => {
      html.style.overflow = prev;
      html.style.paddingRight = "";
      lenis?.start();
    };
  }, [openId]);

  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [shownId]);

  useFocusTrap(panel, Boolean(openId), close);

  const ev = shownId ? sortedEvents.find((e) => e.id === shownId) : undefined;
  if (!mounted || !ev) return null;
  const loc = localizeEvent(ev, lang);
  const site = siteBySlug(ev.siteSlug);
  const color = siteColor(ev.siteSlug);
  const gallery = [...imagesFor(ev.id), ...(site ? galleryFor(site.slug) : [])];
  const pair = site ? thenNowPair(site.slug) : null;
  const siblings = site ? sortedEvents.filter((e) => e.siteSlug === site.slug) : [];

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="presentation">
      <button
        type="button"
        aria-label={t.close}
        onClick={close}
        className={cn("absolute inset-0 bg-black/45 transition-opacity duration-300", visible ? "opacity-100" : "opacity-0")}
        tabIndex={-1}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        className={cn(
          "panel-surface absolute flex flex-col shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "inset-x-0 bottom-0 max-h-[88svh] rounded-t-3xl md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[min(520px,92vw)] md:rounded-none md:rounded-l-3xl",
          visible ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full md:translate-y-0"
        )}
        data-lenis-prevent
      >
        <span className="mx-auto mt-2.5 block h-1 w-10 shrink-0 rounded-full bg-current/25 md:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3 border-b border-current/10 px-5 pb-3 pt-3 md:pt-5">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--accent)]">{loc.dateLabel}</p>
            {site && (
              <p className="mt-1 flex items-center gap-1.5 text-xs uppercase tracking-wider opacity-80">
                <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
                {localizeSite(site, lang).name} · {site.location}
              </p>
            )}
          </div>
          <button type="button" onClick={close} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-current/10" aria-label={t.close}>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div ref={body} className="flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 pb-10 pt-4">
          <header className="space-y-2">
            <h2 id="detail-title" className="font-display text-2xl font-semibold leading-tight md:text-3xl">
              {loc.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={ev.status} />
              <span className="rounded-full border border-current/20 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider opacity-80">{t.event.types[ev.type]}</span>
            </div>
            {ev.status === "perlu-cek" && (
              <p className="flex items-start gap-2 text-sm text-check">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {t.event.checkNote}
              </p>
            )}
          </header>

          {gallery.length > 0 && <Gallery items={gallery} />}

          <section aria-labelledby="d-narr">
            <h3 id="d-narr" className="sr-only">
              {t.detail.story}
            </h3>
            <p className="prose-narrative !text-current">{loc.narrative}</p>
          </section>

          {ev.alternatives?.length ? (
            <section aria-labelledby="d-alt" className="rounded-2xl border border-debated/40 p-4">
              <h3 id="d-alt" className="font-mono text-[11px] uppercase tracking-widest text-debated">
                {t.event.alternatives}
              </h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
                {ev.alternatives.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {pair && (
            <section aria-labelledby="d-tn" className="space-y-3">
              <h3 id="d-tn" className="font-display text-lg font-semibold">
                {t.event.thenNow}
              </h3>
              <BeforeAfter then={pair.then} now={pair.now} />
            </section>
          )}

          {site && site.hotspots.length > 0 && (
            <section aria-labelledby="d-hs" className="space-y-3">
              <h3 id="d-hs" className="font-display text-lg font-semibold">
                {t.detail.hotspots}
              </h3>
              <Hotspots site={site} />
            </section>
          )}

          <Link href={`/peta?ev=${ev.id}`} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-current/30 px-5 text-sm hover:border-[var(--accent)] hover:text-[var(--accent)]" data-open-in-peta>
            <MapPin className="h-4 w-4" aria-hidden />
            {t.detail.inPeta}
          </Link>

          {ev.sourceIds.length > 0 && (
            <section aria-labelledby="d-src" className="space-y-3">
              <h3 id="d-src" className="font-display text-lg font-semibold">
                {t.source.title}
              </h3>
              <SourceList ids={ev.sourceIds} />
            </section>
          )}

          {siblings.length > 1 && (
            <section aria-labelledby="d-sib" className="space-y-2">
              <h3 id="d-sib" className="font-display text-lg font-semibold">
                {t.detail.siteThread}
              </h3>
              <ol className="relative space-y-1 border-l-2 pl-4" style={{ borderColor: color }}>
                {siblings.map((s) => {
                  const sl = localizeEvent(s, lang);
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => openEvent(s.id)}
                        aria-current={s.id === ev.id ? "true" : undefined}
                        className={cn("w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-current/10", s.id === ev.id && "bg-current/10 font-semibold")}
                      >
                        <span className="font-mono text-[11px] text-[var(--accent)]">{sl.dateLabel}</span> {sl.title}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
