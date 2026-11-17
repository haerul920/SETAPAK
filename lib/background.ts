/**
 * Latar lima lapis (docs/BACKGROUND.md): parameter murni yang dipakai shader langit, pemandangan
 * bertingkat, partikel depan, dan penjaga kualitas. Tanpa DOM supaya bisa diuji.
 */
import { hexToRgb } from "./atmosphere";
import type { TimeScale } from "./time-scale";

/* ------------------------------------------------------------------ */
/* Masa pemandangan                                                    */
/* ------------------------------------------------------------------ */

export type SceneEra = "purba" | "seni-cadas" | "senyap" | "klasik" | "majapahit" | "maritim" | "kolonial" | "kemerdekaan" | "kini";

export interface SceneRange {
  era: SceneEra;
  from: number;
  to: number;
}

/** Batas masa mengikuti docs/BACKGROUND.md dan docs/ATMOSPHERE.md. */
export const SCENE_RANGES: readonly SceneRange[] = [
  { era: "purba", from: -Infinity, to: -60_000 },
  { era: "seni-cadas", from: -60_000, to: -5_000 },
  { era: "senyap", from: -5_000, to: 0 },
  { era: "klasik", from: 0, to: 1_250 },
  { era: "majapahit", from: 1_250, to: 1_500 },
  { era: "maritim", from: 1_500, to: 1_730 },
  { era: "kolonial", from: 1_730, to: 1_945 },
  { era: "kemerdekaan", from: 1_945, to: 1_960 },
  { era: "kini", from: 1_960, to: Infinity },
];

export function sceneEraAt(year: number): SceneEra {
  for (const r of SCENE_RANGES) if (year < r.to) return r.era;
  return "kini";
}

/** Rentang y tiap masa pada satu skala (batas tak hingga diganti nilai besar). */
export function sceneSpans(scale: TimeScale): { era: SceneEra; y0: number; y1: number }[] {
  return SCENE_RANGES.map((r) => ({
    era: r.era,
    y0: r.from === -Infinity ? -1e9 : scale.yearToY(r.from),
    y1: r.to === Infinity ? 1e9 : scale.yearToY(r.to),
  }));
}

/**
 * Kekuatan masa pada posisi y (0 sampai 1): naik sepanjang `fade` sebelum awal masa, turun sepanjang
 * `fade` setelah akhir. Dua masa bersebelahan selalu bersilang-pudar, tidak pernah terpotong mendadak.
 */
export function eraStrength(span: { y0: number; y1: number }, y: number, fade: number): number {
  const inF = Math.min(1, Math.max(0, (y - (span.y0 - fade)) / fade));
  const outF = Math.min(1, Math.max(0, (span.y1 + fade - y) / fade));
  return Math.min(inF, outF);
}

/* ------------------------------------------------------------------ */
/* Parameter shader langit                                             */
/* ------------------------------------------------------------------ */

export interface SkyParams {
  /** kepadatan kabut 0..1 */
  fog: number;
  /** kekuatan sinar cahaya 0..1 */
  rays: number;
  /** kekuatan kaustik air 0..1 */
  caustics: number;
  /** warna cahaya (sinar, kabut) sebagai RGB 0..1 */
  light: [number, number, number];
}

interface SkyStop {
  year: number;
  fog: number;
  rays: number;
  caustics: number;
  light: string;
}

/** Kabut paling pekat di masa purba; sinar paling kuat pagi 2026; kaustik di masa maritim. */
export const SKY_STOPS: readonly SkyStop[] = [
  { year: 2026 - 1_650_000, fog: 0.85, rays: 0.0, caustics: 0, light: "#8a6a4a" },
  { year: -60_000, fog: 0.7, rays: 0.05, caustics: 0, light: "#b07a4a" },
  { year: -5_000, fog: 0.75, rays: 0.25, caustics: 0, light: "#8fb08a" },
  { year: 0, fog: 0.6, rays: 0.5, caustics: 0, light: "#e8c27a" },
  { year: 700, fog: 0.55, rays: 0.65, caustics: 0, light: "#f0cf86" },
  { year: 1250, fog: 0.5, rays: 0.55, caustics: 0, light: "#e89a64" },
  { year: 1500, fog: 0.55, rays: 0.35, caustics: 0.8, light: "#7fc4d4" },
  { year: 1730, fog: 0.45, rays: 0.2, caustics: 0.5, light: "#d8c28f" },
  { year: 1945, fog: 0.4, rays: 0.3, caustics: 0, light: "#f0b070" },
  { year: 1960, fog: 0.35, rays: 0.5, caustics: 0, light: "#c9d6e0" },
  { year: 2026, fog: 0.25, rays: 1.0, caustics: 0, light: "#fff1cf" },
];

/** Penyusun parameter langit untuk satu skala: titik tahun dipetakan ke y lalu diinterpolasi linear. */
export function createSky(scale: TimeScale): (y: number) => SkyParams {
  const stops = SKY_STOPS.map((s) => ({ y: scale.yearToY(s.year), fog: s.fog, rays: s.rays, caustics: s.caustics, light: hexToRgb(s.light) }));
  return function at(y: number): SkyParams {
    let i = 1;
    while (i < stops.length - 1 && stops[i].y < y) i++;
    const a = stops[i - 1];
    const b = stops[i];
    const t = b.y === a.y ? 1 : Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y)));
    const l = (k: 0 | 1 | 2) => a.light[k] + (b.light[k] - a.light[k]) * t;
    return {
      fog: a.fog + (b.fog - a.fog) * t,
      rays: a.rays + (b.rays - a.rays) * t,
      caustics: a.caustics + (b.caustics - a.caustics) * t,
      light: [l(0), l(1), l(2)],
    };
  };
}

