"use client";

import { AnimatePresence, motion } from "motion/react";
import { Flame } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { localizeEvent, localizeSite } from "@/lib/i18n";
import {
  adaptStep,
  initialAdapt,
  makeQuestion,
  quizEvent,
  quizSite,
  seedFrom,
  type Answer,
  type Level,
  type LevelChoice,
  type Question,
  type QuestionMode,
  type QuizMode,
  type Result,
  type Verdict,
  type YearRange,
} from "@/lib/quiz";
import { rng } from "@/lib/scene-shapes";
import { playSfx } from "@/lib/sfx";
import { useQuizStore } from "@/lib/quiz-store";
import { isMotionReduced } from "@/lib/store";
import { formatYear } from "@/lib/time-scale";
import { traces } from "@/lib/traces";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { FactOrDebate } from "./FactOrDebate";
import { GuessYear } from "./GuessYear";
import { SortEvents } from "./SortEvents";
import { VERDICT_STYLE, VerdictIcon } from "./shared";
import { WhereIsThis } from "./WhereIsThis";
import { WhichSite } from "./WhichSite";

export const SESSION_LENGTH = 8;

export interface Played {
  q: Question;
  answer: Answer;
  result: Result;
}

/** Ringkasan jawaban benar satu soal, untuk daftar "yang masih perlu diingat". */
export function describeAnswer(q: Question, lang: "id" | "en"): string {
  switch (q.mode) {
    case "tebak-tahun": {
      const ev = quizEvent(q.eventId)!;
      return `${localizeEvent(ev, lang).title}: ${localizeEvent(ev, lang).dateLabel}`;
    }
    case "urutkan":
      return q.answer.map((id) => `${localizeEvent(quizEvent(id)!, lang).dateLabel} ${localizeEvent(quizEvent(id)!, lang).title}`).join(" → ");
    case "di-mana": {
      const s = q.siteSlug ? quizSite(q.siteSlug) : undefined;
      const tr = q.traceId ? traces.find((x) => x.id === q.traceId) : undefined;
      return s ? localizeSite(s, lang).name : tr ? tr.name : "";
    }
    case "situs-mana": {
      const s = quizSite(q.answer);
      return s ? localizeSite(s, lang).name : q.answer;
    }
    case "fakta": {
      const ev = quizEvent(q.eventId)!;
      return `${localizeEvent(ev, lang).title}: ${q.answer === "disepakati" ? "disepakati" : "diperdebatkan"}`;
    }
  }
}

export function describeGiven(q: Question, a: Answer, lang: "id" | "en"): string {
  switch (q.mode) {
    case "tebak-tahun":
      return formatYear(a as number, lang);
    case "urutkan":
      return (a as string[]).map((id) => localizeEvent(quizEvent(id)!, lang).title).join(" → ");
    case "di-mana":
      return `${(a as { lat: number; lng: number }).lat.toFixed(2)}, ${(a as { lat: number; lng: number }).lng.toFixed(2)}`;
    case "situs-mana": {
      const s = quizSite(a as string);
      return s ? localizeSite(s, lang).name : String(a);
    }
    case "fakta":
      return String(a);
  }
}

/**
 * Satu sesi kuis: soal demi soal dengan transisi halus, skor, beruntun (streak), tingkat adaptif,
 * umpan balik, dan ringkasan akhir. `fixed` dipakai Tantangan Harian (soal sama untuk semua orang).
 */
