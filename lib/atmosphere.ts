/**
 * Atmosfer kontinu (docs/ATMOSPHERE.md): warna latar diinterpolasi di ruang OKLCH berdasarkan
 * posisi y di antara titik-titik warna tahun, plus luminans untuk memilih warna teks.
 */
import type { TimeScale } from "./time-scale";

export interface ColorStop {
  year: number;
  top: string;
  bottom: string;
}

export const COLOR_STOPS: readonly ColorStop[] = [
  { year: 2026 - 1_650_000, top: "#0b0806", bottom: "#17110b" },
  { year: -60_000, top: "#120c0a", bottom: "#2a1712" },
  { year: -5_000, top: "#10120f", bottom: "#1b2117" },
  { year: 700, top: "#141812", bottom: "#26301f" },
  { year: 1250, top: "#1b120d", bottom: "#3a2015" },
  { year: 1500, top: "#0c1519", bottom: "#16323d" },
  { year: 1730, top: "#17140f", bottom: "#2e281d" },
  { year: 1945, top: "#1f1414", bottom: "#3a2020" },
  { year: 1960, top: "#1a1f24", bottom: "#2a333b" },
  { year: 2026, top: "#d9e2e8", bottom: "#f3efe6" },
];

export type Oklch = [l: number, c: number, h: number];

/* ---- konversi warna (sRGB <-> OKLab <-> OKLCH), rumus Björn Ottosson ---- */

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const to = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return [L, C, H];
}

export function oklchToHex([L, C, H]: Oklch): string {
  const hr = (H * Math.PI) / 180;
  const A = C * Math.cos(hr);
  const B = C * Math.sin(hr);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return rgbToHex([toGamma(r), toGamma(g), toGamma(b)]);
}

/** Interpolasi OKLCH dengan rona lewat jalur terpendek (rona diabaikan bila kroma hampir nol). */
export function mixOklch(a: Oklch, b: Oklch, t: number): Oklch {
  let ha = a[2];
  let hb = b[2];
  if (a[1] < 0.002) ha = hb;
  if (b[1] < 0.002) hb = ha;
  let dh = hb - ha;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (ha + dh * t + 360) % 360];
}

/** Luminans relatif WCAG (0 gelap, 1 terang). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export interface Atmosphere {
  top: string;
  bottom: string;
  /** luminans rata-rata latar */
  luminance: number;
}

/** Penyusun warna untuk satu skala: titik warna dipetakan ke y, lalu dicari per posisi. */
export function createAtmosphere(scale: TimeScale) {
  const stops = COLOR_STOPS.map((s) => ({ y: scale.yearToY(s.year), top: hexToOklch(s.top), bottom: hexToOklch(s.bottom) }));
  return function at(y: number): Atmosphere {
    let i = 1;
    while (i < stops.length - 1 && stops[i].y < y) i++;
    const a = stops[i - 1];
    const b = stops[i];
    const t = b.y === a.y ? 1 : Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y)));
    const top = oklchToHex(mixOklch(a.top, b.top, t));
    const bottom = oklchToHex(mixOklch(a.bottom, b.bottom, t));
    return { top, bottom, luminance: (relativeLuminance(top) + relativeLuminance(bottom)) / 2 };
  };
}

/** Ambang luminans untuk beralih ke teks gelap (dengan histeresis di pemanggil). */
export const LIGHT_THRESHOLD = 0.18;

/** Rentang luminans "abu-abu tengah": kedua warna teks kurang kontras, keterangan diberi alas. */
export const MID_RANGE: readonly [number, number] = [0.07, 0.42];
