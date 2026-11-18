"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { Language } from "./i18n";

/** localStorage yang aman: tidak pernah melempar error (mode privat, kuota penuh, diblokir). */
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* abaikan */
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* abaikan */
    }
  },
};

/* ------------------------------------------------------------------ */
/* Pengaturan dan keadaan UI (jarang berubah, boleh memicu render)      */
/* ------------------------------------------------------------------ */

interface Settings {
  lang: Language;
  noMotion: boolean;
  sound: boolean;
  volume: number;
}

interface UiState {
  /** peristiwa yang laci detailnya terbuka */
  openEventId: string | null;
  /** jejak tingkat 3 (Wikidata) yang laci detailnya terbuka */
  openTraceId: string | null;
  /** gelembung "+N jejak" yang daftarnya terbuka */
  openBubbleId: string | null;
  /** situs yang benangnya sedang disorot (hover) */
  hoverSite: string | null;
  /** klaster tempat garis acuan berada */
  activeClusterId: string | null;
  /** gulir otomatis (tidak disimpan: halaman tidak boleh mulai menggulir sendiri saat dimuat) */
  autoPlay: boolean;
  autoSpeed: 1 | 2 | 4;
}

interface Actions {
  setLang: (lang: Language) => void;
  setNoMotion: (v: boolean) => void;
  setSound: (v: boolean) => void;
  setVolume: (v: number) => void;
  openEvent: (id: string | null) => void;
  openTrace: (id: string | null) => void;
  openBubble: (id: string | null) => void;
  setHoverSite: (slug: string | null) => void;
  setActiveCluster: (id: string | null) => void;
  setAutoPlay: (v: boolean) => void;
  setAutoSpeed: (s: 1 | 2 | 4) => void;
}

export type SetapakState = Settings & UiState & Actions;

export const useSetapakStore = create<SetapakState>()(
  persist(
    (set) => ({
      lang: "id",
      noMotion: false,
      sound: false,
      volume: 0.5,
      openEventId: null,
      openTraceId: null,
      openBubbleId: null,
      hoverSite: null,
      activeClusterId: null,
      autoPlay: false,
      autoSpeed: 1,
      setLang: (lang) => {
        set({ lang });
        if (typeof document !== "undefined") document.documentElement.lang = lang;
      },
      setNoMotion: (noMotion) => set({ noMotion }),
      setSound: (sound) => set({ sound }),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
      openEvent: (openEventId) => set({ openEventId, ...(openEventId ? { openTraceId: null, openBubbleId: null } : {}) }),
      openTrace: (openTraceId) => set({ openTraceId, ...(openTraceId ? { openEventId: null, openBubbleId: null } : {}) }),
      openBubble: (openBubbleId) => set({ openBubbleId }),
      setHoverSite: (hoverSite) => set({ hoverSite }),
      setActiveCluster: (activeClusterId) => set((s) => (s.activeClusterId === activeClusterId ? s : { activeClusterId })),
      setAutoPlay: (autoPlay) => set((s) => (s.autoPlay === autoPlay ? s : { autoPlay })),
      setAutoSpeed: (autoSpeed) => set({ autoSpeed }),
    }),
    {
      name: "setapak-v3",
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      skipHydration: true,
      partialize: (s): Settings => ({ lang: s.lang, noMotion: s.noMotion, sound: s.sound, volume: s.volume }),
    }
  )
);

/* ------------------------------------------------------------------ */
/* Posisi guliran per frame: satu sumber kebenaran, TIDAK memicu render */
/* Komponen berlangganan lewat scrollStore.subscribe dan memperbarui DOM */
/* langsung lewat ref (docs/SCROLL_ENGINE.md bagian 6).                 */
/* ------------------------------------------------------------------ */

export interface ScrollFrame {
  /** posisi garis acuan di dalam lintasan waktu (px) */
  y: number;
  year: number;
  /** px per detik, bertanda */
  velocity: number;
  /** total jarak lintasan */
  total: number;
  /** tinggi layar */
  viewport: number;
}

export const scrollStore = createStore<ScrollFrame>(() => ({ y: 0, year: -1_650_000, velocity: 0, total: 1, viewport: 900 }));

/* ------------------------------------------------------------------ */
/* Gerak dikurangi                                                      */
/* ------------------------------------------------------------------ */

const reducedQuery = "(prefers-reduced-motion: reduce)";
function subscribeReduced(cb: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => undefined;
  const mq = window.matchMedia(reducedQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function getReduced(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(reducedQuery).matches;
}

/** Gabungan prefers-reduced-motion sistem dan toggle "Tanpa Animasi". */
export function useReducedMotion(): boolean {
  const system = useSyncExternalStore(subscribeReduced, getReduced, () => false);
  const toggle = useSetapakStore((s) => s.noMotion);
  return system || toggle;
}

/** Versi non-hook untuk dipakai di dalam callback animasi. */
export function isMotionReduced(): boolean {
  return getReduced() || useSetapakStore.getState().noMotion;
}

/* ------------------------------------------------------------------ */
/* Lebar layar                                                          */
/* ------------------------------------------------------------------ */

const mobileQuery = "(max-width: 767px)";
function subscribeMobile(cb: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => undefined;
  const mq = window.matchMedia(mobileQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** true di bawah 768 px. Di server dianggap null (belum diketahui). */
export function useIsMobile(): boolean | null {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(mobileQuery).matches,
    () => null
  );
}
