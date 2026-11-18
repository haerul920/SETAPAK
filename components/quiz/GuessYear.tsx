"use client";

import { useMemo, useRef, useState } from "react";
import { localizeEvent } from "@/lib/i18n";
import { imagesFor } from "@/lib/media";
import { evaluate, quizEvent, quizSite, type Result, type YearQ } from "@/lib/quiz";
import { compactTick } from "@/components/map/TimeAxis";
import { createTimeScale, END_YEAR, formatYear } from "@/lib/time-scale";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { Feedback, QuizPhoto } from "./shared";

const scale = createTimeScale();
const posToYear = (p: number) => scale.yToYear(Math.min(1, Math.max(0, p)) * scale.total);
const yearToPos = (y: number) => scale.yearToY(y) / scale.total;
const TICK_CANDIDATES = [-1_000_000, -100_000, -10_000, -1_000, 0, 700, 1500, 1800, 1945, 2026];
/** Tick yang dipertahankan: jarak antarposisi cukup lebar supaya label tidak bertumpuk. */
const TICKS = TICK_CANDIDATES.reduce<number[]>((kept, y) => {
  const last = kept[kept.length - 1];
  if (last === undefined || yearToPos(y) - yearToPos(last) >= 0.22) kept.push(y);
  return kept;
}, []);

/**
 * Tebak Tahun (docs/KUIS.md, mode 1): foto dan judul, lalu geser penanda pada sumbu waktu dengan skala
 * bertingkat yang sama dengan guliran. Setelah dikunci, posisi benar dan pita toleransinya diperlihatkan
 * dengan animasi, dan skor dihitung dari selisih dalam piksel guliran.
 */
export function GuessYear({ q, onResult, result }: { q: YearQ; onResult: (guess: number, r: Result) => void; result: Result | null }) {
  const { t, lang } = useCopy();
  const ev = quizEvent(q.eventId)!;
  const loc = localizeEvent(ev, lang);
  const media = useMemo(() => imagesFor(ev.siteSlug ?? "", ["hero", "gallery", "now"]).find((m) => m.id === q.mediaId), [ev.siteSlug, q.mediaId]);
  const [pos, setPos] = useState(0.5);
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const locked = result !== null;
  const guess = posToYear(pos);
  const answerPos = yearToPos(q.answer);
  const tolPos = Math.abs(yearToPos(q.answer + q.tolerance) - answerPos);
  const siteName = ev.siteSlug ? quizSite(ev.siteSlug)?.name : undefined;

  const setFromPointer = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    setPos(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
  };

  return (
    <div className="space-y-4">
      <QuizPhoto media={media} />
      <div>
        <h2 className="font-display text-2xl font-semibold leading-snug">{loc.title}</h2>
        {siteName && <p className="text-sm opacity-70">{siteName}</p>}
        <p className="mt-2 text-sm opacity-85">{t.quiz.prompts.year}</p>
      </div>

      <div className="select-none rounded-2xl border border-current/15 bg-black/20 px-4 pb-6 pt-4">
        <p className="mb-3 text-center font-display text-3xl font-semibold tabular-nums" aria-live="polite">
          {formatYear(guess, lang)}
        </p>
        <div
          ref={track}
          className="relative h-12 touch-none"
          onPointerDown={(e) => {
            if (locked) return;
            dragging.current = true;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            setFromPointer(e.clientX);
          }}
          onPointerMove={(e) => dragging.current && !locked && setFromPointer(e.clientX)}
          onPointerUp={() => (dragging.current = false)}
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-current/25" aria-hidden />
          {TICKS.map((y) => (
            <span key={y} className="pointer-events-none absolute top-1/2 mt-4 whitespace-nowrap font-mono text-[10px] opacity-60" style={{ left: `${yearToPos(y) * 100}%`, transform: `translateX(${yearToPos(y) < 0.06 ? "0" : yearToPos(y) > 0.94 ? "-100%" : "-50%"})` }}>
              {y >= END_YEAR ? "2026" : compactTick(y, lang)}
            </span>
          ))}
          {locked && (
            <>
              <span className="absolute top-1/2 h-5 -translate-y-1/2 rounded bg-verified/35 ring-1 ring-verified/70" style={{ left: `${(answerPos - tolPos) * 100}%`, width: `${Math.max(0.6, tolPos * 200)}%` }} aria-hidden />
              <span className="quiz-answer-pin absolute top-1/2 h-8 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-verified" style={{ left: `${answerPos * 100}%` }} aria-hidden />
            </>
          )}
          <button
            type="button"
            role="slider"
            aria-label={t.quiz.yearSlider}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pos * 100)}
            aria-valuetext={formatYear(guess, lang)}
            disabled={locked}
            className={cn("absolute top-1/2 h-9 w-4 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-md border-2 border-[#0d0b09] bg-[var(--accent)] shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-white", locked && "opacity-70")}
            style={{ left: `${pos * 100}%` }}
            onKeyDown={(e) => {
              const big = e.shiftKey ? 0.03 : 0.004;
              if (e.key === "ArrowRight" || e.key === "ArrowUp") setPos((p) => Math.min(1, p + big));
              else if (e.key === "ArrowLeft" || e.key === "ArrowDown") setPos((p) => Math.max(0, p - big));
              else if (e.key === "Home") setPos(0);
              else if (e.key === "End") setPos(1);
              else if (e.key === "Enter" && !locked) onResult(guess, evaluate(q, guess));
              else return;
              e.preventDefault();
            }}
          />
        </div>
      </div>

      {!locked ? (
        <button type="button" onClick={() => onResult(guess, evaluate(q, guess))} className="rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-[#0d0b09]">
          {t.quiz.lock}
        </button>
      ) : (
        <Feedback
          result={result}
          event={ev}
          extra={
            <>
              <p>{t.quiz.yearGuess(formatYear(guess, lang))}</p>
              <p>{t.quiz.yearAnswer(loc.dateLabel)}</p>
              <p className="opacity-80">{result.yearsOff !== undefined && result.yearsOff > q.tolerance ? t.quiz.yearsOff(Math.round(result.yearsOff).toLocaleString(lang === "id" ? "id-ID" : "en-US")) : t.quiz.exact}</p>
            </>
          }
        />
      )}
    </div>
  );
}
