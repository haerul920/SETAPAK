"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { DEFAULT_LAYERS, EMPTY_FILTERS, type Filters, type PetaLayers, type PetaState } from "./peta-data";
import { END_YEAR, START_YEAR } from "./time-scale";
import { FULL_RANGE, normalizeRange, posToYear, type AxisMode, type PlaySpeed, type YearRange } from "./peta-time";

const safeStorage: StateStorage = {
  getItem: (n) => {
    try {
      return window.localStorage.getItem(n);
    } catch {
      return null;
    }
  },
  setItem: (n, v) => {
    try {
      window.localStorage.setItem(n, v);
    } catch {
      /* abaikan */
    }
  },
  removeItem: (n) => {
    try {
      window.localStorage.removeItem(n);
    } catch {
      /* abaikan */
    }
  },
};

/** Opsi aksesibilitas halaman peta (docs/PETA_WAKTU.md bagian 7), disimpan di peramban. */
export type TextSize = "sm" | "md" | "lg";
export const usePetaPrefs = create<{ colorblind: boolean; textSize: TextSize; setColorblind: (v: boolean) => void; setTextSize: (v: TextSize) => void }>()(
  persist(
    (set) => ({
      colorblind: false,
      textSize: "md",
      setColorblind: (colorblind) => set({ colorblind }),
      setTextSize: (textSize) => set({ textSize }),
    }),
    { name: "setapak-peta-prefs", version: 1, storage: createJSONStorage(() => safeStorage), skipHydration: true }
  )
);

export interface FlyTarget {
  lat: number;
  lng: number;
  zoom: number;
  nonce: number;
}

interface PetaUi {
  range: YearRange;
  mode: AxisMode;
  /** titik tahun tunggal (jendela sempit) alih-alih rentang */
  point: boolean;
  filters: Filters;
  showAll: boolean;
  layers: PetaLayers;
  view: { lat: number; lng: number; zoom: number } | null;
  ev: string | null;
  site: string | null;
  playing: boolean;
  speed: PlaySpeed;
  hoverKingdom: string | null;
  hoverSite: string | null;
  fly: FlyTarget | null;
  /** lembar bawah di layar kecil */
  sheet: "none" | "filters" | "list";
  /** status sembunyikan slider pada sumbu waktu */
  timeAxisCollapsed: boolean;
}

interface PetaActions {
  hydrate: (s: PetaState) => void;
  setRange: (r: YearRange) => void;
  setMode: (m: AxisMode) => void;
  setPoint: (v: boolean) => void;
  setFilters: (f: Filters) => void;
  resetFilters: () => void;
  setShowAll: (v: boolean) => void;
  setLayer: (k: keyof PetaLayers, v: boolean) => void;
  setView: (v: PetaUi["view"]) => void;
  select: (site: string | null, ev?: string | null) => void;
  setPlaying: (v: boolean) => void;
  togglePlay: () => void;
  setSpeed: (s: PlaySpeed) => void;
  setHoverKingdom: (id: string | null) => void;
  setHoverSite: (slug: string | null) => void;
  flyTo: (lat: number, lng: number, zoom: number) => void;
  setSheet: (s: PetaUi["sheet"]) => void;
  setTimeAxisCollapsed: (v: boolean) => void;
  resetAll: () => void;
}

let nonce = 0;

export const usePetaStore = create<PetaUi & PetaActions>()((set) => ({
  range: FULL_RANGE,
  mode: "log",
  point: false,
  filters: EMPTY_FILTERS,
  showAll: false,
  layers: DEFAULT_LAYERS,
  view: null,
  ev: null,
  site: null,
  playing: false,
  speed: "auto",
  hoverKingdom: null,
  hoverSite: null,
  fly: null,
  sheet: "none",
  timeAxisCollapsed: false,
  hydrate: (s) => set({ range: s.range, mode: s.mode, filters: s.filters, showAll: s.showAll, layers: s.layers, view: s.view, ev: s.ev, site: s.site }),
  setRange: (r) => set({ range: normalizeRange(r) }),
  setMode: (mode) => set({ mode }),
  setPoint: (point) => set({ point }),
  setFilters: (filters) => set({ filters }),
  resetFilters: () => set({ filters: EMPTY_FILTERS, showAll: false }),
  setShowAll: (showAll) => set({ showAll }),
  setLayer: (k, v) => set((s) => ({ layers: { ...s.layers, [k]: v } })),
  setView: (view) => set({ view }),
  select: (site, ev = null) => set({ site, ev }),
  setPlaying: (playing) => set({ playing }),
  // memutar dari rentang yang sudah mentok di 2026 (atau seluruh sumbu) mulai dari awal sumbu dengan jendela sempit
  togglePlay: () =>
    set((s) => {
      if (s.playing) return { playing: false };
      if (s.range.to >= END_YEAR - 0.5) return { playing: true, point: false, range: { from: START_YEAR, to: posToYear(s.mode, 0.08) } };
      return { playing: true };
    }),
  setSpeed: (speed) => set({ speed }),
  setHoverKingdom: (hoverKingdom) => set({ hoverKingdom }),
  setHoverSite: (hoverSite) => set({ hoverSite }),
  flyTo: (lat, lng, zoom) => set({ fly: { lat, lng, zoom, nonce: ++nonce } }),
  setSheet: (sheet) => set({ sheet }),
  setTimeAxisCollapsed: (timeAxisCollapsed) => set({ timeAxisCollapsed }),
  resetAll: () => set({ range: FULL_RANGE, mode: "log", point: false, filters: EMPTY_FILTERS, showAll: false, layers: DEFAULT_LAYERS, ev: null, site: null, playing: false, view: null, fly: { lat: -2.5, lng: 118, zoom: 3.6, nonce: ++nonce } }),
}));
