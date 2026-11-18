"use client";

import { Pause } from "lucide-react";
import { useEffect } from "react";
import { getLenis } from "@/components/layout/SmoothScrollProvider";
import { AUTO_SPEEDS, autoSpeedAt } from "@/lib/autoscroll";
import type { TimelineLayout } from "@/lib/layout";
import { scrollStore, useSetapakStore } from "@/lib/store";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";

/**
 * Gulir otomatis: tombol Putar di header menjalankan guliran dari posisi sekarang sampai penutup.
 * Kecepatan melambat di dalam klaster peristiwa dan melaju di bentangan kosong (lib/autoscroll.ts).
 * Berhenti sendiri bila pembaca menggulir, menyentuh layar, menekan tombol navigasi, membuka laci
 * detail, atau sudah sampai di akhir. Panel kecil di bawah memperlihatkan jeda dan pilihan kecepatan.
 */
export function AutoScroll({ layout }: { layout: TimelineLayout }) {
  const { t } = useCopy();
  const playing = useSetapakStore((s) => s.autoPlay);
  const speed = useSetapakStore((s) => s.autoSpeed);
  const setPlay = useSetapakStore((s) => s.setAutoPlay);
  const setSpeed = useSetapakStore((s) => s.setAutoSpeed);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = 0;
    let pos = window.scrollY;
    let expected = pos;
    const stop = () => useSetapakStore.getState().setAutoPlay(false);
    const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const st = useSetapakStore.getState();
      if (st.openEventId || st.openTraceId) return stop();
      if (!last) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // posisi berubah di luar yang kita tulis: pembaca menggulir sendiri (scrollbar, tombol, seret)
      if (Math.abs(window.scrollY - expected) > 4) return stop();
      const { y } = scrollStore.getState();
      pos += autoSpeedAt(layout, y, st.autoSpeed) * dt;
      const limit = maxScroll();
      if (pos >= limit) {
        pos = limit;
        stop();
      }
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(pos, { immediate: true, force: true });
      else window.scrollTo(0, pos);
      expected = window.scrollY;
    };
    raf = requestAnimationFrame(tick);

    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " ", "Escape"].includes(e.key)) stop();
    };
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", onKey);
    };
  }, [playing, layout]);

  // keluar dari halaman guliran: jangan terus menggulir
  useEffect(() => () => useSetapakStore.getState().setAutoPlay(false), []);

  if (!playing) return null;
  return (
    <div
      className="panel-surface fixed bottom-3 left-3 z-[36] flex items-center gap-1 rounded-full py-1 pl-1 pr-2 shadow-xl md:bottom-4 md:left-1/2 md:-translate-x-1/2"
      role="group"
      aria-label={t.header.autoGroup}
      data-autoscroll
    >
      <button type="button" onClick={() => setPlay(false)} aria-label={t.header.autoPause} title={t.header.autoPause} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-[#0d0b09]">
        <Pause className="h-4 w-4" aria-hidden />
      </button>
      {AUTO_SPEEDS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setSpeed(s)}
          aria-pressed={speed === s}
          aria-label={t.header.autoSpeed(s)}
          className={cn("inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2 font-mono text-xs", speed === s ? "bg-current/15 text-[var(--accent)]" : "opacity-70 hover:opacity-100")}
        >
          {s}x
        </button>
      ))}
      <span className="sr-only" aria-live="polite">
        {t.header.autoHint}
      </span>
    </div>
  );
}
