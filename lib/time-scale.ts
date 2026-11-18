/**
 * Skala waktu bertingkat SETAPAK (docs/SCROLL_ENGINE.md bagian 1).
 *
 * Skala dibangun dari "simpul" (knot) berpasangan { year, y }. Di antara dua simpul hubungannya
 * linear, jadi penghitung berjalan mulus. Simpul berurutan dengan tahun sama membentuk "tahanan"
 * (hold): y bertambah, tahun tetap. Tahanan dipakai untuk memberi ruang klaster peristiwa
 * (lib/layout.ts) sehingga penghitung menahan tahun klaster saat objeknya dilewati, sementara
 * yToYear tetap benar di setiap piksel.
 *
 * Tahun memakai sortKey (tahun astronomis, negatif = lampau).
 */

export type SegmentId = "A" | "B" | "C" | "D" | "E" | "F";
export type Lang = "id" | "en";

export interface Segment {
  id: SegmentId;
  from: number;
  to: number;
  /** panjang desktop dalam px */
  px: number;
  /** satuan garis skala lokal (tahun) */
  tick: number;
}

export const END_YEAR = 2026;
/** 1,65 juta tahun sebelum 2026, sehingga penghitung pembuka tepat "1.650.000 TAHUN LALU". */
export const START_YEAR = 2026 - 1_650_000;


/** Nilai awal desktop dari docs/SCROLL_ENGINE.md. Mobile dikalikan MOBILE_FACTOR. */
export const SEGMENTS: readonly Segment[] = [
  { id: "A", from: START_YEAR, to: -60_000, px: 9_000, tick: 100_000 },
  { id: "B", from: -60_000, to: -5_000, px: 10_000, tick: 1_000 },
  { id: "C", from: -5_000, to: 0, px: 2_500, tick: 500 },
  { id: "D", from: 0, to: 1_500, px: 24_000, tick: 100 },
  { id: "E", from: 1_500, to: 1_900, px: 24_000, tick: 10 },
  { id: "F", from: 1_900, to: END_YEAR, px: 30_240, tick: 1 },
];

export const MOBILE_FACTOR = 0.8;

/** Perlambatan lokal: rentang tahun yang diberi panjang tambahan (momen 16 sampai 17 Agustus 1945). */
export interface Stretch {
  from: number;
  to: number;
  extra: number;
}

/**
 * 16 sampai 17 Agustus 1945 diperlambat untuk jam dinding dan narasi bermesin tik; Agustus sampai
 * Desember 1945 diperlebar agar tujuh peristiwa rangkaian 1945 tampil berurutan (docs/OBJECTS.md, momen 12).
 */
export const DEFAULT_STRETCHES: readonly Stretch[] = [
  { from: 1945.6, to: 1945.64, extra: 1_800 },
  { from: 1945.64, to: 1946, extra: 2_600 },
];

/** Tahanan: tambahan px pada satu tahun (tahun tetap selama px itu digulir). */
export interface Hold {
  year: number;
  px: number;
}

export interface Knot {
  year: number;
  y: number;
}

export interface ScaleOptions {
  mobile?: boolean;
  stretches?: readonly Stretch[];
  holds?: readonly Hold[];
}

