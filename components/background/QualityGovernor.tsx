"use client";

import { useEffect } from "react";
import { initialGovernor, stepGovernor, type Quality } from "@/lib/background";
import { useReducedMotion } from "@/lib/store";
import { backgroundStore } from "./backgroundStore";

/** Penundaan sebelum penilaian dimulai, supaya beban muat awal tidak dianggap lambatnya latar. */
const WARMUP_MS = 3000;
/** Selang penilaian FPS. Empat selang berturut-turut di bawah 45 FPS (2 detik) menurunkan kualitas. */
const SAMPLE_MS = 500;

/**
 * Penjaga kualitas (docs/BACKGROUND.md, bagian Performa): bila FPS di bawah 45 selama 2 detik,
 * kualitas turun satu tingkat (matikan sinar dan kaustik, kurangi partikel, kecilkan resolusi shader).
 * Parameter ?q=0|1|2 memaksa tingkat tertentu (untuk pengujian): FPS tetap diukur, tetapi kualitas tidak diturunkan.
 * ?bgdebug membuka store latar di window.__bg (waktu render shader, FPS, kualitas) untuk verifikasi.
 */
export function QualityGovernor() {
  const reduced = useReducedMotion();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("bgdebug")) (window as unknown as { __bg?: typeof backgroundStore }).__bg = backgroundStore;
    const forcedRaw = params.get("q");
    const forced = forcedRaw !== null && /^[012]$/.test(forcedRaw);
    if (forced) backgroundStore.setState({ quality: Number(forcedRaw) as Quality });
    if (reduced) return;

    let state = initialGovernor(backgroundStore.getState().quality);
    let raf = 0;
    const start = performance.now();
    let frames = 0;
    let windowStart = start + WARMUP_MS;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) {
        frames = 0;
        windowStart = now;
        return;
      }
      if (now < start + WARMUP_MS) return;
      frames++;
      const elapsed = now - windowStart;
      if (elapsed >= SAMPLE_MS) {
        const fps = (frames * 1000) / elapsed;
        frames = 0;
        windowStart = now;
        backgroundStore.setState({ fps: Math.round(fps) });
        if (forced) return;
        state = stepGovernor(state, fps, elapsed);
        if (state.level !== backgroundStore.getState().quality) backgroundStore.setState({ quality: state.level });
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return null;
}