/* ------------------------------------------------------------------ */
/* Efek peristiwa (bara dan abu)                                       */
/* ------------------------------------------------------------------ */

/** Kata kunci peristiwa letusan atau kebakaran yang memicu bara dan abu di shader. */
const FIRE_WORDS = /letusan|erupsi|meletus|kebakaran|terbakar|dibakar|lahar|api\b|hangus|ledakan|dibom/i;

export interface FxWindow {
  y0: number;
  y1: number;
}

/** Jendela y (dalam px lintasan) untuk peristiwa yang bernuansa api atau abu. */
export function fxWindows(events: readonly { id: string; title: string; narrative?: string }[], eventY: ReadonlyMap<string, number>, pad: number): FxWindow[] {
  const out: FxWindow[] = [];
  for (const ev of events) {
    if (!FIRE_WORDS.test(`${ev.title} ${ev.narrative ?? ""}`)) continue;
    const y = eventY.get(ev.id);
    if (y !== undefined) out.push({ y0: y - pad, y1: y + pad });
  }
  return out.sort((a, b) => a.y0 - b.y0);
}

/** Kekuatan efek api 0..1 pada y: naik dan turun linear di tepi jendela. */
export function fxAt(windows: readonly FxWindow[], y: number, ramp: number): number {
  let best = 0;
  for (const w of windows) {
    if (y < w.y0 - ramp) break;
    const d = y < w.y0 ? (w.y0 - y) : y > w.y1 ? y - w.y1 : 0;
    best = Math.max(best, 1 - d / ramp);
  }
  return Math.min(1, Math.max(0, best));
}

/* ------------------------------------------------------------------ */
/* Partikel depan                                                      */
/* ------------------------------------------------------------------ */

export type ParticleKind = "dust" | "ash" | "leaf" | "drop" | "spray" | "paper" | "pollen" | "brick";

export interface ParticleSpec {
  kind: ParticleKind;
  /** warna dasar rgb(a, b, c) tanpa alfa */
  color: [number, number, number];
  /** diameter dalam px: [min, maks] */
  size: [number, number];
  /** kecepatan jatuh/naik px per detik (negatif naik) */
  speed: number;
  /** ayunan horizontal px */
  sway: number;
}

export const PARTICLES: Record<SceneEra, ParticleSpec> = {
  purba: { kind: "dust", color: [200, 168, 120], size: [18, 52], speed: 14, sway: 14 },
  "seni-cadas": { kind: "drop", color: [170, 200, 214], size: [14, 34], speed: 70, sway: 4 },
  senyap: { kind: "leaf", color: [120, 170, 96], size: [26, 64], speed: 22, sway: 46 },
  klasik: { kind: "dust", color: [240, 200, 120], size: [18, 56], speed: -10, sway: 22 },
  majapahit: { kind: "brick", color: [214, 130, 90], size: [16, 46], speed: 12, sway: 16 },
  maritim: { kind: "spray", color: [210, 236, 244], size: [14, 40], speed: -18, sway: 30 },
  kolonial: { kind: "paper", color: [226, 210, 176], size: [24, 58], speed: 18, sway: 34 },
  kemerdekaan: { kind: "paper", color: [240, 200, 140], size: [22, 54], speed: 16, sway: 30 },
  kini: { kind: "pollen", color: [255, 244, 214], size: [16, 48], speed: -8, sway: 26 },
};

/** Jumlah partikel menurut kualitas: normal 20 sampai 40, turun saat kualitas dikurangi. */
export function particleCount(quality: Quality, mobile: boolean): number {
  const base = quality >= 2 ? 36 : quality === 1 ? 24 : 12;
  return mobile ? Math.round(base * 0.6) : base;
}

/* ------------------------------------------------------------------ */
/* Penjaga kualitas                                                    */
/* ------------------------------------------------------------------ */

/** 2 = penuh (sinar, kaustik, 36 partikel), 1 = sedang (tanpa sinar), 0 = hemat (shader sederhana, partikel sedikit). */
export type Quality = 0 | 1 | 2;

export const FPS_FLOOR = 45;
export const FPS_WINDOW_MS = 2000;
/** Jeda setelah penurunan sebelum penilaian berikutnya, supaya kualitas tidak jatuh berturut-turut. */
export const FPS_COOLDOWN_MS = 2500;

export interface GovernorState {
  level: Quality;
  /** milidetik berturut-turut di bawah ambang */
  lowMs: number;
  /** milidetik jeda tersisa */
  cooldownMs: number;
}

export const initialGovernor = (level: Quality = 2): GovernorState => ({ level, lowMs: 0, cooldownMs: 0 });

/**
 * Satu langkah penjaga: `fps` terukur selama `dtMs`. Bila FPS di bawah 45 selama 2 detik berturut-turut,
 * kualitas turun satu tingkat (dengan jeda). FPS yang pulih mereset hitungan.
 */
export function stepGovernor(state: GovernorState, fps: number, dtMs: number): GovernorState {
  if (state.cooldownMs > 0) return { ...state, cooldownMs: Math.max(0, state.cooldownMs - dtMs), lowMs: 0 };
  if (fps >= FPS_FLOOR) return state.lowMs === 0 ? state : { ...state, lowMs: 0 };
  const lowMs = state.lowMs + dtMs;
  if (lowMs >= FPS_WINDOW_MS && state.level > 0) return { level: (state.level - 1) as Quality, lowMs: 0, cooldownMs: FPS_COOLDOWN_MS };
  return { ...state, lowMs };
}

/** Skala resolusi kanvas shader menurut kualitas (0,5x normal, lebih kecil saat hemat). */
export function shaderScale(quality: Quality): number {
  return quality >= 1 ? 0.5 : 0.35;
}
