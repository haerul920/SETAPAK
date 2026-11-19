"use client";

import type { Map as MlMap } from "maplibre-gl";
import { Camera, Filter, ListOrdered, Link2, Printer, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DetailDrawer } from "@/components/detail/DetailDrawer";
import { TraceDrawer } from "@/components/detail/TraceDrawer";
import { categoryLabels, kingdoms, sortedEvents, siteBySlug, type Category } from "@/data";
import { localizeSite } from "@/lib/i18n";
import { axisYear, eventMatches, eventsInRange, parseState, rangeAround, serializeState, visiblePins } from "@/lib/peta-data";
import { usePetaPrefs, usePetaStore } from "@/lib/peta-store";
import { END_YEAR, formatYear } from "@/lib/time-scale";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { MapFilters } from "./MapFilters";
import { NusantaraMap } from "./NusantaraMap";
import { categoryColor } from "./pins";
import { RangeEventList } from "./RangeEventList";
import { SearchBox } from "./SearchBox";
import { SiteCard } from "./SiteCard";
import { TimeAxis } from "./TimeAxis";

const CATS = Object.keys(categoryLabels) as Category[];
const TEXT_PX = { sm: 14, md: 16, lg: 18 } as const;

/** Halaman Peta Waktu (docs/PETA_WAKTU.md): peta, sumbu waktu, pita kerajaan, filter, dan daftar. */
export function PetaClient() {
  const { t, lang } = useCopy();
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const range = usePetaStore((s) => s.range);
  const mode = usePetaStore((s) => s.mode);
  const point = usePetaStore((s) => s.point);
  const filters = usePetaStore((s) => s.filters);
  const showAll = usePetaStore((s) => s.showAll);
  const layers = usePetaStore((s) => s.layers);
  const view = usePetaStore((s) => s.view);
  const evId = usePetaStore((s) => s.ev);
  const siteSlug = usePetaStore((s) => s.site);
  const playing = usePetaStore((s) => s.playing);
  const hoverKingdom = usePetaStore((s) => s.hoverKingdom);
  const sheet = usePetaStore((s) => s.sheet);
  const setSheet = usePetaStore((s) => s.setSheet);
  const timeAxisCollapsed = usePetaStore((s) => s.timeAxisCollapsed);
  const textSize = usePetaPrefs((s) => s.textSize);
  const cvd = usePetaPrefs((s) => s.colorblind);
  const [pulse, setPulse] = useState<ReadonlySet<string>>(new Set());
  const [showFiltersAside, setShowFiltersAside] = useState(true);
  const [showEventsAside, setShowEventsAside] = useState(true);

  const toggleFilters = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSheet(sheet === "filters" ? "none" : "filters");
    } else {
      setShowFiltersAside((v) => !v);
    }
  };

  const toggleEvents = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSheet(sheet === "list" ? "none" : "list");
    } else {
      setShowEventsAside((v) => !v);
    }
  };

  // status awal dari query string, lalu opsi tersimpan
  useEffect(() => {
    void usePetaPrefs.persist.rehydrate();
    const params = new URLSearchParams(window.location.search);
    // ?petadebug membuka store di window.__peta untuk verifikasi otomatis
    if (params.has("petadebug")) (window as unknown as { __peta?: typeof usePetaStore }).__peta = usePetaStore;
    const st = parseState(params, CATS);
    usePetaStore.getState().hydrate(st);
    const ev = st.ev ? sortedEvents.find((e) => e.id === st.ev) : undefined;
    if (ev) {
      const s = usePetaStore.getState();
      s.setRange(rangeAround(ev));
      s.select(ev.siteSlug, ev.id);
      const site = ev.siteSlug ? siteBySlug[ev.siteSlug] : undefined;
      if (site) s.flyTo(site.coords.lat, site.coords.lng, 8);
    }
    setReady(true);
  }, []);

  // ukuran teks: skala rem pada seluruh halaman peta, dipulihkan saat keluar
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.fontSize;
    html.style.fontSize = `${TEXT_PX[textSize]}px`;
    return () => {
      html.style.fontSize = prev;
    };
  }, [textSize]);

  // simpan status di query string (tidak saat memutar, supaya riwayat peramban tidak diganggu)
  useEffect(() => {
    if (!ready || playing) return;
    const id = window.setTimeout(() => {
      const qs = serializeState({ range, mode, filters, showAll, layers, view, ev: evId, site: siteSlug });
      window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    }, 350);
    return () => window.clearTimeout(id);
  }, [ready, playing, range, mode, filters, showAll, layers, view, evId, siteSlug]);

  // memutar waktu: rentang bergerak maju; "otomatis" melambat saat peristiwa padat
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = usePetaStore.getState();
      const { from, to } = s.range;
      const width = to - from;
      let delta: number;
      if (s.speed === "auto") {
        const next = sortedEvents.find((e) => e.siteSlug && axisYear(e) > to + 1e-9 && eventMatches(e, s.filters));
        const gap = (next ? axisYear(next) : END_YEAR) - to;
        // tiap selang antarperistiwa ditempuh sekitar 0,9 detik, jadi padat berarti lambat
        delta = Math.min(gap, (Math.max(gap, 0.02) / 0.9) * dt);
      } else delta = s.speed * dt;
      const newTo = Math.min(END_YEAR, to + delta);
      s.setRange({ from: newTo - width, to: newTo });
      const fired = sortedEvents.filter((e) => e.siteSlug && axisYear(e) > to && axisYear(e) <= newTo && eventMatches(e, s.filters));
      if (fired.length) {
        const slugs = new Set(fired.map((e) => e.siteSlug as string));
        setPulse(slugs);
        window.setTimeout(() => setPulse((p) => (p === slugs ? new Set() : p)), 1900);
      }
      if (newTo >= END_YEAR) s.setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // spasi memutar atau menjeda di mana pun kecuali saat mengetik
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " || e.repeat) return;
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [role='slider'], button, a, summary")) return;
      e.preventDefault();
      usePetaStore.getState().togglePlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pins = useMemo(() => visiblePins(range, filters, showAll), [range, filters, showAll]);
  const events = useMemo(() => eventsInRange(range, filters), [range, filters]);
  const kingdom = hoverKingdom ? kingdoms.find((k) => k.id === hoverKingdom) : undefined;
  const glow = kingdom ? { lat: kingdom.center.lat, lng: kingdom.center.lng, name: kingdom.name } : null;
  const onReady = useCallback((m: MlMap) => {
    mapRef.current = m;
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  };

  const share = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      flash(t.peta.shareCopied);
    } catch {
      window.prompt(t.peta.share, url);
    }
  };

  /** Simpan peta sebagai PNG: kanvas peta, pin digambar ulang, lalu bilah keterangan dengan atribusi tercetak. */
  const saveImage = async () => {
    const m = mapRef.current;
    if (!m) return;
    flash(t.peta.savingImage);
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      m.once("idle", done);
      window.setTimeout(done, 2500);
      m.triggerRepaint();
    });
    const src = m.getCanvas();
    const dpr = src.width / Math.max(1, src.clientWidth);
    const foot = Math.round(52 * dpr);
    const out = document.createElement("canvas");
    out.width = src.width;
    out.height = src.height + foot;
    const g = out.getContext("2d");
    if (!g) return;
    g.drawImage(src, 0, 0);
    for (const p of pins) {
      const px = m.project([p.site.coords.lng, p.site.coords.lat]);
      const r = (p.exists ? 6 + Math.min(5, p.count) : 4) * dpr;
      g.beginPath();
      g.arc(px.x * dpr, px.y * dpr, r + 1.5 * dpr, 0, Math.PI * 2);
      g.fillStyle = "#0d0b09";
      g.fill();
      g.beginPath();
      g.arc(px.x * dpr, px.y * dpr, r, 0, Math.PI * 2);
      g.fillStyle = p.exists ? categoryColor(p.site.category, cvd) : "#8a8a86";
      g.fill();
    }
    g.fillStyle = "#14100c";
    g.fillRect(0, src.height, out.width, foot);
    g.fillStyle = "#f5ecdc";
    g.font = `${Math.round(15 * dpr)}px sans-serif`;
    g.fillText(`SETAPAK · ${t.peta.title} · ${t.peta.rangeLabel(formatYear(range.from, lang), formatYear(range.to, lang))}`, 12 * dpr, src.height + 22 * dpr);
    g.font = `${Math.round(12 * dpr)}px sans-serif`;
    g.fillStyle = "#d9c7a7";
    g.fillText(t.peta.attribution, 12 * dpr, src.height + 42 * dpr);
    out.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const tag = (n: number) => (n < 0 ? `sm${Math.abs(Math.round(n))}` : String(Math.round(n)));
      a.download = `setapak-peta-${tag(range.from)}-${tag(range.to)}.png`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setToast(null);
    }, "image/png");
  };

  const resetView = () => usePetaStore.getState().resetAll();
  const btn = "inline-flex h-9 items-center gap-1.5 rounded-full border border-current/25 bg-[var(--surface)] px-3 text-xs hover:border-[var(--accent)]";

  return (
    <div
      className="peta-root fixed inset-x-0 bottom-0 top-14 z-0 flex overflow-hidden bg-[#14100c] text-[#f5ecdc]"
      style={{ ["--ink" as string]: "#f5ecdc", ["--surface" as string]: "rgba(24,20,16,0.95)" }}
      data-peta
    >
      <aside
        className={cn(
          "peta-noprint hidden shrink-0 flex-col overflow-hidden bg-[var(--surface)] transition-[width,opacity] duration-300 ease-in-out md:flex",
          showFiltersAside
            ? "w-64 opacity-100 border-r border-current/10"
            : "w-0 opacity-0 border-r-0 pointer-events-none"
        )}
        aria-label={t.peta.filters}
        data-lenis-prevent
      >
        <div
          className={cn(
            "w-64 flex flex-col h-full shrink-0 overflow-y-auto transition-[transform,opacity] duration-300 ease-in-out",
            showFiltersAside ? "translate-x-0 opacity-100" : "-translate-x-6 opacity-0"
          )}
        >
          <MapFilters onClose={() => setShowFiltersAside(false)} />
          <details className="mt-auto border-t border-current/10 px-3 py-2">
            <summary className="cursor-pointer select-none font-mono text-[11px] uppercase tracking-widest opacity-80">{t.peta.siteList}</summary>
            <ul className="mt-2 max-h-64 space-y-0.5 overflow-y-auto">
              {pins.map((p) => (
                <li key={p.site.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      usePetaStore.getState().select(p.site.slug);
                      usePetaStore.getState().flyTo(p.site.coords.lat, p.site.coords.lng, 8);
                    }}
                    className="w-full rounded px-1.5 py-1 text-left text-xs hover:bg-current/10"
                  >
                    {localizeSite(p.site, lang).name}
                    <span className="opacity-60"> · {p.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
          {ready && <NusantaraMap pins={pins} toYear={range.to} pulse={pulse} glow={glow} onReady={onReady} />}
          <div className="peta-noprint pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-6rem)] flex-wrap items-start gap-2">
            <div className="pointer-events-auto w-[min(320px,70vw)]">
              <SearchBox />
            </div>
            <div className="pointer-events-auto flex flex-wrap gap-1.5">
              <button
                type="button"
                className={cn(
                  btn,
                  (showFiltersAside || sheet === "filters") && "border-[var(--accent)] text-[var(--accent)] font-medium"
                )}
                onClick={toggleFilters}
                aria-label={t.peta.filters}
                title={showFiltersAside ? "Sembunyikan panel filter" : "Buka panel filter"}
              >
                <Filter className="h-4 w-4" aria-hidden />
                <span>{t.peta.filters}</span>
              </button>
              <button
                type="button"
                className={cn(
                  btn,
                  (showEventsAside || sheet === "list") && "border-[var(--accent)] text-[var(--accent)] font-medium"
                )}
                onClick={toggleEvents}
                aria-label={`${events.length} ${t.peta.openList}`}
                title={showEventsAside ? "Sembunyikan daftar peristiwa" : "Buka daftar peristiwa"}
              >
                <ListOrdered className="h-4 w-4" aria-hidden />
                <span>{events.length}</span>
                <span className="hidden sm:inline">{t.peta.openList}</span>
              </button>
              <button type="button" className={btn} onClick={share} title={t.peta.share}>
                <Link2 className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">{t.peta.share}</span>
              </button>
              <button type="button" className={btn} onClick={saveImage} title={t.peta.saveImage} aria-label={t.peta.saveImage}>
                <Camera className="h-4 w-4" aria-hidden />
              </button>
              <button type="button" className={cn(btn, "max-sm:hidden")} onClick={() => window.print()} title={t.peta.print} aria-label={t.peta.print}>
                <Printer className="h-4 w-4" aria-hidden />
              </button>
              <button type="button" className={btn} onClick={resetView} title={t.peta.resetView} aria-label={t.peta.resetView}>
                <RotateCcw className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex flex-col justify-end pb-3 pt-[7.5rem] md:pt-16">
            <SiteCard />
          </div>
          {toast && (
            <p className="absolute left-1/2 top-16 z-20 -translate-x-1/2 rounded-full bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-[#0d0b09]" role="status">
              {toast}
            </p>
          )}
          <p className="peta-print-note hidden">{t.peta.printNote}</p>
        </div>
        <div className="peta-noprint shrink-0 max-h-[48vh] overflow-x-hidden overflow-y-auto border-t border-current/10 bg-[var(--surface)] px-3 py-2.5 md:px-4" data-lenis-prevent>
          <TimeAxis filters={filters} />
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
              timeAxisCollapsed
                ? "grid-rows-[0fr] opacity-0 pointer-events-none"
                : "grid-rows-[1fr] opacity-60"
            )}
            style={{
              gridTemplateRows: timeAxisCollapsed ? "0fr" : "1fr",
            }}
          >
            <div className="min-h-0 overflow-hidden">
              <p className="pt-2 text-[10px]">{t.peta.attribution}</p>
            </div>
          </div>
        </div>
      </main>

      <aside
        className={cn(
          "peta-noprint hidden shrink-0 flex-col overflow-hidden bg-[var(--surface)] transition-[width,opacity] duration-300 ease-in-out lg:flex",
          showEventsAside
            ? "w-[340px] opacity-100 border-l border-current/10"
            : "w-0 opacity-0 border-l-0 pointer-events-none"
        )}
        aria-label={t.peta.list}
      >
        <div
          className={cn(
            "w-[340px] flex flex-col h-full shrink-0 transition-[transform,opacity] duration-300 ease-in-out",
            showEventsAside ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0"
          )}
        >
          <RangeEventList events={events} onClose={() => setShowEventsAside(false)} />
        </div>
      </aside>

      {/* lembar bawah di layar kecil */}
      {sheet !== "none" && (
        <div className="peta-noprint fixed inset-x-0 bottom-0 z-40 flex max-h-[72vh] flex-col rounded-t-3xl border-t border-current/15 bg-[var(--surface)] shadow-2xl" role="dialog" aria-label={sheet === "filters" ? t.peta.filters : t.peta.list} data-lenis-prevent>
          <div className="flex items-center justify-between px-4 pt-2.5">
            <span className="mx-auto h-1 w-10 rounded-full bg-current/25" aria-hidden />
            <button type="button" onClick={() => setSheet("none")} className="absolute right-2 top-1.5 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-current/10" aria-label={t.peta.closeSheet}>
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{sheet === "filters" ? <MapFilters /> : <RangeEventList events={events} />}</div>
        </div>
      )}

      <DetailDrawer />
      <TraceDrawer />
    </div>
  );
}
