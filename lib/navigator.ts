"use client";

import { getLenis } from "@/components/layout/SmoothScrollProvider";
import type { TimelineLayout } from "./layout";
import { isMotionReduced, scrollStore } from "./store";

/**
 * Navigasi di dalam guliran waktu: tahun/peristiwa/posisi lintasan ke posisi gulir halaman.
 * Garis acuan berada di ANCHOR × tinggi layar; posisi lintasan y tepat di garis acuan saat
 * scrollY = trackTop + y - anchor.
 */
export const ANCHOR = 0.5;

interface NavContext {
  layout: TimelineLayout;
  track: HTMLElement;
}

let ctx: NavContext | null = null;

export function setNavContext(next: NavContext | null): void {
  ctx = next;
}

export function getNavLayout(): TimelineLayout | null {
  return ctx?.layout ?? null;
}

export function trackTop(): number {
  if (!ctx) return 0;
  return ctx.track.getBoundingClientRect().top + window.scrollY;
}

export function anchorPx(): number {
  return window.innerHeight * ANCHOR;
}

export function scrollForY(y: number): number {
  return Math.max(0, trackTop() + y - anchorPx());
}

/** Meluncur ke posisi lintasan; durasi sebanding jarak, maksimal 3 detik. */
export function goToY(y: number, opts: { immediate?: boolean } = {}): void {
  if (!ctx) return;
  const target = scrollForY(Math.min(Math.max(0, y), ctx.layout.total));
  const lenis = getLenis();
  const immediate = opts.immediate || isMotionReduced();
  if (lenis) {
    // Lenis menyimpan batas gulir; segarkan dulu karena tinggi lintasan bisa baru terpasang
    lenis.resize();
    const dist = Math.abs(target - window.scrollY);
    lenis.scrollTo(target, { immediate, duration: Math.min(3, 0.6 + dist / 25_000), lock: !immediate, force: true });
  } else {
    window.scrollTo({ top: target, behavior: "auto" });
  }
}

export function goToYear(year: number, opts: { immediate?: boolean } = {}): void {
  if (!ctx) return;
  goToY(ctx.layout.scale.yearToY(year), opts);
}

export function goToEvent(id: string, opts: { immediate?: boolean } = {}): boolean {
  if (!ctx) return false;
  const y = ctx.layout.eventY.get(id);
  if (y === undefined) return false;
  goToY(y, opts);
  return true;
}

/** Kembali ke awal halaman (layar pembuka). */
export function goToStart(): void {
  const lenis = getLenis();
  if (lenis && !isMotionReduced()) {
    lenis.resize();
    lenis.scrollTo(0, { duration: 3, lock: true, force: true });
  }
  else window.scrollTo({ top: 0, behavior: "auto" });
}

/** Posisi lintasan saat ini (dari store per frame). */
export function currentY(): number {
  return scrollStore.getState().y;
}
