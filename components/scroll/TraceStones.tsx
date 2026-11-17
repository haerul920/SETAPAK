"use client";

import { Bone, Building2, Castle, Crown, Flag, Hand, Landmark, MapPin, MoonStar, Mountain, ScrollText, X, type LucideIcon } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import type { TimelineLayout } from "@/lib/layout";
import { scrollStore, useSetapakStore } from "@/lib/store";
import { BUBBLE_SIZE, shortName, TRACE_DIMS, TRACE_LABEL, type BubblePlacement, type StonePlacement, type TraceCategory } from "@/lib/traces";
import { tickLabel } from "@/lib/time-scale";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";

export const TRACE_ICON: Record<TraceCategory, LucideIcon> = {
  prasejarah: Bone,
  "seni-cadas": Hand,
  prasasti: ScrollText,
  candi: Landmark,
  islam: MoonStar,
  keraton: Crown,
  benteng: Castle,
  kolonial: Building2,
  kemerdekaan: Flag,
  lanskap: Mountain,
  lainnya: MapPin,
};

/** Jarak (px lintasan) dari garis acuan di bawah mana label batu jejak ditampilkan. */
const NEAR_PX = 150;

/** Jarak jalur dari tepi layar. Jalur kiri di sebelah kanan batang durasi, jalur kanan di kiri penggaris lokal. */
const LANE = {
  desktop: { left: 100, right: 180 },
  mobile: { right: 46 },
} as const;

function laneStyle(side: "left" | "right", mobile: boolean): React.CSSProperties {
  if (mobile) return { right: LANE.mobile.right };
  return side === "left" ? { left: LANE.desktop.left } : { right: LANE.desktop.right };
}

/**
 * Jejak tingkat 3 (docs/SCROLL_ENGINE.md bagian 7): batu jejak 28 px (ikon kategori) di jalur tepi
 * kiri dan kanan, dan gelembung "+N jejak" untuk bagian yang padat. Nama muncul saat kursor atau
 * fokus di batu, atau saat batu berada dekat garis acuan. Hanya yang dalam radius virtualisasi dirender.
 */
export const TraceStones = memo(function TraceStones({ layout, lo, hi }: { layout: TimelineLayout; lo: number; hi: number }) {
  const mobile = layout.mobile;
  const { stones, bubbles } = layout.traces;
  const items = useRef(new Map<string, { el: HTMLElement; y: number }>());

  // Label muncul untuk batu yang dekat garis acuan; hanya menulis atribut data, tanpa render ulang React.
  useEffect(() => {
    let last = -1e9;
    const apply = () => {
      const { y } = scrollStore.getState();
      if (Math.abs(y - last) < 6) return;
      last = y;
      items.current.forEach(({ el, y: sy }) => {
        const near = Math.abs(sy - y) < NEAR_PX;
        if ((el.dataset.near === "1") !== near) el.dataset.near = near ? "1" : "0";
      });
    };
    apply();
    return scrollStore.subscribe(apply);
  }, [layout]);

  const visibleStones = stones.filter((s) => s.y >= lo && s.y <= hi);
  const visibleBubbles = bubbles.filter((b) => b.y >= lo && b.y <= hi);
  const register = (id: string, y: number) => (el: HTMLElement | null) => {
    if (el) items.current.set(id, { el, y });
    else items.current.delete(id);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-[5]" data-trace-layer>
      {visibleStones.map((s) => (
        <Stone key={s.trace.id} stone={s} mobile={mobile} refCb={register(s.trace.id, s.y)} />
      ))}
      {visibleBubbles.map((b) => (
        <Bubble key={b.id} bubble={b} mobile={mobile} />
      ))}
    </div>
  );
});

