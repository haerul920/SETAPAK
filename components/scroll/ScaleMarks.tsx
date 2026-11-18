"use client";

import { memo } from "react";
import type { TimelineLayout } from "@/lib/layout";
import { groupDigits, tickLabel, yearsPerScreen } from "@/lib/time-scale";
import { useCopy } from "@/lib/useCopy";

/**
 * Garis skala lokal di tepi kanan konten (tanda tiap satuan bulat, label tiap tanda ke-5)
 * dan garis batas segmen "Waktu melambat: 1 layar = k tahun" (dihitung dari skala).
 */
export const ScaleMarks = memo(function ScaleMarks({ layout, viewport }: { layout: TimelineLayout; viewport: number }) {
  const { t, lang } = useCopy();
  return (
    <>
      <div className="pointer-events-none absolute inset-y-0 right-2 w-16 md:right-16" aria-hidden>
        {layout.ticks.map((tk) => (
          <div key={tk.year} className="absolute right-0 flex items-center gap-1.5" style={{ top: tk.y, transform: "translateY(-50%)" }}>
            {tk.major && <span className="whitespace-nowrap font-mono text-[9px] opacity-55 md:text-[10px]">{tickLabel(tk.year, lang)}</span>}
            <span className={tk.major ? "h-px w-3 bg-current opacity-50" : "h-px w-1.5 bg-current opacity-25"} />
          </div>
        ))}
      </div>
      {layout.segmentMarks.map((m) => {
        const k = yearsPerScreen(layout.scale, m.segment.from + 1e-6, viewport);
        const label = k >= 10 ? groupDigits(k, lang) : String(k).replace(".", lang === "id" ? "," : ".");
        return (
          <div key={m.segment.id} className="pointer-events-none absolute inset-x-0 px-4 md:px-20" style={{ top: m.y }}>
            <span className="block h-px bg-current opacity-20" />
            <span className="caption-plate absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] opacity-75 md:text-[11px]" style={{ top: m.labelY - m.y }}>
              {t.scroll.slower(label)}
            </span>
          </div>
        );
      })}
    </>
  );
});
