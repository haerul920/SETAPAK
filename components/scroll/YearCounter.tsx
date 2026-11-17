"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { eras, sortedEvents } from "@/data";
import { localizeEra, localizeEvent } from "@/lib/i18n";
import { eraAtYear, type TimelineLayout } from "@/lib/layout";
import { scrollStore, useSetapakStore } from "@/lib/store";
import { formatYear, groupDigits, monthOf, segmentAt, yearParts, type YearParts } from "@/lib/time-scale";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { atmosphereStore } from "@/components/atmosphere/Background";
import { JumpToYear } from "./JumpToYear";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** Struktur tampilan angka: hanya berubah saat jenis format atau jumlah digit berubah. */
function structureOf(p: YearParts, lang: "id" | "en"): string {
  const num = p.kind === "year" ? String(p.value) : groupDigits(p.value, lang);
  return `${p.prefix}|${num.replace(/\d/g, "9")}|${p.suffix}`;
}

/**
 * Penghitung tahun model odometer (docs/SCROLL_ENGINE.md bagian 3).
 * Angka diperbarui per frame langsung ke DOM (transform per kolom digit), tanpa render React.
 */
export function YearCounter({ layout }: { layout: TimelineLayout }) {
  const { t, lang } = useCopy();
  const activeClusterId = useSetapakStore((s) => s.activeClusterId);
  const [structure, setStructure] = useState(() => structureOf(yearParts(scrollStore.getState().year, lang), lang));
  const [jumpOpen, setJumpOpen] = useState(false);
  const columns = useRef<(HTMLSpanElement | null)[]>([]);
  const ghost = useRef<HTMLDivElement>(null);
  const speed = useRef<HTMLDivElement>(null);
  const moodRef = useRef<HTMLSpanElement>(null);
  const monthRef = useRef<HTMLSpanElement>(null);
  const srRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const holdRef = useRef(false);
  holdRef.current = activeClusterId !== null;
  const structureRef = useRef(structure);
  structureRef.current = structure;

  const [prefix, pattern, suffix] = structure.split("|");

  const cluster = useMemo(() => layout.clusters.find((c) => c.id === activeClusterId) ?? null, [layout, activeClusterId]);
  const clusterLabel = cluster
    ? [...new Set(cluster.events.map((e) => localizeEvent(e.event, lang).dateLabel))].join(" · ")
    : "";

  useEffect(() => {
    let lastMood = "";
    let lastMonth = "";
    let lastSr = "";
    let lastSrAt = 0;
    let srTimer: ReturnType<typeof setTimeout> | null = null;
    const apply = () => {
      const { year, velocity } = scrollStore.getState();
      const p = yearParts(year, lang);
      const s = structureOf(p, lang);
      if (s !== structureRef.current) {
        setStructure(s);
        return;
      }
      const num = p.kind === "year" ? String(p.value) : groupDigits(p.value, lang);
      const digits = num.replace(/\D/g, "");
      for (let i = 0; i < digits.length; i++) {
        const col = columns.current[i];
        if (col) col.style.transform = `translate3d(0, ${-Number(digits[i]) * 10}%, 0)`;
      }
      // efek percepatan waktu: garis kecepatan dan bayangan digit (hanya opacity/transform)
      const v = Math.min(1, Math.abs(velocity) / 6000);
      if (speed.current) speed.current.style.opacity = String(v > 0.15 ? v : 0);
      if (ghost.current) {
        ghost.current.style.opacity = String(v > 0.25 ? v * 0.5 : 0);
        ghost.current.style.transform = `translate3d(0, ${Math.sign(velocity) * -6 * v}px, 0)`;
      }
      const era = eras.find((e) => e.id === eraAtYear(sortedEvents, year));
      const mood = era ? localizeEra(era, lang).name : "";
      if (mood !== lastMood && moodRef.current) {
        moodRef.current.textContent = mood;
        lastMood = mood;
      }
      // nama bulan di segmen F saat guliran lambat
      // (tidak saat klaster ditahan: tahun klaster bukan tanggal bulan)
      const month = segmentAt(year).id === "F" && Math.abs(velocity) < 900 && year < 2026 && !holdRef.current ? monthOf(year, lang) : "";
      if (month !== lastMonth && monthRef.current) {
        monthRef.current.textContent = month;
        monthRef.current.style.opacity = month ? "1" : "0";
        lastMonth = month;
      }
      // pembaca layar: perbarui paling sering tiap 1,5 detik, dengan pembaruan akhir saat berhenti
      const sr = formatYear(year, lang);
      if (sr !== lastSr) {
        const wait = Math.max(0, 1500 - (performance.now() - lastSrAt));
        if (srTimer) clearTimeout(srTimer);
        srTimer = setTimeout(() => {
          const final = formatYear(scrollStore.getState().year, lang);
          if (srRef.current) srRef.current.textContent = final;
          buttonRef.current?.setAttribute("aria-label", t.scroll.counterLabel(final));
          lastSr = final;
          lastSrAt = performance.now();
        }, wait);
      }
    };
    apply();
    const unsub = scrollStore.subscribe(apply);
    return () => {
      unsub();
      if (srTimer) clearTimeout(srTimer);
    };
  }, [lang, structure, t]);

  // scrim menyatu dengan warna latar saat ini
  useEffect(() => {
    const apply = () => {
      const { top } = atmosphereStore.getState();
      if (scrimRef.current) scrimRef.current.style.setProperty("--bg-top", top);
    };
    apply();
    return atmosphereStore.subscribe(apply);
  }, []);

  let digitIndex = 0;
  const chars = pattern.split("");

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center pt-14 md:pt-3">
      <div ref={scrimRef} className="counter-scrim pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 md:h-44" aria-hidden />
      <div className="pointer-events-auto relative flex flex-col items-center">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setJumpOpen((o) => !o)}
          aria-expanded={jumpOpen}
          aria-label={t.scroll.counterLabel(formatYear(scrollStore.getState().year, lang))}
          className="counter-ink group relative flex items-baseline gap-0 overflow-hidden rounded-xl px-3 py-1 font-display font-semibold leading-none tracking-tight transition-colors hover:bg-white/5"
        >
          <span className="text-[13px] md:text-xl">{prefix}</span>
          <span className="relative flex text-[26px] tabular-nums md:text-[44px]" aria-hidden>
            {chars.map((ch, i) => {
              if (ch !== "9") return <span key={`s${i}`}>{ch}</span>;
              const idx = digitIndex++;
              return (
                <span key={`d${i}`} className="relative inline-block h-[1em] w-[0.62em] overflow-hidden">
                  <span
                    ref={(el) => {
                      columns.current[idx] = el;
                    }}
                    className="absolute inset-x-0 top-0 flex flex-col will-change-transform"
                    style={{ height: "1000%" }}
                  >
                    {DIGITS.map((d) => (
                      <span key={d} className="flex h-[10%] items-center justify-center">
                        {d}
                      </span>
                    ))}
                  </span>
                </span>
              );
            })}
            <div ref={ghost} className="pointer-events-none absolute inset-0 opacity-0 mix-blend-screen" aria-hidden>
              <div className="h-full w-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            </div>
          </span>
          <span className="text-[13px] md:text-xl">{suffix}</span>
          <div ref={speed} className="speed-lines pointer-events-none absolute inset-0 opacity-0" aria-hidden />
        </button>
        <span className="sr-only" aria-live="polite" ref={srRef} />
        <div className="counter-sub mt-1 flex min-h-[1.25rem] items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] md:text-[11px]">
          <span ref={moodRef} />
          <span ref={monthRef} className="text-[var(--accent)] opacity-0 transition-opacity" />
        </div>
        <div
          className={cn(
            "counter-sub mt-0.5 max-w-[80vw] truncate text-center font-mono text-[11px] tracking-wider text-[var(--accent)] transition-opacity duration-300 md:text-xs",
            clusterLabel ? "opacity-100" : "opacity-0"
          )}
          aria-live="polite"
        >
          {clusterLabel.toUpperCase()}
        </div>
        {jumpOpen && <JumpToYear onClose={() => setJumpOpen(false)} />}
      </div>
    </div>
  );
}
