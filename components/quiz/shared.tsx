"use client";

import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import Link from "next/link";
import type { TimelineEvent } from "@/data";
import { localizeEvent } from "@/lib/i18n";
import { altFor, srcFor, type MediaEntry } from "@/lib/media";
import type { Result, Verdict } from "@/lib/quiz";
import { leadOf } from "@/components/objects/EventObject";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";

export const VERDICT_STYLE: Record<Verdict, string> = {
  benar: "border-verified/60 bg-verified/10 text-verified",
  hampir: "border-[var(--accent)]/60 bg-[var(--accent)]/10 text-[var(--accent)]",
  salah: "border-check/60 bg-check/10 text-check",
};

export function VerdictIcon({ verdict, className }: { verdict: Verdict; className?: string }) {
  const Icon = verdict === "benar" ? CheckCircle2 : verdict === "hampir" ? CircleDashed : XCircle;
  return <Icon className={className} aria-hidden />;
}

/** Foto soal (berkredit di bawahnya). */
export function QuizPhoto({ media, className }: { media: MediaEntry | undefined; className?: string }) {
  const { lang } = useCopy();
  if (!media) return null;
  return (
    <figure className={cn("overflow-hidden rounded-2xl bg-black/30", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={srcFor(media, 1280)} alt={altFor(media, lang)} className="max-h-[42vh] w-full object-cover" style={{ objectPosition: media.focus }} />
      <figcaption className="px-3 py-1.5 font-mono text-[10px] opacity-70">
        {media.author} · {media.license}
      </figcaption>
    </figure>
  );
}

/**
 * Umpan balik setelah menjawab: tanda dan poin, penjelasan satu kalimat dari narasi data, serta
 * tautan ke guliran dan peta. Tanpa konten di luar data.
 */
export function Feedback({ result, event, extra, siteSlug }: { result: Result; event?: TimelineEvent; extra?: React.ReactNode; siteSlug?: string }) {
  const { t, lang } = useCopy();
  const loc = event ? localizeEvent(event, lang) : null;
  return (
    <div className={cn("quiz-feedback rounded-2xl border p-4", VERDICT_STYLE[result.verdict])} role="status" aria-live="polite" data-verdict={result.verdict}>
      <div className="flex items-center gap-2">
        <VerdictIcon verdict={result.verdict} className="quiz-verdict-icon h-7 w-7 shrink-0" />
        <p className="font-display text-xl font-semibold">{t.quiz.verdict[result.verdict]}</p>
        <span className="ml-auto font-mono text-sm">{t.quiz.points(result.points)}</span>
      </div>
      {extra && <div className="mt-2 space-y-1 text-sm text-[#f5ecdc]">{extra}</div>}
      {loc && (
        <p className="mt-2 text-sm leading-relaxed text-[#f5ecdc]/90">
          <span className="font-mono text-[11px] text-[var(--accent)]">{loc.dateLabel}</span> {leadOf(loc.narrative)}
        </p>
      )}
      {(event || siteSlug) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {event && (
            <Link href={`/?ev=${event.id}`} className="rounded-full border border-current/40 px-3 py-1.5 text-[#f5ecdc] hover:border-[var(--accent)]">
              {t.quiz.seeScroll}
            </Link>
          )}
          <Link href={event ? `/peta?ev=${event.id}` : `/peta?situs=${siteSlug}`} className="rounded-full border border-current/40 px-3 py-1.5 text-[#f5ecdc] hover:border-[var(--accent)]">
            {t.quiz.seeMap}
          </Link>
        </div>
      )}
    </div>
  );
}
