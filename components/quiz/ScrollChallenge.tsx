"use client";

import { Puzzle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { sortedEvents } from "@/data";
import { localizeEvent, localizeSite } from "@/lib/i18n";
import type { TimelineLayout } from "@/lib/layout";
import { CHALLENGE_EVERY, evaluate, quizSite, scrollChallenge } from "@/lib/quiz";
import { useQuizStore } from "@/lib/quiz-store";
import { playSfx } from "@/lib/sfx";
import { scrollStore } from "@/lib/store";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";

/**
 * Tantangan kecil di guliran (docs/KUIS.md bagian 2): kira-kira setiap 25 peristiwa muncul satu "batu
 * tantangan" kecil di tepi layar. Bukan penghalang: guliran tidak berhenti, boleh diabaikan, dan ada
 * sakelarnya di header. Jawaban benar menambah "jejak" pada penghitung kecil.
 */
export function ScrollChallenge({ layout }: { layout: TimelineLayout }) {
  const { t, lang } = useCopy();
  const enabled = useQuizStore((s) => s.scrollChallenges);
  const answered = useQuizStore((s) => s.answered);
  const jejak = useQuizStore((s) => s.jejak);
  const addJejak = useQuizStore((s) => s.addJejak);
  const [active, setActive] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<ReadonlySet<number>>(new Set());
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    void useQuizStore.persist.rehydrate();
  }, []);

  // jangkar: tiap CHALLENGE_EVERY peristiwa bersitus, di y peristiwa terakhir dari kelompoknya
  const anchors = useMemo(() => {
    const list = sortedEvents.filter((e) => e.siteSlug);
    const out: { n: number; y: number; recent: typeof list }[] = [];
    for (let i = CHALLENGE_EVERY - 1; i < list.length; i += CHALLENGE_EVERY) {
      const y = layout.eventY.get(list[i].id);
      if (y !== undefined) out.push({ n: out.length, y: y + 200, recent: list.slice(Math.max(0, i - 8), i + 1) });
    }
    return out;
  }, [layout]);

  useEffect(() => {
    if (!enabled) {
      setActive(null);
      return;
    }
    const apply = () => {
      const { y } = scrollStore.getState();
      let found: number | null = null;
      for (const a of anchors) {
        // muncul setelah garis acuan melewati jangkar, hilang bila sudah jauh (1,5 layar) atau mundur
        if (y >= a.y && y < a.y + 1400) found = a.n;
      }
      setActive((cur) => (cur === found ? cur : found));
    };
    apply();
    return scrollStore.subscribe(apply);
  }, [anchors, enabled]);

  const anchor = active !== null ? anchors[active] : null;
  const question = useMemo(() => (anchor ? scrollChallenge(anchor.recent, `n${anchor.n}`) : null), [anchor]);
  const id = anchor ? `sc-${anchor.n}` : "";
  // panel tetap tampil selama jawaban baru diberikan (umpan balik), lalu hilang saat pembaca melanjutkan
  const visible = enabled && anchor && question && (chosen !== null || (!answered.includes(id) && !dismissed.has(anchor.n)));

  useEffect(() => {
    if (!visible) {
      setOpen(false);
      setChosen(null);
    }
  }, [visible]);

  const result = question && chosen ? evaluate(question, chosen) : null;

  return (
    <>
      {jejak > 0 && (
        <p className="pointer-events-none fixed left-3 top-[3.4rem] z-[34] rounded-full bg-[rgba(13,11,9,0.6)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--accent)] md:left-5" aria-live="polite" data-jejak>
          {t.quiz.scroll.jejak(jejak)}
        </p>
      )}
      {visible && question && anchor && (
        <div className="fixed bottom-4 right-3 z-[34] md:bottom-6 md:right-[4.75rem]" data-scroll-challenge>
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={t.quiz.scroll.open}
              className="quiz-challenge-stone inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[rgba(24,20,16,0.92)] text-[var(--accent)] shadow-lg transition-transform hover:scale-110"
            >
              <Puzzle className="h-5 w-5" aria-hidden />
            </button>
          ) : (
            <section className="panel-surface w-[min(330px,calc(100vw-1.5rem))] rounded-2xl p-3.5 shadow-2xl" aria-label={t.quiz.scroll.title}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--accent)]">{t.quiz.scroll.title}</p>
                  <p className="mt-1 text-sm font-medium">{t.quiz.scroll.ask}</p>
                  {question.eventId && <p className="mt-1 text-sm opacity-85">{localizeEvent(sortedEvents.find((e) => e.id === question.eventId)!, lang).title}</p>}
                </div>
                <button type="button" onClick={() => setDismissed((d) => new Set(d).add(anchor.n))} aria-label={t.quiz.scroll.skip} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-current/10">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <ul className="mt-3 grid gap-1.5">
                {question.options.map((slug) => {
                  const s = quizSite(slug)!;
                  const right = result && slug === question.answer;
                  const wrong = result && slug === chosen && slug !== question.answer;
                  return (
                    <li key={slug}>
                      <button
                        type="button"
                        disabled={result !== null}
                        onClick={() => {
                          setChosen(slug);
                          const ok = slug === question.answer;
                          addJejak(id, ok);
                          playSfx(ok ? "shimmer" : "crack");
                        }}
                        className={cn("w-full rounded-xl border px-3 py-2 text-left text-sm", !result && "border-current/25 hover:border-[var(--accent)]", right && "border-verified bg-verified/20", wrong && "border-check bg-check/20", result && !right && !wrong && "opacity-50")}
                      >
                        {localizeSite(s, lang).name}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {result && (
                <p className={cn("mt-2 text-xs", result.verdict === "benar" ? "text-verified" : "text-check")} role="status">
                  {result.verdict === "benar" ? t.quiz.scroll.right : `${t.quiz.scroll.wrong} ${localizeSite(quizSite(question.answer)!, lang).name}`}
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </>
  );
}
