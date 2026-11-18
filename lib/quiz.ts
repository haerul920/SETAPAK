/**
 * Generator kuis SETAPAK (docs/KUIS.md): murni, deterministik menurut seed, tanpa DOM.
 *
 * Semua soal dibangkitkan dari data/index.ts (dan jejak tingkat 3 khusus "Di Mana Ini?"). Tidak ada
 * teks soal yang memuat fakta di luar data. Tingkat memengaruhi toleransi tahun, jarak waktu
 * antarkartu pada "Urutkan Waktu", dan kemiripan pengecoh.
 */
import { sites, sortedEvents, type Category, type SiteWithCategory, type TimelineEvent } from "@/data";
import { seedOf } from "./hash";
import { imagesFor } from "./media";
import { rng } from "./scene-shapes";
import { createTimeScale, END_YEAR, START_YEAR } from "./time-scale";
import { traces } from "./traces";

export type QuizMode = "tebak-tahun" | "urutkan" | "di-mana" | "situs-mana" | "fakta" | "harian";
export type QuestionMode = Exclude<QuizMode, "harian">;
export const QUESTION_MODES: readonly QuestionMode[] = ["tebak-tahun", "urutkan", "di-mana", "situs-mana", "fakta"];
export type Level = "santai" | "sedang" | "ahli";
export type LevelChoice = Level | "adaptif";
export const LEVELS: readonly Level[] = ["santai", "sedang", "ahli"];
export type Verdict = "benar" | "hampir" | "salah";

export interface YearRange {
  from: number;
  to: number;
}
export const ALL_TIME: YearRange = { from: START_YEAR, to: END_YEAR };

export interface YearQ {
  mode: "tebak-tahun";
  id: string;
  level: Level;
  eventId: string;
  mediaId?: string;
  /** tahun jawaban (tahun astronomis) dan toleransinya sesuai presisi label */
  answer: number;
  tolerance: number;
}
export interface OrderQ {
  mode: "urutkan";
  id: string;
  level: Level;
  /** id peristiwa dalam urutan acak */
  items: string[];
  /** id peristiwa dalam urutan kronologis yang benar */
  answer: string[];
}
export interface WhereQ {
  mode: "di-mana";
  id: string;
  level: Level;
  /** satu dari siteSlug atau traceId */
  siteSlug?: string;
  traceId?: string;
  mediaId?: string;
  answer: { lat: number; lng: number };
}
export interface WhichQ {
  mode: "situs-mana";
  id: string;
  level: Level;
  variant: "peristiwa" | "foto";
  eventId?: string;
  mediaId?: string;
  /** slug situs, urutan sudah diacak */
  options: string[];
  answer: string;
}
export interface FactQ {
  mode: "fakta";
  id: string;
  level: Level;
  eventId: string;
  answer: "disepakati" | "diperdebatkan";
}
export type Question = YearQ | OrderQ | WhereQ | WhichQ | FactQ;

/* ------------------------------------------------------------------ */
/* Data dasar                                                          */
/* ------------------------------------------------------------------ */

const eventById = new Map(sortedEvents.map((e) => [e.id, e]));
const siteMap = new Map<string, SiteWithCategory>(sites.map((s) => [s.slug, s]));
export const quizEvent = (id: string): TimelineEvent | undefined => eventById.get(id);
export const quizSite = (slug: string): SiteWithCategory | undefined => siteMap.get(slug);

/** Tahun peristiwa pada sumbu (Sangiran sedikit sebelum awal sumbu ditempatkan di awal). */
export const axisYear = (e: TimelineEvent): number => Math.max(START_YEAR, e.sortKey);

const scale = createTimeScale();
const yToPos = (year: number) => scale.yearToY(Math.min(END_YEAR, Math.max(START_YEAR, year))) / scale.total;

/** Foto pertama berlisensi terbuka untuk sebuah target (situs atau jejak). */
function photoOf(target: string) {
  return imagesFor(target, ["hero", "gallery", "now"])[0];
}

/** Toleransi tahun menurut presisi label ("abad ke-9", "± 800 M", "51.200 tahun lalu", rentang). */
export function yearTolerance(ev: TimelineEvent): number {
  const label = ev.dateLabel.toLowerCase();
  let tol = 0.5;
  if (ev.endKey !== undefined && ev.endKey > ev.sortKey) tol = Math.max(tol, (ev.endKey - ev.sortKey) / 2);
  if (/abad/.test(label)) tol = Math.max(tol, 50);
  else if (/tahun lalu/.test(label)) tol = Math.max(tol, Math.abs(END_YEAR - ev.sortKey) * 0.04);
  else if (/±|≥|hingga|awal|akhir/.test(label)) tol = Math.max(tol, 25);
  return tol;
}

