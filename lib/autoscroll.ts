import { clusterAtY, type TimelineLayout } from "./layout";

export type AutoSpeed = 1 | 2 | 4;
export const AUTO_SPEEDS: readonly AutoSpeed[] = [1, 2, 4];

/** Kecepatan dasar (px per detik) pada 1x: cukup lambat untuk membaca judul dan kalimat pembuka kartu. */
export const AUTO_BASE_PX_S = 240;
/** Di dalam klaster peristiwa gulir melambat supaya kartu sempat dibaca. */
export const AUTO_IN_CLUSTER = 0.5;
/** Di bentangan kosong (tanpa peristiwa di garis acuan) gulir dipercepat. */
export const AUTO_IN_GAP = 1.7;
/** Tepi kartu: melambat sedikit sebelum klaster dimulai. */
const LEAD_PX = 120;

/**
 * Kecepatan gulir otomatis (px per detik) di posisi lintasan y: melambat saat garis acuan berada di
 * dalam klaster peristiwa, dan melaju di bentangan kosong. Murni (tanpa DOM) supaya mudah diuji.
 */
export function autoSpeedAt(layout: TimelineLayout, y: number, speed: AutoSpeed): number {
  const inCluster = clusterAtY(layout, y + LEAD_PX) !== null || clusterAtY(layout, y) !== null;
  return AUTO_BASE_PX_S * speed * (inCluster ? AUTO_IN_CLUSTER : AUTO_IN_GAP);
}

/** Siklus kecepatan berikutnya: 1 → 2 → 4 → 1. */
export function nextAutoSpeed(s: AutoSpeed): AutoSpeed {
  return AUTO_SPEEDS[(AUTO_SPEEDS.indexOf(s) + 1) % AUTO_SPEEDS.length];
}
