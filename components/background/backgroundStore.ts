"use client";

import { useSyncExternalStore } from "react";
import { createStore } from "zustand/vanilla";
import type { Quality } from "@/lib/background";

export type SkyStatus = "pending" | "webgl" | "fallback";

export interface BackgroundState {
  /** tingkat kualitas saat ini (diturunkan otomatis oleh QualityGovernor) */
  quality: Quality;
  /** apakah shader WebGL berjalan atau memakai gradien cadangan */
  sky: SkyStatus;
  /** rata-rata waktu CPU per frame pemanggilan render shader (ms), untuk verifikasi */
  skyMs: number;
  /** FPS terukur */
  fps: number;
  /** efek bara dan abu 0..1 (dihitung dari peristiwa bernuansa api) */
  eventFx: number;
}

export const backgroundStore = createStore<BackgroundState>(() => ({ quality: 2, sky: "pending", skyMs: 0, fps: 60, eventFx: 0 }));

const SAVED_KEY = "setapak-kualitas";
const SAVED_TTL_MS = 3 * 24 * 3600 * 1000;
export type SavedQuality = "0" | "1" | "2" | "off";

/** Tingkat kualitas yang terakhir dipelajari di perangkat ini (kedaluwarsa 3 hari), supaya muat ulang tidak tersendat lagi. */
export function readSavedQuality(): SavedQuality | null {
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    if (!raw) return null;
    const [v, t] = raw.split("|");
    if (!/^(0|1|2|off)$/.test(v) || Date.now() - Number(t) > SAVED_TTL_MS) return null;
    return v as SavedQuality;
  } catch {
    return null;
  }
}

export function saveQuality(v: SavedQuality): void {
  try {
    window.localStorage.setItem(SAVED_KEY, `${v}|${Date.now()}`);
  } catch {
    /* penyimpanan diblokir: abaikan */
  }
}

export function useSkyStatus(): SkyStatus {
  return useSyncExternalStore(
    backgroundStore.subscribe,
    () => backgroundStore.getState().sky,
    () => "pending" as SkyStatus
  );
}

export function useQuality(): Quality {
  return useSyncExternalStore(
    backgroundStore.subscribe,
    () => backgroundStore.getState().quality,
    () => 2 as Quality
  );
}