export interface TimeScale {
  readonly knots: readonly Knot[];
  readonly total: number;
  readonly factor: number;
  yearToY(year: number): number;
  yToYear(y: number): number;
  segmentAt(year: number): Segment;
  /** px per tahun pada tahun tertentu (tanpa tahanan) */
  pxPerYear(year: number): number;
  /** y awal dan akhir tahanan pada tahun ini, atau null */
  holdAt(year: number): { y0: number; y1: number } | null;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function segmentAt(year: number): Segment {
  for (const s of SEGMENTS) if (year < s.to) return s;
  return SEGMENTS[SEGMENTS.length - 1];
}

export function createTimeScale(opts: ScaleOptions = {}): TimeScale {
  const factor = opts.mobile ? MOBILE_FACTOR : 1;
  const stretches = [...(opts.stretches ?? DEFAULT_STRETCHES)].sort((a, b) => a.from - b.from);
  const holds = [...(opts.holds ?? [])].filter((h) => h.px > 0).sort((a, b) => a.year - b.year);

  // 1. Simpul dasar: batas segmen, lalu batas perlambatan.
  const base: Knot[] = [];
  let y = 0;
  base.push({ year: SEGMENTS[0].from, y: 0 });
  for (const s of SEGMENTS) {
    y += s.px * factor;
    base.push({ year: s.to, y });
  }
  const interp = (list: Knot[], year: number) => {
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1];
      const b = list[i];
      if (year <= b.year) return a.y + ((year - a.year) / (b.year - a.year)) * (b.y - a.y);
    }
    return list[list.length - 1].y;
  };
  let knots = base;
  for (const st of stretches) {
    const y0 = interp(knots, st.from);
    const y1 = interp(knots, st.to);
    const add = st.extra * factor;
    const next: Knot[] = [];
    for (const k of knots) {
      if (k.year < st.from) next.push(k);
      else if (k.year > st.to) next.push({ year: k.year, y: k.y + add });
    }
    next.push({ year: st.from, y: y0 }, { year: st.to, y: y1 + add });
    next.sort((a, b) => a.year - b.year || a.y - b.y);
    knots = next;
  }

  // 2. Tahanan: sisipkan pasangan simpul tahun-sama dan geser semua yang sesudahnya.
  for (const h of holds) {
    const yr = clamp(h.year, START_YEAR, END_YEAR);
    const add = h.px * factor;
    const at = interp(knots, yr);
    const next: Knot[] = [];
    for (const k of knots) {
      if (k.year < yr || (k.year === yr && k.y <= at)) next.push(k);
      else next.push({ year: k.year, y: k.y + add });
    }
    next.push({ year: yr, y: at }, { year: yr, y: at + add });
    next.sort((a, b) => a.year - b.year || a.y - b.y);
    // buang duplikat persis
    knots = next.filter((k, i) => i === 0 || k.year !== next[i - 1].year || k.y !== next[i - 1].y);
  }

  const total = knots[knots.length - 1].y;

  function yearToY(year: number): number {
    if (!Number.isFinite(year)) return 0;
    if (year <= knots[0].year) return 0;
    if (year >= END_YEAR) {
      // tahun akhir: awal tahanan terakhir (bila ada) supaya penutup tetap di 2026
      for (let i = 0; i < knots.length; i++) if (knots[i].year >= END_YEAR) return knots[i].y;
      return total;
    }
    // biner: simpul pertama dengan year >= target
    let lo = 0;
    let hi = knots.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (knots[mid].year < year) lo = mid + 1;
      else hi = mid;
    }
    const b = knots[lo];
    if (b.year === year) return b.y; // awal tahanan bila ada
    const a = knots[lo - 1];
    return a.y + ((year - a.year) / (b.year - a.year)) * (b.y - a.y);
  }

  function yToYear(yy: number): number {
    if (!Number.isFinite(yy)) return START_YEAR;
    if (yy <= 0) return START_YEAR;
    if (yy >= total) return END_YEAR;
    let lo = 0;
    let hi = knots.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (knots[mid].y < yy) lo = mid + 1;
      else hi = mid;
    }
    const b = knots[lo];
    const a = knots[lo - 1] ?? b;
    if (b.y === a.y) return b.year;
    return a.year + ((yy - a.y) / (b.y - a.y)) * (b.year - a.year);
  }

  function pxPerYear(year: number): number {
    const yr = clamp(year, START_YEAR, END_YEAR - 1e-6);
    let px = segmentAt(yr).px * factor / (segmentAt(yr).to - segmentAt(yr).from);
    for (const st of stretches) if (yr >= st.from && yr < st.to) px += (st.extra * factor) / (st.to - st.from);
    return px;
  }

  function holdAt(year: number): { y0: number; y1: number } | null {
    const same = knots.filter((k) => k.year === year);
    if (same.length < 2) return null;
    return { y0: same[0].y, y1: same[same.length - 1].y };
  }

  return { knots, total, factor, yearToY, yToYear, segmentAt, pxPerYear, holdAt };
}

/* ------------------------------------------------------------------ */
/* FORMAT                                                              */
/* ------------------------------------------------------------------ */

