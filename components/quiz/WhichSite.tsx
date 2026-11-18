"use client";

import { useMemo, useState } from "react";
import { localizeEvent, localizeSite } from "@/lib/i18n";
import { imagesFor } from "@/lib/media";
import { evaluate, quizEvent, quizSite, type Result, type WhichQ } from "@/lib/quiz";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { Feedback, QuizPhoto } from "./shared";

/** Situs Mana? (docs/KUIS.md, mode 4): pilihan ganda 4 opsi dengan pengecoh dari situs yang mirip. */
export function WhichSite({ q, onResult, result }: { q: WhichQ; onResult: (answer: string, r: Result) => void; result: Result | null }) {
  const { t, lang } = useCopy();
  const [chosen, setChosen] = useState<string | null>(null);
  const ev = q.eventId ? quizEvent(q.eventId) : undefined;
  const loc = ev ? localizeEvent(ev, lang) : null;
  const media = useMemo(() => (q.mediaId ? imagesFor(q.answer, ["hero", "gallery", "now"]).find((m) => m.id === q.mediaId) : undefined), [q.mediaId, q.answer]);
  const locked = result !== null;
  const answerSite = quizSite(q.answer);

  return (
    <div className="space-y-4">
      {q.variant === "foto" ? (
        <>
          <QuizPhoto media={media} />
          <p className="font-display text-xl font-semibold">{t.quiz.prompts.whichPhoto}</p>
        </>
      ) : (
        <div className="rounded-2xl border border-current/15 bg-black/20 p-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--accent)]">{loc?.dateLabel}</p>
          <h2 className="mt-1 font-display text-2xl font-semibold leading-snug">{loc?.title}</h2>
          <p className="mt-2 text-sm opacity-85">{t.quiz.prompts.whichEvent}</p>
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={q.variant === "foto" ? t.quiz.prompts.whichPhoto : t.quiz.prompts.whichEvent}>
        {q.options.map((slug) => {
          const s = quizSite(slug)!;
          const right = locked && slug === q.answer;
          const wrong = locked && slug === chosen && slug !== q.answer;
          return (
            <div key={slug}>
              <button
                type="button"
                role="radio"
                aria-checked={chosen === slug}
                disabled={locked}
                onClick={() => {
                  setChosen(slug);
                  onResult(slug, evaluate(q, slug));
                }}
                className={cn(
                  "min-h-[56px] w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                  !locked && "border-current/25 hover:border-[var(--accent)] hover:bg-current/5",
                  right && "border-verified bg-verified/20",
                  wrong && "border-check bg-check/20",
                  locked && !right && !wrong && "opacity-50"
                )}
              >
                {localizeSite(s, lang).name}
              </button>
            </div>
          );
        })}
      </div>
      {locked && (
        <Feedback
          result={result}
          event={ev}
          siteSlug={q.answer}
          extra={
            <>
              <p>{t.quiz.answerIs(answerSite ? localizeSite(answerSite, lang).name : q.answer)}</p>
              {!ev && answerSite && <p className="opacity-90">{localizeSite(answerSite, lang).summary}</p>}
            </>
          }
        />
      )}
    </div>
  );
}
