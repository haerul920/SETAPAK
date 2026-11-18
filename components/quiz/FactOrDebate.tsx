"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/event/StatusBadge";
import { localizeEvent } from "@/lib/i18n";
import { evaluate, quizEvent, type FactQ, type Result } from "@/lib/quiz";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { Feedback } from "./shared";

/** Label tahun tanpa keterangan "(diperdebatkan)" supaya tidak membocorkan jawaban. */
const scrubLabel = (label: string): string => label.replace(/\s*\((?:diperdebatkan|debated)[^)]*\)/i, "");

/**
 * Fakta atau Diperdebatkan? (docs/KUIS.md, mode 5): klaim dari data, tebak statusnya, lalu tampilkan
 * versi alternatifnya. Mengajarkan cara berpikir kritis tentang sumber.
 */
export function FactOrDebate({ q, onResult, result }: { q: FactQ; onResult: (answer: string, r: Result) => void; result: Result | null }) {
  const { t, lang } = useCopy();
  const ev = quizEvent(q.eventId)!;
  const loc = localizeEvent(ev, lang);
  const [chosen, setChosen] = useState<string | null>(null);
  const locked = result !== null;
  const options: { id: FactQ["answer"]; label: string }[] = [
    { id: "disepakati", label: t.quiz.agreed },
    { id: "diperdebatkan", label: t.quiz.debated },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-current/15 bg-black/20 p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--accent)]">{scrubLabel(loc.dateLabel)}</p>
        <h2 className="mt-1 font-display text-2xl font-semibold leading-snug">{loc.title}</h2>
        <p className="mt-3 text-sm leading-relaxed opacity-90">{loc.narrative}</p>
        <p className="mt-3 text-sm opacity-85">{t.quiz.prompts.fact}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t.quiz.prompts.fact}>
        {options.map((o) => {
          const right = locked && o.id === q.answer;
          const wrong = locked && chosen === o.id && o.id !== q.answer;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={chosen === o.id}
              disabled={locked}
              onClick={() => {
                setChosen(o.id);
                onResult(o.id, evaluate(q, o.id));
              }}
              className={cn(
                "min-h-[56px] rounded-2xl border px-4 py-3 text-base font-semibold transition-colors",
                !locked && "border-current/25 hover:border-[var(--accent)] hover:bg-current/5",
                right && "border-verified bg-verified/20",
                wrong && "border-check bg-check/20",
                locked && !right && !wrong && "opacity-50"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {locked && (
        <Feedback
          result={result}
          event={ev}
          extra={
            <>
              <StatusBadge status={ev.status} />
              {ev.alternatives && ev.alternatives.length > 0 && (
                <div className="pt-1">
                  <p className="font-mono text-[11px] uppercase tracking-widest opacity-75">{t.quiz.alternatives}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {ev.alternatives.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          }
        />
      )}
    </div>
  );
}
