/**
 * Sumbu waktu halaman Peta Waktu (docs/PETA_WAKTU.md bagian 2): tiga skala antara tahun dan
 * posisi 0..1 pada sumbu. Murni, tanpa DOM, saling invers, dan monoton.
 *
 *  - linear: posisi sebanding dengan tahun;
 *  - log: logaritmik terhadap "tahun sebelum 2026" (bawaan) supaya masa purba tetap terjangkau;
 *  - scroll: memakai skala bertingkat yang sama dengan guliran (lib/time-scale.ts).
 */
import { createTimeScale, END_YEAR, START_YEAR, type TimeScale } from "./time-scale";

export type AxisMode = "log" | "linear" | "scroll";
export const AXIS_MODES: readonly AxisMode[] = ["log", "linear", "scroll"];

const AGO_MAX = END_YEAR - START_YEAR;
const LOG_MAX = Math.log1p(AGO_MAX);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const clampYear = (v: number) => Math.min(END_YEAR, Math.max(START_YEAR, v));

let scrollScale: TimeScale | null = null;
function scale(): TimeScale {
  // tanpa tahanan klaster: hanya segmen dan perlambatan 1945, jadi tetap monoton ketat
  return (scrollScale ??= createTimeScale());
}

export function yearToPos(mode: AxisMode, year: number): number {
  const y = clampYear(year);
  if (mode === "linear") return clamp01((y - START_YEAR) / AGO_MAX);
  if (mode === "log") return clamp01(1 - Math.log1p(END_YEAR - y) / LOG_MAX);
  return clamp01(scale().yearToY(y) / scale().total);
}

export function posToYear(mode: AxisMode, pos: number): number {
  const p = clamp01(pos);
  if (mode === "linear") return START_YEAR + p * AGO_MAX;
  if (mode === "log") return clampYear(END_YEAR - Math.expm1((1 - p) * LOG_MAX));
  return clampYear(scale().yToYear(p * scale().total));
}

/** Pintasan masa (docs/PETA_WAKTU.md bagian 2). Rentang hanya pintasan, bukan bab. */
export interface EraPreset {
  id: string;
  id_: string;
  en: string;
  from: number;
  to: number;
}

export const ERA_PRESETS: readonly EraPreset[] = [
  { id: "prasejarah", id_: "Prasejarah", en: "Prehistory", from: START_YEAR, to: 0 },
  { id: "klasik", id_: "Klasik", en: "Classical", from: 0, to: 1250 },
  { id: "majapahit", id_: "Majapahit", en: "Majapahit", from: 1250, to: 1527 },
  { id: "kesultanan", id_: "Kesultanan", en: "Sultanates", from: 1500, to: 1800 },
  { id: "kolonial", id_: "Kolonial", en: "Colonial", from: 1800, to: 1945 },
  { id: "kemerdekaan", id_: "Kemerdekaan", en: "Independence", from: 1945, to: 1960 },
  { id: "kini", id_: "Masa kini", en: "Today", from: 1960, to: END_YEAR },
];

export interface YearRange {
  from: number;
  to: number;
}

export const FULL_RANGE: YearRange = { from: START_YEAR, to: END_YEAR };

/** Memastikan rentang berurutan dan di dalam sumbu. */
export function normalizeRange(r: YearRange): YearRange {
  const a = clampYear(Math.min(r.from, r.to));
  const b = clampYear(Math.max(r.from, r.to));
  return { from: a, to: b };
}

/** Langkah panah keyboard dalam tahun, mengikuti kerapatan skala di sekitar tahun itu. */
export function keyStep(mode: AxisMode, year: number, big: boolean): number {
  const p = yearToPos(mode, year);
  const next = posToYear(mode, Math.min(1, p + (big ? 0.02 : 0.002)));
  const prev = posToYear(mode, Math.max(0, p - (big ? 0.02 : 0.002)));
  return Math.max(0.01, (next - prev) / 2);
}

export const PLAY_SPEEDS = [1, 5, 25, 100, "auto"] as const;
export type PlaySpeed = (typeof PLAY_SPEEDS)[number];
