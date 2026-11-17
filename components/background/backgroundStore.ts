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