const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function groupDigits(n: number, lang: Lang): string {
  const s = Math.abs(Math.trunc(n)).toString();
  const sep = lang === "id" ? "." : ",";
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

export type YearKind = "ago" | "bce" | "ce" | "year";

export interface YearParts {
  kind: YearKind;
  /** angka yang ditampilkan (selalu bilangan bulat non-negatif) */
  value: number;
  prefix: string;
  suffix: string;
}

/** Komponen format tahun, dipakai penghitung odometer (angka dan teks terpisah). */
export function yearParts(year: number, lang: Lang): YearParts {
  const y = Number.isFinite(year) ? year : START_YEAR;
  if (y < -10_000) {
    const ago = Math.max(0, Math.round(END_YEAR - y));
    return { kind: "ago", value: ago, prefix: "", suffix: lang === "id" ? " TAHUN LALU" : " YEARS AGO" };
  }
  if (y < 1) {
    // tahun astronomis 0 = 1 SM
    const bce = Math.max(1, Math.round(1 - y));
    return { kind: "bce", value: bce, prefix: "", suffix: lang === "id" ? " SM" : " BCE" };
  }
  if (y < 1000) {
    const ce = Math.max(1, Math.floor(y));
    return lang === "id" ? { kind: "ce", value: ce, prefix: "TAHUN ", suffix: " M" } : { kind: "ce", value: ce, prefix: "", suffix: " CE" };
  }
  return { kind: "year", value: Math.min(END_YEAR, Math.floor(y)), prefix: "", suffix: "" };
}

/** Format tahun untuk penghitung (docs/SCROLL_ENGINE.md bagian 1). Tidak pernah NaN. */
export function formatYear(year: number, lang: Lang): string {
  const p = yearParts(year, lang);
  const num = p.kind === "year" ? String(p.value) : groupDigits(p.value, lang);
  return `${p.prefix}${num}${p.suffix}`;
}

/** Nama bulan untuk segmen F saat guliran lambat (pecahan tahun ke bulan). */
export function monthOf(year: number, lang: Lang): string {
  const frac = year - Math.floor(year);
  const idx = clamp(Math.floor(frac * 12), 0, 11);
  return (lang === "id" ? MONTHS_ID : MONTHS_EN)[idx];
}

/** Label batas segmen yang dibulatkan agar enak dibaca (62.000 th lalu, 5.000 SM). */
export function boundaryLabel(year: number, lang: Lang): string {
  if (year < -10_000) return tickLabel(END_YEAR - Math.round((END_YEAR - year) / 1000) * 1000, lang);
  if (year < 1) return tickLabel(1 - Math.round((1 - year) / 100) * 100, lang);
  return tickLabel(year, lang);
}

/**
 * Tahun-tahun garis skala lokal dalam satuan tampilan: kelipatan "tahun lalu" di segmen A dan B,
 * kelipatan SM di segmen C, dan tahun Masehi sesudahnya.
 */
export function tickYears(seg: Segment): number[] {
  const out: number[] = [];
  if (seg.to <= -10_000 || seg.from < -10_000) {
    const agoMax = END_YEAR - seg.from;
    const agoMin = END_YEAR - seg.to;
    for (let n = Math.floor(agoMax / seg.tick) * seg.tick; n > agoMin; n -= seg.tick) out.push(END_YEAR - n);
  } else if (seg.to <= 1) {
    const bceMax = 1 - seg.from;
    for (let n = Math.floor(bceMax / seg.tick) * seg.tick; n >= seg.tick; n -= seg.tick) out.push(1 - n);
  } else {
    for (let yr = Math.ceil(seg.from / seg.tick) * seg.tick; yr <= seg.to; yr += seg.tick) if (yr < seg.to || seg.to === END_YEAR) out.push(yr);
  }
  return out.filter((yr) => yr >= START_YEAR && yr <= END_YEAR);
}

/** Label tahun bulat untuk garis skala lokal dan penggaris. */
export function tickLabel(year: number, lang: Lang): string {
  if (year < -10_000) return `${groupDigits(END_YEAR - year, lang)}${lang === "id" ? " th lalu" : " yrs ago"}`;
  if (year < 1) return `${groupDigits(1 - year, lang)} ${lang === "id" ? "SM" : "BCE"}`;
  if (year < 1000) return `${year} ${lang === "id" ? "M" : "CE"}`;
  return String(year);
}

/**
 * Menerjemahkan masukan "Pergi ke tahun..." menjadi tahun astronomis.
 * Menerima "1945", "850", "-40000", "40000 tahun lalu", "40.000 years ago", "3200 SM", "3200 BCE".
 */
export function parseYearInput(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  const m = s.match(/^(-)?\s*([\d.,\s]+)\s*(tahun lalu|th lalu|years ago|year ago|ya|sm|bce|bc|m|ce|ad)?$/);
  if (!m) return null;
  const rawNum = m[2].trim();
  // pecahan tahun (misal "1669.45" atau "1945,62"): paling banyak 4 digit bulat dan 1 sampai 2 desimal.
  // Pemisah ribuan selalu diikuti 3 digit, jadi tidak tertukar.
  const decimal = /^\d{1,4}[.,]\d{1,2}$/.test(rawNum);
  const digits = decimal ? rawNum.replace(",", ".") : rawNum.replace(/[.,\s]/g, "");
  if (!/^\d+(\.\d+)?$/.test(digits)) return null;
  const n = Number(digits);
  const neg = Boolean(m[1]);
  const unit = m[3];
  let year: number;
  if (unit && /lalu|ago|^ya$/.test(unit)) year = END_YEAR - n;
  else if (unit && /^(sm|bce|bc)$/.test(unit)) year = 1 - n;
  else year = neg ? -n : n;
  return clamp(year, START_YEAR, END_YEAR);
}

/** Satu layar mewakili berapa tahun pada tahun ini, dibulatkan agar enak dibaca. */
export function yearsPerScreen(scale: TimeScale, year: number, viewport: number): number {
  const v = viewport / scale.pxPerYear(year);
  if (v >= 1000) return Math.round(v / 100) * 100;
  if (v >= 100) return Math.round(v / 10) * 10;
  if (v >= 10) return Math.round(v);
  return Math.round(v * 10) / 10;
}

/** Jarak guliran dalam meter (1 px CSS ≈ 0,26 mm). */
export function pxToMeters(px: number): number {
  return px * 0.00026;
}