function Stone({ stone, mobile, refCb }: { stone: StonePlacement; mobile: boolean; refCb: (el: HTMLElement | null) => void }) {
  const { t, lang } = useCopy();
  const openTrace = useSetapakStore((s) => s.openTrace);
  const { trace } = stone;
  const dims = mobile ? TRACE_DIMS.mobile : TRACE_DIMS.desktop;
  const Icon = TRACE_ICON[trace.category];
  const name = lang === "en" && trace.nameEn ? trace.nameEn : trace.name;
  const inward = stone.side === "left" ? "left-full ml-2" : "right-full mr-2";
  return (
    <button
      ref={refCb}
      type="button"
      onClick={() => openTrace(trace.id)}
      aria-label={t.trace.stone(name, trace.yearLabel)}
      data-near="0"
      data-side={stone.side}
      className="trace-stone group pointer-events-auto absolute flex items-center justify-center rounded-full outline-none"
      style={{ top: stone.y - dims.size / 2, width: dims.size, height: dims.size, ...laneStyle(stone.side, mobile) }}
    >
      <span
        className={cn(
          "trace-stone-dot flex h-full w-full items-center justify-center rounded-full border transition-[transform,opacity] duration-200",
          "border-[color-mix(in_oklab,var(--accent)_55%,transparent)] bg-[color-mix(in_oklab,var(--surface)_85%,transparent)] text-[var(--accent)]",
          "group-hover:scale-110 group-focus-visible:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-[var(--accent)]",
          mobile && "border-0 bg-[var(--accent)] opacity-70"
        )}
        aria-hidden
      >
        {!mobile && <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />}
      </span>
      {!mobile && (
        <span
          className={cn(
            "trace-label caption-plate pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-left opacity-0 transition-opacity duration-200",
            "group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[near=1]:opacity-90",
            inward
          )}
          aria-hidden
        >
          <span className="block font-mono text-[10px] uppercase tracking-wider opacity-75">{trace.yearLabel}</span>
          <span className="block text-xs leading-tight">{shortName(name)}</span>
        </span>
      )}
    </button>
  );
}

function Bubble({ bubble, mobile }: { bubble: BubblePlacement; mobile: boolean }) {
  const { t, lang } = useCopy();
  const open = useSetapakStore((s) => s.openBubbleId === bubble.id);
  const openBubble = useSetapakStore((s) => s.openBubble);
  const openTrace = useSetapakStore((s) => s.openTrace);
  const size = mobile ? BUBBLE_SIZE.mobile : BUBBLE_SIZE.desktop;
  const first = bubble.traces[0];
  const last = bubble.traces[bubble.traces.length - 1];
  const from = tickLabel(Math.floor(first.year), lang);
  const to = tickLabel(Math.floor(last.year), lang);
  const panelSide = bubble.side === "left" ? "left-full ml-3" : "right-full mr-3";
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") openBubble(null);
    };
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest(`[data-bubble="${bubble.id}"]`)) openBubble(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, bubble.id, openBubble]);

  return (
    <div
      data-bubble={bubble.id}
      className={cn("pointer-events-none absolute", open && "z-20")}
      style={{ top: bubble.y - size / 2, width: size, height: size, ...laneStyle(bubble.side, mobile) }}
    >
      <button
        type="button"
        onClick={() => openBubble(open ? null : bubble.id)}
        aria-expanded={open}
        aria-label={t.trace.bubbleOpen(bubble.traces.length, from, to)}
        className="pointer-events-auto flex h-full w-full items-center justify-center rounded-full border border-[var(--accent)] bg-[var(--accent)] font-mono text-[10px] font-semibold text-[#0d0b09] shadow-md outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      >
        {mobile ? bubble.traces.length : t.trace.bubble(bubble.traces.length)}
      </button>
      {open && (
        <div
          ref={panel}
          role="dialog"
          aria-label={t.trace.listTitle(bubble.traces.length)}
          className={cn("panel-surface pointer-events-auto absolute top-1/2 w-[min(300px,70vw)] -translate-y-1/2 rounded-2xl p-3 shadow-2xl", mobile ? "right-full mr-3" : panelSide)}
          data-lenis-prevent
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--accent)]">{t.trace.listTitle(bubble.traces.length)}</p>
            <button type="button" onClick={() => openBubble(null)} aria-label={t.trace.listClose} className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-current/10">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <ul className="max-h-[48svh] space-y-0.5 overflow-y-auto pr-1">
            {bubble.traces.map((tr) => {
              const Icon = TRACE_ICON[tr.category];
              const name = lang === "en" && tr.nameEn ? tr.nameEn : tr.name;
              return (
                <li key={tr.id}>
                  <button
                    type="button"
                    onClick={() => {
                      openBubble(null);
                      openTrace(tr.id);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-current/10 focus-visible:bg-current/10"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{name}</span>
                      <span className="block font-mono text-[10px] opacity-70">
                        {tr.yearLabel} · {TRACE_LABEL[tr.category][lang]}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