export function QuizSession({
  mode,
  range,
  levelChoice,
  fixed,
  onFinish,
  onExit,
}: {
  mode: QuizMode;
  range: YearRange;
  levelChoice: LevelChoice;
  fixed?: Question[];
  onFinish: (played: Played[], score: number) => void;
  onExit: () => void;
}) {
  const { t, lang } = useCopy();
  const total = fixed ? fixed.length : SESSION_LENGTH;
  const seed = useMemo(() => seedFrom(`sesi-${mode}-${Math.random()}`), [mode]);
  const gen = useRef(rng(seed));
  const used = useRef(new Set<string>());
  const adapt = useRef(initialAdapt());
  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [played, setPlayed] = useState<Played[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [empty, setEmpty] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  // bangun soal berikutnya (tingkat adaptif dibaca saat soal dibuat)
  useEffect(() => {
    if (index >= total) return;
    let q: Question | null = null;
    if (fixed) q = fixed[index];
    else {
      const level: Level = levelChoice === "adaptif" ? adapt.current.level : levelChoice;
      const pickMode: QuestionMode = mode as QuestionMode;
      for (let tries = 0; tries < 4 && !q; tries++) q = makeQuestion(pickMode, gen.current, range, level, used.current);
      if (!q) q = makeQuestion(pickMode, gen.current, range, level, new Set());
    }
    if (!q) {
      setEmpty(true);
      return;
    }
    used.current.add(q.id);
    setQuestion(q);
    setResult(null);
    top.current?.scrollIntoView({ block: "start", behavior: isMotionReduced() ? "auto" : "smooth" });
  }, [index, total, fixed, levelChoice, mode, range]);

  const onResult = (answer: Answer, r: Result) => {
    if (!question || result) return;
    setResult(r);
    setScore((s) => s + r.points);
    setStreak((s) => (r.verdict === "benar" ? s + 1 : 0));
    adapt.current = adaptStep(adapt.current, r.verdict);
    setPlayed((p) => [...p, { q: question, answer, result: r }]);
    playSfx(r.verdict === "salah" ? "crack" : "shimmer");
  };

  const next = () => {
    if (index + 1 >= total) {
      onFinish(played, score);
      return;
    }
    setIndex((i) => i + 1);
  };

  if (empty) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <p>{t.quiz.errorEmpty}</p>
        <button type="button" onClick={onExit} className="rounded-full border border-current/30 px-5 py-2.5">
          {t.quiz.home}
        </button>
      </div>
    );
  }
  if (!question) return null;
  const level = levelChoice === "adaptif" ? adapt.current.level : question.level;

  return (
    <div ref={top} className="mx-auto w-full max-w-3xl scroll-mt-20 space-y-4">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs">
        <span>{t.quiz.question(index + 1, total)}</span>
        <span className="rounded-full border border-current/25 px-2.5 py-0.5 uppercase tracking-wider">{t.quiz.levels[level]}</span>
        <span className="ml-auto flex items-center gap-3">
          {streak >= 2 && (
            <span className={cn("quiz-streak inline-flex items-center gap-1 text-[var(--accent)]")} aria-live="polite">
              <Flame className="h-4 w-4" aria-hidden />
              {t.quiz.streak(streak)}
            </span>
          )}
          <span aria-live="polite">
            {t.quiz.score}: <strong className="text-[var(--accent)]">{score}</strong>
          </span>
        </span>
      </header>
      <div className="h-1.5 overflow-hidden rounded-full bg-current/15" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index + (result ? 1 : 0)} aria-label={t.quiz.question(index + 1, total)}>
        <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500" style={{ width: `${((index + (result ? 1 : 0)) / total) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={question.id + index} initial={isMotionReduced() ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={isMotionReduced() ? undefined : { opacity: 0, y: -10 }} transition={{ duration: 0.28 }}>
          {question.mode === "tebak-tahun" && <GuessYear q={question} result={result} onResult={onResult} />}
          {question.mode === "urutkan" && <SortEvents q={question} result={result} onResult={onResult} />}
          {question.mode === "di-mana" && <WhereIsThis q={question} result={result} onResult={onResult} />}
          {question.mode === "situs-mana" && <WhichSite q={question} result={result} onResult={onResult} />}
          {question.mode === "fakta" && <FactOrDebate q={question} result={result} onResult={onResult} />}
        </motion.div>
      </AnimatePresence>

      {result && (
        <div className="flex justify-end">
          <button type="button" onClick={next} autoFocus className="rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-[#0d0b09]" data-quiz-next>
            {index + 1 >= total ? t.quiz.finish : t.quiz.next}
          </button>
        </div>
      )}
    </div>
  );
}

/** Ringkasan akhir: skor, grid hasil, dan jawaban benar untuk soal yang salah. */
export function QuizSummary({ played, score, mode, onReplay, onHome, children }: { played: Played[]; score: number; mode: QuizMode; onReplay?: () => void; onHome: () => void; children?: React.ReactNode }) {
  const { t, lang } = useCopy();
  const board = useQuizStore((s) => s.board[mode]) ?? [];
  const wrong = played.filter((p) => p.result.verdict !== "benar");
  const verdicts = played.map((p) => p.result.verdict) as Verdict[];
  return (
    <div className="mx-auto max-w-3xl space-y-6" data-quiz-summary>
      <header className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest opacity-75">{t.quiz.summary}</p>
        <p className="mt-1 font-display text-5xl font-semibold text-[var(--accent)]">{score}</p>
        <p className="text-sm opacity-80">{t.quiz.total}</p>
      </header>
      <ul className="flex flex-wrap justify-center gap-2" aria-hidden>
        {verdicts.map((v, i) => (
          <li key={i} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg border", VERDICT_STYLE[v])}>
            <VerdictIcon verdict={v} className="h-5 w-5" />
          </li>
        ))}
      </ul>
      {children}
      <section>
        <h2 className="font-display text-xl font-semibold">{t.quiz.wrongTitle}</h2>
        {wrong.length === 0 ? (
          <p className="mt-2 text-sm opacity-80">{t.quiz.allRight}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {wrong.map((p, i) => (
              <li key={i} className="rounded-2xl border border-current/15 bg-black/20 p-3 text-sm">
                <p className="font-medium">{t.quiz.modes[p.q.mode].name}</p>
                <p className="mt-1 opacity-85">
                  <span className="font-mono text-[11px] uppercase opacity-70">{t.quiz.yourAnswer}: </span>
                  {describeGiven(p.q, p.answer, lang)}
                </p>
                <p className="text-verified">{describeAnswer(p.q, lang)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      {mode !== "harian" && (
        <section aria-label={t.quiz.board}>
          <h2 className="font-display text-xl font-semibold">{t.quiz.board}</h2>
          {board.length === 0 ? (
            <p className="mt-1 text-sm opacity-70">{t.quiz.boardEmpty}</p>
          ) : (
            <ol className="mt-2 space-y-1 font-mono text-sm">
              {board.map((b, i) => (
                <li key={i} className="flex justify-between gap-3 rounded-lg px-3 py-1.5 odd:bg-current/5">
                  <span>
                    {i + 1}. {t.quiz.levels[b.level]}
                  </span>
                  <span className="opacity-70">{b.date}</span>
                  <strong className="text-[var(--accent)]">{b.score}</strong>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        {onReplay && (
          <button type="button" onClick={onReplay} className="rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-[#0d0b09]">
            {t.quiz.replay}
          </button>
        )}
        <button type="button" onClick={onHome} className="rounded-full border border-current/30 px-6 py-3">
          {t.quiz.home}
        </button>
      </div>
    </div>
  );
}
