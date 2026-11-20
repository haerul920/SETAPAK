"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { localizeSite } from "@/lib/i18n";
import { imagesFor } from "@/lib/media";
import { evaluate, quizSite, type Result, type WhereQ } from "@/lib/quiz";
import { traces } from "@/lib/traces";
import { useCopy } from "@/lib/useCopy";
import { Feedback, QuizPhoto } from "./shared";

type LngLat = { lat: number; lng: number };

const QuizNusantaraMap = dynamic(
  () => import("@/components/map/NusantaraMap").then((mod) => mod.NusantaraMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-current/10" aria-hidden />,
  }
);

/**
 * Di Mana Ini? (docs/KUIS.md, mode 3): foto situs, lalu klik lokasinya di peta Nusantara (gaya peta
 * yang sama dengan Peta Waktu). Skor menurut jarak dalam km; garis beranimasi menghubungkan tebakan
 * dengan lokasi benar.
 */
export function WhereIsThis({
  q,
  onResult,
  result,
}: {
  q: WhereQ;
  onResult: (guess: LngLat, r: Result) => void;
  result: Result | null;
}) {
  const { t, lang } = useCopy();
  const [guess, setGuess] = useState<LngLat | null>(null);
  const locked = result !== null;
  const target = q.traceId ?? q.siteSlug ?? "";
  const media = useMemo(
    () => imagesFor(target, ["hero", "gallery", "now"]).find((m) => m.id === q.mediaId),
    [target, q.mediaId]
  );
  const site = q.siteSlug ? quizSite(q.siteSlug) : undefined;
  const trace = q.traceId ? traces.find((x) => x.id === q.traceId) : undefined;
  const name = site
    ? localizeSite(site).name
    : trace
      ? trace.name
      : "";

  return (
    <div className="space-y-4">
      <QuizPhoto media={media} />
      <p className="font-display text-xl font-semibold">{t.quiz.prompts.where}</p>
      <div className="relative aspect-[2/1] min-h-[220px] max-h-[420px] w-full min-w-0 overflow-hidden rounded-2xl border border-current/20">
        <QuizNusantaraMap
          quiz={{
            label: t.quiz.prompts.where,
            guess,
            answer: locked ? q.answer : null,
            locked,
            onGuess: (point) => setGuess(point),
          }}
        />
        {!guess && !locked && (
          <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs">
            {t.quiz.mapHint}
          </p>
        )}
      </div>
      {!locked ? (
        <button
          type="button"
          disabled={!guess}
          onClick={() => guess && onResult(guess, evaluate(q, guess))}
          className="rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-[#0d0b09] disabled:opacity-40"
        >
          {t.quiz.lock}
        </button>
      ) : (
        <Feedback
          result={result}
          siteSlug={q.siteSlug}
          extra={
            <>
              <p>{t.quiz.answerIs(name)}</p>
              {result.km !== undefined && (
                <p>
                  {t.quiz.distance(
                    Math.round(result.km).toLocaleString(lang === "id" ? "id-ID" : "en-US")
                  )}
                </p>
              )}
              <p className="font-mono text-[11px] opacity-80 flex items-center">
                <span
                  className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#e7b75f] ring-2 ring-[#26190a]/80 shadow-sm"
                  aria-hidden
                />
                {t.quiz.mapGuess}
                <span
                  className="ml-3 mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#10b981] ring-2 ring-[#062618]/80 shadow-sm"
                  aria-hidden
                />
                {t.quiz.mapAnswer}
              </p>
            </>
          }
        />
      )}
    </div>
  );
}
