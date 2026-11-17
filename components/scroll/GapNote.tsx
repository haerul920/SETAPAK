"use client";

import { ChevronsDown } from "lucide-react";
import type { GapNote as GapNoteData, TimelineLayout } from "@/lib/layout";
import { goToY } from "@/lib/navigator";
import { groupDigits, pxToMeters, yearsPerScreen } from "@/lib/time-scale";
import { useCopy } from "@/lib/useCopy";

/** Pembulatan angka tahun agar enak dibaca ("sekitar 40.000"). */
function roundNice(n: number): number {
  if (n >= 100_000) return Math.round(n / 10_000) * 10_000;
  if (n >= 10_000) return Math.round(n / 1_000) * 1_000;
  if (n >= 1_000) return Math.round(n / 100) * 100;
  if (n >= 100) return Math.round(n / 10) * 10;
  return Math.max(1, Math.round(n));
}

/**
 * Keterangan bentangan kosong. Hanya berisi hitungan (selisih tahun, jarak guliran, skala),
 * bukan fakta sejarah, sesuai aturan di PROMPT_CLAUDE_CODE.md.
 */
export function GapNote({ note, layout, viewport }: { note: GapNoteData; layout: TimelineLayout; viewport: number }) {
  const { t, lang } = useCopy();
  const target = layout.clusters.find((c) => c.id === note.nextClusterId);
  const yearHere = layout.scale.yToYear(note.y);
  let text: string;
  if (note.kind === "remaining") {
    text = t.scroll.remaining(groupDigits(roundNice(Math.max(0, note.nextYear - yearHere)), lang));
  } else if (note.kind === "distance") {
    text = t.scroll.distance(t.scroll.meters(pxToMeters(note.y)));
  } else {
    const k = yearsPerScreen(layout.scale, yearHere, viewport);
    text = t.scroll.screen(k >= 10 ? groupDigits(k, lang) : String(k).replace(".", lang === "id" ? "," : "."));
  }
  return (
    <div className="pointer-events-none absolute inset-x-0 flex flex-col items-center gap-3 px-6 text-center" style={{ top: note.y, transform: "translateY(-50%)" }}>
      <p className="caption-plate max-w-md font-display text-lg italic opacity-80 md:text-xl">{text}</p>
      {target && (
        <button
          type="button"
          onClick={() => goToY(target.y)}
          className="pointer-events-auto inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-current/25 px-4 font-mono text-[11px] uppercase tracking-widest opacity-80 transition-[opacity,border-color] hover:border-[var(--accent)] hover:opacity-100"
        >
          <ChevronsDown className="h-4 w-4" aria-hidden />
          {t.scroll.jumpNext}
        </button>
      )}
    </div>
  );
}
