"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/store";

let lenis: Lenis | null = null;

export const HEADER_OFFSET = 72;

/** Gulir ke elemen. Memakai Lenis jika aktif, atau gulir instan jika animasi dimatikan. */
export function scrollToTarget(target: string | HTMLElement, offset = -HEADER_OFFSET): void {
  if (typeof window === "undefined") return;
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  if (lenis) {
    lenis.scrollTo(el, { offset, duration: 1.1 });
    return;
  }
  const y = el.getBoundingClientRect().top + window.scrollY + offset;
  window.scrollTo({ top: y, behavior: "auto" });
}

export function getLenis(): Lenis | null {
  return lenis;
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      document.documentElement.dataset.motion = "off";
      return;
    }
    document.documentElement.dataset.motion = "on";
    const instance = new Lenis({ lerp: 0.09, smoothWheel: true, touchMultiplier: 1.2 });
    lenis = instance;
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => undefined);
    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      if (lenis === instance) lenis = null;
    };
  }, [reduced]);

  return <>{children}</>;
}
