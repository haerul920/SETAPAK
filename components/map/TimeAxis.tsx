"use client";

import { ChevronDown, Pause, Play, RotateCcw } from "lucide-react";
import { useMemo, useRef } from "react";
import { EMPTY_FILTERS, histogram, type Filters } from "@/lib/peta-data";
import { usePetaStore } from "@/lib/peta-store";
import { AXIS_MODES, ERA_PRESETS, keyStep, normalizeRange, PLAY_SPEEDS, posToYear, yearToPos, type AxisMode } from "@/lib/peta-time";
import { END_YEAR, formatYear, groupDigits, tickLabel, yearParts } from "@/lib/time-scale";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { KingdomBands } from "./KingdomBands";

const BINS = 120;
/** Setengah lebar jendela mode "satu titik" dalam satuan posisi sumbu. */
const POINT_HALF = 0.004;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Tahun yang dibulatkan enak dibaca untuk label sumbu. */
function niceYear(year: number): number {
  const ago = END_YEAR - year;
  if (ago > 10_000) {
    const mag = 10 ** Math.floor(Math.log10(ago) - 1);
    return END_YEAR - Math.round(ago / mag) * mag;
  }
  if (year < 1500) return Math.round(year / 50) * 50;
  return Math.round(year / 5) * 5;
}

/** Label sumbu ringkas: "1,65 jt th lalu", "280 rb th lalu", "5.000 SM", "1945". */
export function compactTick(year: number, lang: "id" | "en"): string {
  const ago = END_YEAR - year;
  if (ago >= 1_000_000) return `${(ago / 1_000_000).toFixed(2).replace(/\.?0+$/, "").replace(".", lang === "id" ? "," : ".")} ${lang === "id" ? "jt th lalu" : "M yrs ago"}`;
  if (ago >= 10_000) return `${Math.round(ago / 1000)} ${lang === "id" ? "rb th lalu" : "k yrs ago"}`;
  return tickLabel(year, lang);
}

/** Format rentang waktu yang ringkas dan bebas repetisi ("1.650.000 – 762.933 TAHUN LALU"). */
function formatRangeDisplay(from: number, to: number, lang: "id" | "en"): string {
  const pFrom = yearParts(from, lang);
  const pTo = yearParts(to, lang);

  if (pFrom.kind === "ago" && pTo.kind === "ago") {
    return `${groupDigits(pFrom.value, lang)} – ${groupDigits(pTo.value, lang)}${pTo.suffix}`;
  }
  if (pFrom.kind === "bce" && pTo.kind === "bce") {
    return `${groupDigits(pFrom.value, lang)} – ${groupDigits(pTo.value, lang)}${pTo.suffix}`;
  }
  if (pFrom.kind === "year" && pTo.kind === "year") {
    return `${pFrom.value} – ${pTo.value}`;
  }

  const a = formatYear(from, lang);
  const b = formatYear(to, lang);
  return lang === "id" ? `${a} sampai ${b}` : `${a} to ${b}`;
}

/**
 * Sumbu waktu (docs/PETA_WAKTU.md bagian 2): dua pegangan untuk rentang atau satu titik, bagian
 * tengah diseret untuk menggeser, histogram kepadatan, skala Linear/Logaritmik/Seperti guliran,
 * tombol putar dengan kecepatan, pintasan masa, dan pita kerajaan di bawahnya.
 */
