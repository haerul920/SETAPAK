"use client";

import { AlertTriangle, ExternalLink, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getLenis } from "@/components/layout/SmoothScrollProvider";
import { StatusBadge } from "@/components/event/StatusBadge";
import { TRACE_ICON } from "@/components/scroll/TraceStones";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { imagesFor } from "@/lib/media";
import { useSetapakStore } from "@/lib/store";
import { loadTrace, TRACE_LABEL, traceLiteById, type Trace } from "@/lib/traces";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { Gallery } from "./Gallery";

/**
 * Laci detail jejak tingkat 3 (Wikidata). Selalu bertanda "perlu dicek": data otomatis, belum
 * diperiksa manusia. Kerangka dan judul tampil seketika dari data ringan; ringkasan, provinsi,
 * foto berkredit, dan tautan sumber muncul begitu data lengkap termuat (potongan terpisah).
 */
export function TraceDrawer() {
  const { t, lang } = useCopy();
  const openId = useSetapakStore((s) => s.openTraceId);
  const openTrace = useSetapakStore((s) => s.openTrace);
  // state laci tidak boleh terbawa ke halaman lain lalu terbuka lagi saat kembali ke guliran
  useEffect(() => () => openTrace(null), [openTrace]);
  const [shownId, setShownId] = useState<string | null>(null);
  const [full, setFull] = useState<Trace | undefined>(undefined);
  const [visible, setVisible] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const close = useCallback(() => openTrace(null), [openTrace]);

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
    setFull(undefined);
    if (!shownId) return;
    let live = true;
    loadTrace(shownId).then((tr) => {
      if (live) setFull(tr);
    });
    return () => {
      live = false;
    };
  }, [shownId]);

  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [shownId]);

  useFocusTrap(panel, Boolean(openId), close);

  const lite = shownId ? traceLiteById.get(shownId) : undefined;
  if (!lite) return null;
  const Icon = TRACE_ICON[lite.category];
  const name = lang === "en" && lite.nameEn ? lite.nameEn : lite.name;
  const photos = imagesFor(lite.id);
  const summarySource = full?.summarySource === "wikipedia-id" ? "Wikipedia" : "Wikidata";

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
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
        aria-labelledby="trace-title"
        className={cn(
          "panel-surface absolute flex flex-col shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "inset-x-0 bottom-0 max-h-[88svh] rounded-t-3xl md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[min(480px,92vw)] md:rounded-none md:rounded-l-3xl",
          visible ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full md:translate-y-0"
        )}
        data-lenis-prevent
      >
        <span className="mx-auto mt-2.5 block h-1 w-10 shrink-0 rounded-full bg-current/25 md:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3 border-b border-current/10 px-5 pb-3 pt-3 md:pt-5">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--accent)]">{lite.yearLabel}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs uppercase tracking-wider opacity-80">
              <Icon className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
              {TRACE_LABEL[lite.category][lang]}
              {full ? ` · ${full.province}` : ""}
            </p>
          </div>
          <button type="button" onClick={close} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-current/10" aria-label={t.close}>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div ref={body} className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 pb-10 pt-4" aria-busy={!full}>
          <header className="space-y-2">
            <h2 id="trace-title" className="font-display text-2xl font-semibold leading-tight md:text-3xl">
              {name}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="perlu-cek" />
              {full && (
                <span className="rounded-full border border-current/20 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider opacity-80">
                  {t.trace.kind[full.kind] ?? full.kind}
                </span>
              )}
            </div>
            <p className="flex items-start gap-2 text-sm text-check">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {t.trace.auto}
            </p>
          </header>

          {photos.length > 0 ? <Gallery items={photos} /> : <p className="text-xs opacity-70">{t.trace.noPhoto}</p>}

          {full && (
            <>
              <section aria-labelledby="trace-sum" className="space-y-2">
                <h3 id="trace-sum" className="sr-only">
                  {t.detail.story}
                </h3>
                <p className="prose-narrative !text-current">{full.summary}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider opacity-60">{t.trace.summaryFrom(summarySource)}</p>
              </section>

              <section aria-labelledby="trace-src" className="space-y-2">
                <h3 id="trace-src" className="font-mono text-[11px] uppercase tracking-widest opacity-70">
                  {t.trace.sources}
                </h3>
                <ul className="space-y-1.5 text-sm">
                  {full.wikipedia && (
                    <li>
                      <a href={full.wikipedia} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[var(--accent)] underline underline-offset-2">
                        {t.trace.wikipedia}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </li>
                  )}
                  <li>
                    <a href={full.wikidata} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[var(--accent)] underline underline-offset-2">
                      {t.trace.wikidata}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </li>
                </ul>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