/* ------------------------------------------------------------------ */
/* Skor                                                                */
/* ------------------------------------------------------------------ */

/** Faktor toleransi dan jarak (piksel guliran) tempat skor Tebak Tahun mencapai 0. */
const YEAR_TOL: Record<Level, number> = { santai: 1.8, sedang: 1, ahli: 0.5 };
const YEAR_DECAY_PX: Record<Level, number> = { santai: 14_000, sedang: 9_000, ahli: 5_500 };
const KM_SCALE: Record<Level, number> = { santai: 900, sedang: 600, ahli: 380 };

export const GREEN_AT = 800;
export const YELLOW_AT = 400;
export const verdictOf = (points: number): Verdict => (points >= GREEN_AT ? "benar" : points >= YELLOW_AT ? "hampir" : "salah");

/**
 * Skor Tebak Tahun (0 sampai 1000): selisih diukur dalam piksel guliran (skala bertingkat yang sama
 * dengan halaman utama), jadi adil untuk masa purba maupun modern. Selisih di dalam toleransi presisi
 * label dihitung nol.
 */
export function scoreYear(guess: number, answer: number, tolerance: number, level: Level): number {
  const d = Math.abs(scale.yearToY(clampYear(guess)) - scale.yearToY(clampYear(answer)));
  const tolPx = Math.abs(scale.yearToY(clampYear(answer + tolerance)) - scale.yearToY(clampYear(answer))) * YEAR_TOL[level];
  const over = Math.max(0, d - tolPx);
  return Math.max(0, Math.round(1000 * (1 - over / YEAR_DECAY_PX[level])));
}
const clampYear = (y: number) => Math.min(END_YEAR, Math.max(START_YEAR, y));

/** Jarak lingkaran besar dalam km. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function scoreDistance(km: number, level: Level): number {
  return Math.round(1000 * Math.exp(-km / KM_SCALE[level]));
}

export function scoreOrder(order: readonly string[], answer: readonly string[]): number {
  if (!answer.length) return 0;
  let right = 0;
  for (let i = 0; i < answer.length; i++) if (order[i] === answer[i]) right++;
  return Math.round((1000 * right) / answer.length);
}

export type Answer = number | string[] | { lat: number; lng: number } | string;

export interface Result {
  points: number;
  verdict: Verdict;
  /** jarak dalam km (hanya Di Mana Ini?) dan selisih tahun (hanya Tebak Tahun) untuk umpan balik */
  km?: number;
  yearsOff?: number;
}