export function TimeAxis({ filters = EMPTY_FILTERS }: { filters?: Filters }) {
  const { t, lang } = useCopy();
  const range = usePetaStore((s) => s.range);
  const mode = usePetaStore((s) => s.mode);
  const point = usePetaStore((s) => s.point);
  const playing = usePetaStore((s) => s.playing);
  const speed = usePetaStore((s) => s.speed);
  const setRange = usePetaStore((s) => s.setRange);
  const setMode = usePetaStore((s) => s.setMode);
  const setPoint = usePetaStore((s) => s.setPoint);
  const setPlaying = usePetaStore((s) => s.setPlaying);
  const setSpeed = usePetaStore((s) => s.setSpeed);
  const timeAxisCollapsed = usePetaStore((s) => s.timeAxisCollapsed);
  const setTimeAxisCollapsed = usePetaStore((s) => s.setTimeAxisCollapsed);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ kind: "from" | "to" | "mid" | "point"; start: number; from: number; to: number } | null>(null);

  const pFrom = yearToPos(mode, range.from);
  const pTo = yearToPos(mode, range.to);
  const pMid = (pFrom + pTo) / 2;
  const bins = useMemo(() => histogram((y) => yearToPos(mode, y), BINS, filters), [mode, filters]);
  const maxBin = Math.max(1, ...bins);
  const ticks = useMemo(() => [0, 0.2, 0.4, 0.6, 0.8, 1].map((p) => ({ p, year: p === 1 ? END_YEAR : niceYear(posToYear(mode, p)) })), [mode]);

  const posOf = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return clamp01((clientX - r.left) / r.width);
  };
  const apply = (from: number, to: number) => {
    const a = Math.min(from, to);
    const b = Math.max(from, to);
    setRange(normalizeRange({ from: posToYear(mode, a), to: posToYear(mode, b) }));
  };
  const applyPoint = (p: number) => {
    const c = Math.min(1 - POINT_HALF, Math.max(POINT_HALF, p));
    apply(c - POINT_HALF, c + POINT_HALF);
  };

  const begin = (kind: "from" | "to" | "mid" | "point") => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { kind, start: posOf(e.clientX), from: pFrom, to: pTo };
    if (usePetaStore.getState().playing) setPlaying(false);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = posOf(e.clientX);
    if (d.kind === "from") apply(Math.min(p, d.to), d.to);
    else if (d.kind === "to") apply(d.from, Math.max(p, d.from));
    else if (d.kind === "point") applyPoint(p);
    else {
      const delta = p - d.start;
      const w = d.to - d.from;
      const a = Math.min(1 - w, Math.max(0, d.from + delta));
      apply(a, a + w);
    }
  };
  const end = () => {
    drag.current = null;
  };
  const trackDown = (e: React.PointerEvent) => {
    const p = posOf(e.clientX);
    if (point) return applyPoint(p);
    // klik di trek: pegangan terdekat pindah ke titik itu
    if (Math.abs(p - pFrom) <= Math.abs(p - pTo)) apply(Math.min(p, pTo), pTo);
    else apply(pFrom, Math.max(p, pFrom));
  };

  const nudge = (which: "from" | "to" | "point") => (e: React.KeyboardEvent) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      usePetaStore.getState().togglePlay();
      return;
    }
    if (!dir) return;
    e.preventDefault();
    const base = which === "to" ? range.to : which === "from" ? range.from : (range.from + range.to) / 2;
    const step = keyStep(mode, base, e.shiftKey) * (e.shiftKey ? 10 : 1);
    const next = base + dir * step;
    if (which === "point") {
      applyPoint(yearToPos(mode, next));
    } else if (which === "from") setRange(normalizeRange({ from: Math.min(next, range.to), to: range.to }));
    else setRange(normalizeRange({ from: range.from, to: Math.max(next, range.from) }));
  };

  const label = point ? formatYear((range.from + range.to) / 2, lang) : formatRangeDisplay(range.from, range.to, lang);
  const modeLabel: Record<AxisMode, string> = { log: t.peta.axisLog, linear: t.peta.axisLinear, scroll: t.peta.axisScroll };
  const handleClass = "absolute top-1/2 z-10 h-7 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none rounded-md border-2 border-[#0d0b09] bg-[var(--accent)] shadow-md outline-none focus-visible:ring-2 focus-visible:ring-white";

  return (
    <section aria-label={t.peta.axis}>
      <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-2.5 md:gap-x-3 gap-y-2">
        <button
          type="button"
          onClick={() => usePetaStore.getState().togglePlay()}
          aria-pressed={playing}
          aria-label={playing ? t.peta.pause : t.peta.play}
          title={`${playing ? t.peta.pause : t.peta.play} (spasi)`}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-[#0d0b09]"
        >
          {playing ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            const s = usePetaStore.getState();
            const w = s.range.to - s.range.from;
            setRange({ from: -1_650_000 + 2026, to: -1_650_000 + 2026 + Math.max(w, 1) });
          }}
          aria-label={t.peta.restart}
          title={t.peta.restart}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-current/25"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
        </button>
        <label className="flex items-center gap-1.5 text-xs">
          <span className="opacity-75">{t.peta.speed}</span>
          <select value={String(speed)} onChange={(e) => setSpeed(e.target.value === "auto" ? "auto" : (Number(e.target.value) as (typeof PLAY_SPEEDS)[number]))} className="rounded-md border border-current/25 bg-transparent px-1.5 py-1 text-xs">
            {PLAY_SPEEDS.map((v) => (
              <option key={String(v)} value={String(v)} className="text-black">
                {t.peta.speedUnit(v)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex overflow-hidden rounded-full border border-current/25 text-xs" role="radiogroup" aria-label={t.peta.axis}>
          {AXIS_MODES.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={cn("px-2.5 py-1.5", mode === m ? "bg-[var(--accent)] text-[#0d0b09]" : "opacity-80 hover:opacity-100")}>
              {modeLabel[m]}
            </button>
          ))}
        </div>
        <div className="flex overflow-hidden rounded-full border border-current/25 text-xs" role="radiogroup" aria-label={`${t.peta.rangeMode} / ${t.peta.pointMode}`}>
          {[false, true].map((p) => (
            <button
              key={String(p)}
              type="button"
              role="radio"
              aria-checked={point === p}
              onClick={() => {
                setPoint(p);
                if (p) applyPoint(pMid);
              }}
              className={cn("px-2.5 py-1.5", point === p ? "bg-[var(--accent)] text-[#0d0b09]" : "opacity-80 hover:opacity-100")}
            >
              {p ? t.peta.pointMode : t.peta.rangeMode}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <p className="font-display text-sm sm:text-base lg:text-lg font-semibold tabular-nums whitespace-nowrap" aria-live="polite" data-peta-range>
            {label}
          </p>
          <button
            type="button"
            onClick={() => setTimeAxisCollapsed(!timeAxisCollapsed)}
            aria-expanded={!timeAxisCollapsed}
            aria-label={timeAxisCollapsed ? "Tampilkan slider waktu" : "Sembunyikan slider waktu"}
            title={timeAxisCollapsed ? "Buka slider waktu" : "Sembunyikan slider waktu"}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current/25 hover:border-[var(--accent)] hover:bg-current/10 transition-colors"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-300 ease-in-out",
                timeAxisCollapsed ? "rotate-180 text-[var(--accent)]" : "rotate-0 opacity-75"
              )}
              aria-hidden
            />
          </button>
        </div>
      </div>

      {/* Mini Progress Bar saat slider disembunyikan */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
          timeAxisCollapsed
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0 pointer-events-none"
        )}
        style={{
          gridTemplateRows: timeAxisCollapsed ? "1fr" : "0fr",
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pt-2 pb-0.5">
            <div
              role="progressbar"
              aria-valuenow={Math.round((range.from + range.to) / 2)}
              aria-valuemin={-1_647_974}
              aria-valuemax={END_YEAR}
              onClick={() => setTimeAxisCollapsed(false)}
              title="Klik untuk membuka slider lengkap"
              className="group relative h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-white/10 hover:bg-white/15 transition-colors"
            >
              <div
                className="absolute h-full rounded-full bg-[var(--accent)] transition-all duration-100 group-hover:brightness-110"
                style={{
                  left: `${pFrom * 100}%`,
                  width: `${Math.max(1, (pTo - pFrom) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Area Slider Lengkap (Preset Era + Histogram & Penggeser Waktu) */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
          timeAxisCollapsed
            ? "grid-rows-[0fr] opacity-0 pointer-events-none"
            : "grid-rows-[1fr] opacity-100"
        )}
        style={{
          gridTemplateRows: timeAxisCollapsed ? "0fr" : "1fr",
        }}
        aria-hidden={timeAxisCollapsed}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-2 pt-2">
            <div className="flex flex-wrap items-center gap-1.5" aria-label={t.peta.presets} role="group">
              {ERA_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  tabIndex={timeAxisCollapsed ? -1 : 0}
                  onClick={() => {
                    setPoint(false);
                    setRange(normalizeRange({ from: p.from, to: p.to }));
                  }}
                  className="rounded-full border border-current/25 px-2.5 py-1 text-xs hover:border-[var(--accent)]"
                >
                  {p.id_}
                </button>
              ))}
            </div>

            <div ref={track} className="relative h-16 select-none" onPointerDown={trackDown} data-peta-axis>
              <svg className="pointer-events-none absolute inset-x-0 top-0 h-10 w-full" viewBox={`0 0 ${BINS} 40`} preserveAspectRatio="none" aria-hidden>
                {bins.map((v, i) => (v > 0 ? <rect key={i} x={i + 0.1} width={0.8} y={40 - Math.max(2, (v / maxBin) * 38)} height={Math.max(2, (v / maxBin) * 38)} fill="currentColor" opacity={0.45} /> : null))}
              </svg>
              <div className="absolute inset-x-0 top-10 h-0.5 -translate-y-1/2 bg-current opacity-30" aria-hidden />
              {/* area terpilih: seret untuk menggeser rentang */}
              {!point && (
                <div
                  className="absolute top-10 h-5 -translate-y-1/2 cursor-grab rounded-md bg-[var(--accent)]/30 ring-1 ring-[var(--accent)]/70 active:cursor-grabbing"
                  style={{ left: `${pFrom * 100}%`, width: `${Math.max(0.4, (pTo - pFrom) * 100)}%` }}
                  onPointerDown={begin("mid")}
                  onPointerMove={move}
                  onPointerUp={end}
                  aria-hidden
                />
              )}
              {point ? (
                <button
                  type="button"
                  role="slider"
                  tabIndex={timeAxisCollapsed ? -1 : 0}
                  aria-label={t.peta.handlePoint}
                  aria-valuemin={-1_647_974}
                  aria-valuemax={END_YEAR}
                  aria-valuenow={Math.round((range.from + range.to) / 2)}
                  aria-valuetext={formatYear((range.from + range.to) / 2, lang)}
                  className={handleClass}
                  style={{ left: `${pMid * 100}%`, top: "2.5rem" }}
                  onPointerDown={begin("point")}
                  onPointerMove={move}
                  onPointerUp={end}
                  onKeyDown={nudge("point")}
                />
              ) : (
                <>
                  <button
                    type="button"
                    role="slider"
                    tabIndex={timeAxisCollapsed ? -1 : 0}
                    aria-label={t.peta.handleFrom}
                    aria-valuemin={-1_647_974}
                    aria-valuemax={END_YEAR}
                    aria-valuenow={Math.round(range.from)}
                    aria-valuetext={formatYear(range.from, lang)}
                    className={handleClass}
                    style={{ left: `${pFrom * 100}%`, top: "2.5rem" }}
                    onPointerDown={begin("from")}
                    onPointerMove={move}
                    onPointerUp={end}
                    onKeyDown={nudge("from")}
                  />
                  <button
                    type="button"
                    role="slider"
                    tabIndex={timeAxisCollapsed ? -1 : 0}
                    aria-label={t.peta.handleTo}
                    aria-valuemin={-1_647_974}
                    aria-valuemax={END_YEAR}
                    aria-valuenow={Math.round(range.to)}
                    aria-valuetext={formatYear(range.to, lang)}
                    className={handleClass}
                    style={{ left: `${pTo * 100}%`, top: "2.5rem" }}
                    onPointerDown={begin("to")}
                    onPointerMove={move}
                    onPointerUp={end}
                    onKeyDown={nudge("to")}
                  />
                </>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4" aria-hidden>
                {ticks.map(({ p, year }) => (
                  <span key={p} className={cn("absolute -translate-x-1/2 whitespace-nowrap font-mono text-[10px] opacity-70", (p === 0.2 || p === 0.6) && "max-sm:hidden")} style={{ left: `${p * 100}%`, transform: p === 0 ? "none" : p === 1 ? "translateX(-100%)" : "translateX(-50%)" }}>
                    {compactTick(year, lang)}
                  </span>
                ))}
              </div>
            </div>
            <p className="sr-only">{t.peta.axisHint}</p>
          </div>
        </div>
      </div>

      {/* <div>
        <p className="mb-1 font-mono text-[10px] uppercase tracking-widest opacity-70">
          {t.peta.kingdoms} · {t.peta.kingdomsApprox}
        </p>
        <KingdomBands mode={mode} />
      </div> */}
    </section>
  );
}
