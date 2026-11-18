"use client";

import { useEffect } from "react";
import { initialGovernor, stepGovernor, type Quality } from "@/lib/background";
import { useReducedMotion } from "@/lib/store";
import { backgroundStore, readSavedQuality, saveQuality } from "./backgroundStore";

/** Penundaan sebelum penilaian dimulai, supaya beban muat awal tidak dianggap lambatnya latar. */
const WARMUP_MS = 1500;
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
    // perangkat yang jelas lemah (sedikit inti atau memori, layar sentuh kecil) langsung mulai di kualitas sedang
    const nav = navigator as Navigator & { deviceMemory?: number };
    const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || window.matchMedia("(max-width: 767px)").matches;
    if (!forced && weak && backgroundStore.getState().quality > 1) backgroundStore.setState({ quality: 1 });
    // tingkat yang dipelajari pada kunjungan sebelumnya langsung dipakai (hanya menurunkan, tidak menaikkan)
    const saved = forced ? null : readSavedQuality();
    if (saved === "off") backgroundStore.setState({ quality: 0, sky: "fallback" });
    else if (saved !== null && Number(saved) < backgroundStore.getState().quality) backgroundStore.setState({ quality: Number(saved) as Quality });
    // data-quality di <html> memungkinkan CSS mematikan hiasan saat hemat (lihat objects.css)
    const root = document.documentElement;
    root.dataset.quality = String(backgroundStore.getState().quality);
    const unsubQ = backgroundStore.subscribe((s, prev) => {
      if (s.quality !== prev.quality) root.dataset.quality = String(s.quality);
    });
    if (reduced) return () => unsubQ();

    let state = initialGovernor(backgroundStore.getState().quality);
    let raf = 0;
    const start = performance.now();
    let frames = 0;
    let windowStart = start + WARMUP_MS;
    let lowAtZeroMs = 0;
    // ?fps menampilkan overlay diagnostik: FPS, kualitas, status langit, dan frame terburuk 5 detik terakhir
    let hud: HTMLDivElement | null = null;
    const deltas: { t: number; d: number }[] = [];
    let prevT = 0;
    if (params.has("fps")) {
      hud = document.createElement("div");
      hud.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:99999;padding:6px 9px;border-radius:8px;background:rgba(0,0,0,.78);color:#9cf5a8;font:11px/1.35 monospace;pointer-events:none;white-space:pre";
      document.body.appendChild(hud);
    }
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) {
        frames = 0;
        windowStart = now;
        return;
      }
      if (hud) {
        if (prevT) deltas.push({ t: now, d: now - prevT });
        prevT = now;
        while (deltas.length && now - deltas[0].t > 5000) deltas.shift();
      }
      if (now < start + WARMUP_MS) return;
      frames++;
      const elapsed = now - windowStart;
      if (elapsed >= SAMPLE_MS) {
        const fps = (frames * 1000) / elapsed;
        frames = 0;
        windowStart = now;
        backgroundStore.setState({ fps: Math.round(fps) });
        if (hud) {
          const worst = deltas.reduce((m, x) => Math.max(m, x.d), 0);
          const over = deltas.filter((x) => x.d > 33).length;
          const st = backgroundStore.getState();
          hud.textContent = `${Math.round(fps)} FPS | frame terburuk ${worst.toFixed(0)} ms | >33 ms: ${over}
kualitas ${st.quality} | langit ${st.sky}`;
        }
        if (forced) return;
        state = stepGovernor(state, fps, elapsed);
        if (state.level !== backgroundStore.getState().quality) {
          backgroundStore.setState({ quality: state.level });
          saveQuality(String(state.level) as "0" | "1" | "2");
        }
        // sudah di tingkat terendah tetapi masih di bawah 30 FPS selama 3 detik: matikan WebGL sama sekali
        if (state.level === 0 && state.cooldownMs === 0 && fps < 30 && backgroundStore.getState().sky !== "fallback") {
          lowAtZeroMs += elapsed;
          if (lowAtZeroMs >= 3000) {
            backgroundStore.setState({ sky: "fallback" });
            saveQuality("off");
          }
        } else if (fps >= 30) lowAtZeroMs = 0;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      hud?.remove();
      unsubQ();
    };
  }, [reduced]);

  return null;
}