/** Menilai satu jawaban. Satu fungsi untuk semua mode supaya hasilnya konsisten dan mudah diuji. */
export function evaluate(q: Question, answer: Answer): Result {
  switch (q.mode) {
    case "tebak-tahun": {
      const guess = answer as number;
      const points = scoreYear(guess, q.answer, q.tolerance, q.level);
      return { points, verdict: verdictOf(points), yearsOff: Math.abs(guess - q.answer) };
    }
    case "urutkan": {
      const points = scoreOrder(answer as string[], q.answer);
      return { points, verdict: points === 1000 ? "benar" : points >= 500 ? "hampir" : "salah" };
    }
    case "di-mana": {
      const km = haversineKm(answer as { lat: number; lng: number }, q.answer);
      const points = scoreDistance(km, q.level);
      return { points, verdict: verdictOf(points), km };
    }
    case "situs-mana": {
      const ok = answer === q.answer;
      return { points: ok ? 1000 : 0, verdict: ok ? "benar" : "salah" };
    }
    case "fakta": {
      const ok = answer === q.answer;
      return { points: ok ? 1000 : 0, verdict: ok ? "benar" : "salah" };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Adaptif                                                             */
/* ------------------------------------------------------------------ */

export interface AdaptState {
  level: Level;
  /** jawaban benar beruntun dan salah beruntun */
  ok: number;
  bad: number;
}

export const initialAdapt = (): AdaptState => ({ level: "sedang", ok: 0, bad: 0 });

/** Mulai di sedang, naik setelah 2 benar beruntun, turun setelah 2 salah beruntun. */
export function adaptStep(s: AdaptState, v: Verdict): AdaptState {
  let { level, ok, bad } = s;
  if (v === "benar") {
    ok++;
    bad = 0;
  } else if (v === "salah") {
    bad++;
    ok = 0;
  } else {
    ok = 0;
    bad = 0;
  }
  const i = LEVELS.indexOf(level);
  if (ok >= 2 && i < LEVELS.length - 1) {
    level = LEVELS[i + 1];
    ok = 0;
  } else if (bad >= 2 && i > 0) {
    level = LEVELS[i - 1];
    bad = 0;
  }
  return { level, ok, bad };
}

/* ------------------------------------------------------------------ */
/* Pembangkit soal                                                     */
/* ------------------------------------------------------------------ */

type Rng = () => number;
const pick = <T,>(r: Rng, list: readonly T[]): T => list[Math.floor(r() * list.length)];
function shuffle<T>(r: Rng, list: readonly T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const inRange = (e: TimelineEvent, range: YearRange) => axisYear(e) >= range.from && axisYear(e) <= range.to;

/** Peristiwa yang layak dijadikan soal untuk rentang dan tingkat tertentu. */
export function eligibleEvents(range: YearRange, level: Level, mode: QuestionMode): TimelineEvent[] {
  let pool = sortedEvents.filter((e) => e.siteSlug && inRange(e, range));
  if (mode === "fakta") return pool.filter((e) => e.status !== "perlu-cek");
  if (mode === "tebak-tahun" && level === "ahli") {
    const solid = pool.filter((e) => e.status !== "perlu-cek");
    // tingkat Ahli menghindari peristiwa perlu-cek bila cukup soal lain tersedia
    if (solid.length >= 6) pool = solid;
  }
  return pool;
}

const STOP = new Set(["candi", "situs", "masjid", "istana", "benteng", "museum", "gedung", "kawasan", "cagar", "budaya", "nasional", "kota", "rumah", "dari", "yang", "dan", "pada", "dengan"]);
function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3 && !STOP.has(t));
}

/** Soal pilihan situs yang jawabannya bocor di judul (yang ditampilkan pada soal) dianggap sepele dan dilewati. */
function leaksSite(ev: TimelineEvent, site: SiteWithCategory): boolean {
  const names = new Set(tokens(`${site.name} ${site.nameEn ?? ""}`));
  const text = tokens(ev.title);
  return text.some((t) => names.has(t));
}

function similarity(a: SiteWithCategory, b: SiteWithCategory, level: Level): number {
  const eraOf = (s: SiteWithCategory) => (sortedEvents.find((e) => e.siteSlug === s.slug)?.era ?? "");
  let score = 0;
  if (level === "santai") return a.category !== b.category ? 1 : 0;
  if (a.island === b.island) score += 2;
  if (level === "ahli") {
    if (a.category === b.category) score += 3;
    if (eraOf(a) === eraOf(b)) score += 2;
  } else if (a.category === b.category) score += 1;
  return score;
}

/** Pengecoh: situs lain, makin mirip pada tingkat yang lebih tinggi. Selalu unik dan bukan jawabannya. */
export function distractors(answerSlug: string, level: Level, r: Rng, count: number, needPhoto = false): string[] {
  const answer = siteMap.get(answerSlug);
  if (!answer) return [];
  const cands = sites.filter((s) => s.slug !== answerSlug && (!needPhoto || photoOf(s.slug)));
  const scored = cands.map((s) => ({ slug: s.slug, v: similarity(answer, s, level) + r() * 0.9 })).sort((a, b) => b.v - a.v);
  // ambil dari kelompok teratas (tidak selalu persis yang paling mirip) supaya soal bervariasi
  const top = scored.slice(0, Math.max(count * 3, 8));
  return shuffle(r, top).slice(0, count).map((x) => x.slug);
}

function newId(mode: QuestionMode, key: string): string {
  return `${mode}:${key}`;
}

export function makeYearQuestion(r: Rng, range: YearRange, level: Level, exclude: ReadonlySet<string> = new Set()): YearQ | null {
  const pool = eligibleEvents(range, level, "tebak-tahun").filter((e) => !exclude.has(e.id));
  if (!pool.length) return null;
  // utamakan yang berfoto dan terverifikasi
  const weighted = pool.flatMap((e) => {
    const w = (e.siteSlug && photoOf(e.siteSlug) ? 2 : 1) * (e.status === "terverifikasi" ? 2 : 1);
    return Array.from({ length: w }, () => e);
  });
  const ev = pick(r, weighted);
  return { mode: "tebak-tahun", id: newId("tebak-tahun", ev.id), level, eventId: ev.id, mediaId: ev.siteSlug ? photoOf(ev.siteSlug)?.id : undefined, answer: axisYear(ev), tolerance: yearTolerance(ev) };
}

const ORDER_COUNT: Record<Level, number> = { santai: 4, sedang: 5, ahli: 6 };
const ORDER_MIN_GAP: Record<Level, number> = { santai: 0.1, sedang: 0.045, ahli: 0.015 };

export function makeOrderQuestion(r: Rng, range: YearRange, level: Level, exclude: ReadonlySet<string> = new Set()): OrderQ | null {
  const pool = eligibleEvents(range, level, "urutkan").filter((e) => !exclude.has(e.id));
  const n = ORDER_COUNT[level];
  for (let attempt = 0; attempt < 60; attempt++) {
    const chosen: TimelineEvent[] = [];
    for (const e of shuffle(r, pool)) {
      if (chosen.every((c) => Math.abs(yToPos(axisYear(c)) - yToPos(axisYear(e))) >= ORDER_MIN_GAP[level] && axisYear(c) !== axisYear(e))) chosen.push(e);
      if (chosen.length === n) break;
    }
    if (chosen.length === n) {
      const answer = [...chosen].sort((a, b) => axisYear(a) - axisYear(b)).map((e) => e.id);
      let items = shuffle(r, answer);
      // acak ulang bila kebetulan sudah berurutan
      for (let k = 0; k < 6 && items.every((id, i) => id === answer[i]); k++) items = shuffle(r, answer);
      return { mode: "urutkan", id: newId("urutkan", answer.join("+")), level, items, answer };
    }
  }
  return null;
}

export function makeWhereQuestion(r: Rng, range: YearRange, level: Level, exclude: ReadonlySet<string> = new Set(), allowTrace = true): WhereQ | null {
  const useTrace = allowTrace && r() < (level === "ahli" ? 0.45 : 0.25);
  if (useTrace) {
    const cands = traces.filter((t) => t.year >= range.from && t.year <= range.to && imagesFor(t.id).length > 0 && !exclude.has(t.id));
    if (cands.length) {
      const t = pick(r, cands);
      return { mode: "di-mana", id: newId("di-mana", t.id), level, traceId: t.id, mediaId: imagesFor(t.id)[0]?.id, answer: { lat: t.lat, lng: t.lng } };
    }
  }
  const cands = sites.filter((s) => photoOf(s.slug) && !exclude.has(s.slug) && sortedEvents.some((e) => e.siteSlug === s.slug && inRange(e, range)));
  if (!cands.length) return null;
  const s = pick(r, cands);
  return { mode: "di-mana", id: newId("di-mana", s.slug), level, siteSlug: s.slug, mediaId: photoOf(s.slug)?.id, answer: { lat: s.coords.lat, lng: s.coords.lng } };
}

/** Soal "Situs Mana?" untuk satu peristiwa tertentu (juga dipakai tantangan di guliran). */
export function whichForEvent(r: Rng, ev: TimelineEvent, level: Level): WhichQ | null {
  const site = ev.siteSlug ? siteMap.get(ev.siteSlug) : undefined;
  if (!site || leaksSite(ev, site)) return null;
  const options = shuffle(r, [site.slug, ...distractors(site.slug, level, r, 3)]);
  return { mode: "situs-mana", id: newId("situs-mana", `p-${ev.id}`), level, variant: "peristiwa", eventId: ev.id, options, answer: site.slug };
}

export function makeWhichQuestion(r: Rng, range: YearRange, level: Level, exclude: ReadonlySet<string> = new Set()): WhichQ | null {
  const evs = shuffle(r, eligibleEvents(range, level, "situs-mana").filter((e) => !exclude.has(`situs-mana:p-${e.id}`)));
  const wantPhoto = r() < 0.45;
  if (!wantPhoto) {
    for (const ev of evs.slice(0, 60)) {
      const q = whichForEvent(r, ev, level);
      if (q) return q;
    }
  }
  const withPhoto = sites.filter((s) => photoOf(s.slug) && sortedEvents.some((e) => e.siteSlug === s.slug && inRange(e, range)));
  if (withPhoto.length >= 4) {
    const s = pick(r, withPhoto);
    const m = photoOf(s.slug)!;
    return { mode: "situs-mana", id: newId("situs-mana", `f-${s.slug}`), level, variant: "foto", mediaId: m.id, options: shuffle(r, [s.slug, ...distractors(s.slug, level, r, 3, true)]), answer: s.slug };
  }
  for (const ev of evs) {
    const q = whichForEvent(r, ev, level);
    if (q) return q;
  }
  return null;
}

export function makeFactQuestion(r: Rng, range: YearRange, level: Level, exclude: ReadonlySet<string> = new Set()): FactQ | null {
  const pool = eligibleEvents(range, level, "fakta").filter((e) => !exclude.has(`fakta:${e.id}`));
  const verified = pool.filter((e) => e.status === "terverifikasi");
  const debated = pool.filter((e) => e.status === "diperdebatkan" && (e.alternatives?.length ?? 0) > 0);
  if (!verified.length && !debated.length) return null;
  // seimbang antara disepakati dan diperdebatkan
  const wantDebated = debated.length > 0 && (verified.length === 0 || r() < 0.5);
  const ev = pick(r, wantDebated ? debated : verified);
  return { mode: "fakta", id: newId("fakta", ev.id), level, eventId: ev.id, answer: wantDebated ? "diperdebatkan" : "disepakati" };
}

export function makeQuestion(mode: QuestionMode, r: Rng, range: YearRange, level: Level, exclude: ReadonlySet<string> = new Set()): Question | null {
  switch (mode) {
    case "tebak-tahun":
      return makeYearQuestion(r, range, level, exclude);
    case "urutkan":
      return makeOrderQuestion(r, range, level, exclude);
    case "di-mana":
      return makeWhereQuestion(r, range, level, exclude);
    case "situs-mana":
      return makeWhichQuestion(r, range, level, exclude);
    case "fakta":
      return makeFactQuestion(r, range, level, exclude);
  }
}

/** Seed dari string (tanggal, nama sesi) yang stabil di semua peramban. */
export const seedFrom = (s: string): number => seedOf(s);

/* ------------------------------------------------------------------ */
/* Tantangan Harian                                                    */
/* ------------------------------------------------------------------ */

export const DAILY_COUNT = 5;
const DAILY_MODES: readonly QuestionMode[] = ["tebak-tahun", "situs-mana", "di-mana", "urutkan", "fakta"];

/** Kunci tanggal lokal "YYYY-MM-DD". */
export function dateKey(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Lima soal campuran dengan seed tanggal: semua orang mendapat soal yang sama pada hari itu. */
export function dailyQuestions(key: string): Question[] {
  const r = rng(seedFrom(`setapak-harian-${key}`));
  const out: Question[] = [];
  const used = new Set<string>();
  for (const mode of shuffle(r, DAILY_MODES)) {
    const q = makeQuestion(mode, r, ALL_TIME, "sedang", used);
    if (q) {
      out.push(q);
      used.add(q.id);
    }
  }
  return out;
}

/** Kisi kotak hasil harian tanpa membocorkan jawaban: hijau benar, kuning hampir, hitam salah. */
export function shareGrid(results: readonly Verdict[]): string {
  return results.map((v) => (v === "benar" ? "🟩" : v === "hampir" ? "🟨" : "⬛")).join("");
}

/* ------------------------------------------------------------------ */
/* Tantangan di guliran                                                */
/* ------------------------------------------------------------------ */

/** Jarak (jumlah peristiwa) antar "batu tantangan" di guliran. */
export const CHALLENGE_EVERY = 25;

/**
 * Soal cepat tentang salah satu peristiwa yang baru saja dilewati. `recent` diurut dari yang paling
 * lama. Mengembalikan null bila tidak ada yang layak (semua bocor di judulnya).
 */
export function scrollChallenge(recent: readonly TimelineEvent[], seedKey: string): WhichQ | null {
  const r = rng(seedFrom(`guliran-${seedKey}`));
  for (const ev of shuffle(r, recent.filter((e) => e.siteSlug))) {
    const q = whichForEvent(r, ev, "sedang");
    if (q) return q;
  }
  return null;
}
