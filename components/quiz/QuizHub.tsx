"use client";

import { CalendarDays, Clock3, ListOrdered, MapPin, Scale, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FilmGrain } from "@/components/background/FilmGrain";
import { ERA_PRESETS } from "@/lib/peta-time";
import { ALL_TIME, dailyQuestions, dateKey, LEVELS, shareGrid, type LevelChoice, type QuizMode, type YearRange } from "@/lib/quiz";
import { useQuizStore } from "@/lib/quiz-store";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { type Played, QuizSession, QuizSummary } from "./QuizSession";
import { DailyShare } from "./DailyShare";

const MODE_ORDER: QuizMode[] = ["harian", "tebak-tahun", "urutkan", "di-mana", "situs-mana", "fakta"];
const MODE_ICON: Record<QuizMode, typeof Clock3> = {
  harian: CalendarDays,
  "tebak-tahun": Clock3,
  urutkan: ListOrdered,
  "di-mana": MapPin,
  "situs-mana": Target,
  fakta: Scale,
};

type Screen = { kind: "hub" } | { kind: "play"; key: number } | { kind: "summary"; played: Played[]; score: number };

/**
 * Halaman /kuis (docs/KUIS.md): pilihan mode berbentuk kartu besar, rentang masa, dan tingkat
 * (Santai, Sedang, Ahli, atau Adaptif sebagai bawaan). Tidak memecah guliran menjadi bab.
 */
export function QuizHub() {
  const { t, lang } = useCopy();
  const [mode, setMode] = useState<QuizMode>("tebak-tahun");
  const [rangeId, setRangeId] = useState("semua");
  const [level, setLevel] = useState<LevelChoice>("adaptif");
  const [screen, setScreen] = useState<Screen>({ kind: "hub" });
  const addScore = useQuizStore((s) => s.addScore);
  const setDaily = useQuizStore((s) => s.setDaily);
  const daily = useQuizStore((s) => s.daily);
  const today = dateKey();
  const doneToday = daily[today];

  useEffect(() => {
    void useQuizStore.persist.rehydrate();
  }, []);

  const range: YearRange = useMemo(() => {
    const p = ERA_PRESETS.find((x) => x.id === rangeId);
    return p ? { from: p.from, to: p.to } : ALL_TIME;
  }, [rangeId]);
  const dailyQs = useMemo(() => dailyQuestions(today), [today]);

  const finish = (played: Played[], score: number) => {
    if (mode === "harian") {
      setDaily(today, { results: played.map((p) => p.result.verdict), score });
    } else {
      addScore(mode, { score, level, date: today });
    }
    setScreen({ kind: "summary", played, score });
  };

  return (
    <div className="relative min-h-[100svh] overflow-x-hidden bg-[#14100c] px-4 pb-24 pt-20 text-[#f5ecdc] sm:px-6" style={{ ["--ink" as string]: "#f5ecdc", ["--surface" as string]: "rgba(24,20,16,0.95)" }} data-quiz>
      <div className="pointer-events-none absolute inset-0" aria-hidden style={{ background: "radial-gradient(ellipse at 20% 0%, rgba(231,183,95,0.14), transparent 55%), radial-gradient(ellipse at 90% 40%, rgba(79,163,184,0.1), transparent 55%)" }} />
      <FilmGrain />
      <div className="relative z-10">
        {screen.kind === "hub" && (
          <div className="mx-auto max-w-5xl">
            <h1 className="font-display text-4xl font-semibold sm:text-5xl">{t.quiz.title}</h1>
            <p className="mt-2 max-w-2xl text-lg opacity-85">{t.quiz.intro}</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label={t.quiz.title}>
              {MODE_ORDER.map((m) => {
                const Icon = MODE_ICON[m];
                const sel = mode === m;
                return (
                  <div key={m}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={sel}
                      onClick={() => setMode(m)}
                      className={cn("flex h-full w-full flex-col gap-2 rounded-3xl border p-5 text-left transition-[border-color,background-color,transform] hover:-translate-y-0.5", sel ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-current/20 bg-black/20 hover:border-[var(--accent)]/60")}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-6 w-6 text-[var(--accent)]" aria-hidden />
                        <span className="font-display text-xl font-semibold">{t.quiz.modes[m].name}</span>
                      </span>
                      <span className="text-sm opacity-80">{t.quiz.modes[m].desc}</span>
                      {m === "harian" && doneToday && <span className="font-mono text-xs text-verified">{t.quiz.dailyDone}: {shareGrid(doneToday.results)}</span>}
                    </button>
                  </div>
                );
              })}
            </div>

            {mode !== "harian" && (
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <fieldset>
                  <legend className="font-mono text-[11px] uppercase tracking-widest opacity-75">{t.quiz.range}</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[{ id: "semua", label: t.quiz.rangeAll }, ...ERA_PRESETS.map((p) => ({ id: p.id, label: lang === "en" ? p.en : p.id_ }))].map((r) => (
                      <button key={r.id} type="button" aria-pressed={rangeId === r.id} onClick={() => setRangeId(r.id)} className={cn("rounded-full border px-3.5 py-2 text-sm", rangeId === r.id ? "border-[var(--accent)] bg-[var(--accent)] text-[#0d0b09]" : "border-current/25 hover:border-[var(--accent)]")}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="font-mono text-[11px] uppercase tracking-widest opacity-75">{t.quiz.level}</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["adaptif", ...LEVELS] as LevelChoice[]).map((l) => (
                      <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)} className={cn("rounded-full border px-3.5 py-2 text-sm", level === l ? "border-[var(--accent)] bg-[var(--accent)] text-[#0d0b09]" : "border-current/25 hover:border-[var(--accent)]")}>
                        {t.quiz.levels[l]}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs opacity-70">{t.quiz.levelHint}</p>
                </fieldset>
              </div>
            )}

            <div className="mt-8">
              <button
                type="button"
                onClick={() => (mode === "harian" && doneToday ? setScreen({ kind: "summary", played: [], score: doneToday.score }) : setScreen({ kind: "play", key: Date.now() }))}
                className="rounded-full bg-[var(--accent)] px-8 py-3.5 text-lg font-semibold text-[#0d0b09]"
                data-quiz-start
              >
                {mode === "harian" && doneToday ? t.quiz.dailyAgain : t.quiz.start}
              </button>
            </div>
          </div>
        )}

        {screen.kind === "play" && (
          <QuizSession
            key={screen.key}
            mode={mode}
            range={range}
            levelChoice={mode === "harian" ? "sedang" : level}
            fixed={mode === "harian" ? dailyQs : undefined}
            onFinish={finish}
            onExit={() => setScreen({ kind: "hub" })}
          />
        )}

        {screen.kind === "summary" && (
          <QuizSummary
            played={screen.played}
            score={screen.score}
            mode={mode}
            onReplay={mode === "harian" ? undefined : () => setScreen({ kind: "play", key: Date.now() })}
            onHome={() => setScreen({ kind: "hub" })}
          >
            {mode === "harian" && <DailyShare dateKey={today} results={(doneToday?.results ?? screen.played.map((p) => p.result.verdict))} score={screen.score} />}
          </QuizSummary>
        )}
      </div>
    </div>
  );
}
