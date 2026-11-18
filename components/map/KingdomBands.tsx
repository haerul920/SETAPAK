"use client";

import { useMemo } from "react";
import { kingdoms } from "@/data";
import { packBands } from "@/lib/peta-data";
import { type AxisMode, normalizeRange, yearToPos } from "@/lib/peta-time";
import { usePetaStore } from "@/lib/peta-store";
import { tickLabel } from "@/lib/time-scale";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";

const ROW_H = 24;
const ROW_GAP = 2;

/** Warna pita dari id kerajaan (rona tetap, kroma rendah agar senada dengan SETAPAK). */
function bandColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return `oklch(0.62 0.08 ${h})`;
}

/**
 * Pita kerajaan (band chronology, docs/PETA_WAKTU.md bagian 3). Baris disusun dengan interval
 * packing. Ujung pita bergaris miring halus menandakan "perkiraan". Tidak ada batas wilayah:
 * hover hanya menyalakan lingkaran cahaya "perkiraan pusat" di peta.
 */
export function KingdomBands({ mode }: { mode: AxisMode }) {
  const { t, lang } = useCopy();
  const setRange = usePetaStore((s) => s.setRange);
  const setPoint = usePetaStore((s) => s.setPoint);
  const hover = usePetaStore((s) => s.hoverKingdom);
  const setHover = usePetaStore((s) => s.setHoverKingdom);
  const { rows, rowCount } = useMemo(() => packBands(kingdoms, (y) => yearToPos(mode, y)), [mode]);

  return (
    <div className="relative w-full" style={{ height: rowCount * (ROW_H + ROW_GAP) }} role="group" aria-label={`${t.peta.kingdoms}. ${t.peta.kingdomsApprox}`}>
      {rows.map(({ kingdom: k, row }) => {
        const a = yearToPos(mode, k.start);
        const b = yearToPos(mode, k.end);
        const w = Math.max(0.006, b - a);
        const range = `${tickLabel(Math.round(k.start), lang)} - ${tickLabel(Math.round(k.end), lang)}`;
        return (
          <button
            key={k.id}
            type="button"
            title={`${k.name}: ${t.peta.kingdomRange(tickLabel(Math.round(k.start), lang), tickLabel(Math.round(k.end), lang))}. ${t.peta.kingdomClick}${k.note ? `. ${k.note}` : ""}`}
            aria-label={`${k.name}, ${range}, ${t.peta.kingdomsApprox}`}
            onPointerEnter={() => setHover(k.id)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(k.id)}
            onBlur={() => setHover(null)}
            onClick={() => {
              setPoint(false);
              setRange(normalizeRange({ from: k.start, to: k.end }));
            }}
            className={cn(
              "absolute overflow-hidden rounded-md text-left outline-none transition-[filter,box-shadow] focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              hover === k.id && "brightness-125 ring-1 ring-[var(--accent)]"
            )}
            style={{ left: `${a * 100}%`, width: `${w * 100}%`, minWidth: 24, top: row * (ROW_H + ROW_GAP), height: ROW_H, background: bandColor(k.id) }}
          >
            {/* garis miring halus di kedua ujung: batas rentang hanya perkiraan */}
            <span className="pointer-events-none absolute inset-y-0 left-0 w-2.5 opacity-60" style={{ background: "repeating-linear-gradient(135deg, rgba(0,0,0,0.5) 0 2px, transparent 2px 5px)" }} aria-hidden />
            <span className="pointer-events-none absolute inset-y-0 right-0 w-2.5 opacity-60" style={{ background: "repeating-linear-gradient(135deg, rgba(0,0,0,0.5) 0 2px, transparent 2px 5px)" }} aria-hidden />
            <span className="pointer-events-none block truncate px-3 text-[10px] font-medium leading-6 text-[#0d0b09]">{k.name}</span>
          </button>
        );
      })}
    </div>
  );
}
