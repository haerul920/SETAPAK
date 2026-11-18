/**
 * Logika data halaman Peta Waktu: filter, situs yang tampil pada rentang waktu, pencarian Fuse.js,
 * pita kerajaan (interval packing), dan status di query string. Murni, bisa diuji tanpa DOM.
 */
import Fuse from "fuse.js";
import { kingdoms, sites, sortedEvents, type Category, type EventType, type Kingdom, type Site, type SourceStatus, type TimelineEvent } from "@/data";
import { AXIS_MODES, FULL_RANGE, normalizeRange, type AxisMode, type YearRange } from "./peta-time";
import { END_YEAR, START_YEAR } from "./time-scale";

export type Island = Site["island"];
export const ISLANDS: readonly Island[] = ["Sumatra", "Jawa", "Bali-Nusa Tenggara", "Kalimantan", "Sulawesi", "Maluku-Papua"];
export const EVENT_TYPES: readonly EventType[] = ["dibangun", "digunakan", "ditinggalkan", "terkubur", "ditemukan", "diteliti", "dipugar", "rusak", "ditetapkan", "revitalisasi", "peristiwa"];
export const STATUSES: readonly SourceStatus[] = ["terverifikasi", "diperdebatkan", "perlu-cek"];

export interface Filters {
  categories: Category[];
  types: EventType[];
  islands: Island[];
  statuses: SourceStatus[];
  unescoOnly: boolean;
}

export const EMPTY_FILTERS: Filters = { categories: [], types: [], islands: [], statuses: [], unescoOnly: false };

export const siteBySlug = new Map(sites.map((s) => [s.slug, s]));

/** Situs Warisan Dunia UNESCO: situs yang punya peristiwa bersumber whc.unesco.org (id sumber `unesco-N`). */
export const UNESCO_SITES: ReadonlySet<string> = new Set(
  sortedEvents.filter((e) => e.siteSlug && e.sourceIds.some((id) => id.startsWith("unesco-"))).map((e) => e.siteSlug as string)
);

/** Peristiwa per situs, urut tahun. */
export const eventsBySite: ReadonlyMap<string, TimelineEvent[]> = (() => {
  const m = new Map<string, TimelineEvent[]>();
  for (const e of sortedEvents) if (e.siteSlug) m.set(e.siteSlug, [...(m.get(e.siteSlug) ?? []), e]);
  return m;
})();

/** Tahun peristiwa pertama sebuah situs: situs dianggap "ada" mulai tahun ini. */
export function siteStart(slug: string): number {
  const first = eventsBySite.get(slug)?.[0];
  return first ? axisYear(first) : END_YEAR;
}

const has = <T,>(list: readonly T[], v: T) => list.length === 0 || list.includes(v);

export function siteMatches(site: Site & { category?: Category }, f: Filters): boolean {
  if (!has(f.categories, site.category as Category)) return false;
  if (!has(f.islands, site.island)) return false;
  if (f.unescoOnly && !UNESCO_SITES.has(site.slug)) return false;
  return true;
}

export function eventMatches(ev: TimelineEvent, f: Filters): boolean {
  if (!has(f.types, ev.type)) return false;
  if (!has(f.statuses, ev.status)) return false;
  const site = ev.siteSlug ? siteBySlug.get(ev.siteSlug) : undefined;
  if (site) return siteMatches(site as Site & { category: Category }, f);
  // peristiwa tanpa situs (penutup 2026) tidak ikut bila ada filter situs
  return f.categories.length === 0 && f.islands.length === 0 && !f.unescoOnly;
}

export const inRange = (year: number, r: YearRange) => year >= r.from && year <= r.to;

/** Tahun peristiwa pada sumbu: Sangiran (1,648 juta tahun lalu) sedikit sebelum awal sumbu dan ditempatkan di awal. */
export const axisYear = (e: TimelineEvent): number => Math.max(START_YEAR, e.sortKey);

/** Peristiwa yang jatuh di rentang aktif dan lolos filter, kronologis. */
export function eventsInRange(r: YearRange, f: Filters): TimelineEvent[] {
  return sortedEvents.filter((e) => e.siteSlug && inRange(axisYear(e), r) && eventMatches(e, f));
}

export interface PinState {
  site: Site & { category: Category };
  /** jumlah peristiwa yang lolos filter di rentang aktif */
  count: number;
  /** situs sudah "ada" pada akhir rentang */
  exists: boolean;
  /** ada peristiwa di rentang aktif */
  active: boolean;
}

/**
 * Pin yang tampil: situs yang lolos filter dan sudah ada pada akhir rentang. Dengan `showAll`,
 * situs yang belum ada tetap tampil (abu-abu, exists = false).
 */
export function visiblePins(r: YearRange, f: Filters, showAll: boolean): PinState[] {
  const out: PinState[] = [];
  for (const s of sites) {
    const site = s as Site & { category: Category };
    if (!siteMatches(site, f)) continue;
    const evs = eventsBySite.get(site.slug) ?? [];
    const exists = siteStart(site.slug) <= r.to;
    if (!exists && !showAll) continue;
    const count = evs.filter((e) => inRange(axisYear(e), r) && eventMatches(e, f)).length;
    out.push({ site, count, exists, active: count > 0 });
  }
  return out;
}

/** Histogram kepadatan peristiwa untuk sumbu: jumlah peristiwa per kotak posisi 0..1. */
export function histogram(posOf: (year: number) => number, bins: number, f: Filters): number[] {
  const out = new Array<number>(bins).fill(0);
  for (const e of sortedEvents) {
    if (!e.siteSlug || !eventMatches(e, f)) continue;
    out[Math.min(bins - 1, Math.max(0, Math.floor(posOf(axisYear(e)) * bins)))]++;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Pita kerajaan                                                       */
/* ------------------------------------------------------------------ */

export interface BandRow {
  kingdom: Kingdom;
  row: number;
}

/**
 * Interval packing: tiap pita menempati baris terendah yang tidak bertabrakan dengan pita lain
 * (dengan jarak aman `gap` dalam satuan posisi sumbu).
 */
export function packBands(list: readonly Kingdom[], posOf: (year: number) => number, gap = 0.004): { rows: BandRow[]; rowCount: number } {
  const sorted = [...list].sort((a, b) => a.start - b.start || b.end - a.end);
  const rowEnds: number[] = [];
  const rows: BandRow[] = [];
  for (const k of sorted) {
    const a = posOf(k.start);
    const b = posOf(k.end);
    let row = rowEnds.findIndex((end) => end + gap <= a);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(b);
    } else rowEnds[row] = b;
    rows.push({ kingdom: k, row });
  }
  return { rows, rowCount: rowEnds.length };
}

export { kingdoms };

/* ------------------------------------------------------------------ */
/* Pencarian                                                           */
/* ------------------------------------------------------------------ */

export type SearchHit = { kind: "site"; site: Site & { category: Category } } | { kind: "event"; event: TimelineEvent };

interface Doc {
  kind: "site" | "event";
  key: string;
  text: string;
  extra: string;
}

const docs: Doc[] = [
  ...sites.map((s) => ({ kind: "site" as const, key: s.slug, text: `${s.name} ${s.nameEn ?? ""}`, extra: `${s.location} ${s.kind}` })),
  ...sortedEvents.filter((e) => e.siteSlug).map((e) => ({ kind: "event" as const, key: e.id, text: `${e.title} ${e.titleEn ?? ""}`, extra: `${e.dateLabel}` })),
];

let fuse: Fuse<Doc> | null = null;

/** Pencarian fuzzy situs dan peristiwa. */
export function search(query: string, limit = 8): SearchHit[] {
  const q = query.trim();
  if (q.length < 2) return [];
  fuse ??= new Fuse(docs, { keys: [{ name: "text", weight: 0.75 }, { name: "extra", weight: 0.25 }], threshold: 0.34, ignoreLocation: true, minMatchCharLength: 2 });
  const evById = new Map(sortedEvents.map((e) => [e.id, e]));
  const hits: SearchHit[] = [];
  for (const r of fuse.search(q, { limit: limit * 2 })) {
    if (r.item.kind === "site") {
      const site = siteBySlug.get(r.item.key);
      if (site) hits.push({ kind: "site", site: site as Site & { category: Category } });
    } else {
      const event = evById.get(r.item.key);
      if (event) hits.push({ kind: "event", event });
    }
    if (hits.length >= limit) break;
  }
  return hits;
}

/* ------------------------------------------------------------------ */
/* Status di query string                                              */
/* ------------------------------------------------------------------ */

export interface PetaLayers {
  pins: boolean;
  labels: boolean;
  traces: boolean;
  route: boolean;
}

export const DEFAULT_LAYERS: PetaLayers = { pins: true, labels: true, traces: false, route: false };

export interface PetaState {
  range: YearRange;
  mode: AxisMode;
  filters: Filters;
  showAll: boolean;
  layers: PetaLayers;
  /** pusat dan zoom peta, bila diatur */
  view: { lat: number; lng: number; zoom: number } | null;
  /** peristiwa atau situs terpilih */
  ev: string | null;
  site: string | null;
}

export const DEFAULT_STATE: PetaState = {
  range: FULL_RANGE,
  mode: "log",
  filters: EMPTY_FILTERS,
  showAll: false,
  layers: DEFAULT_LAYERS,
  view: null,
  ev: null,
  site: null,
};

const num = (v: string | null): number | null => {
  if (v === null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const list = <T extends string>(v: string | null, allowed: readonly T[]): T[] => (v ? (v.split(",").filter((x): x is T => (allowed as readonly string[]).includes(x))) : []);

/** Membaca status dari query string. Nilai yang tidak dikenal diabaikan. */
export function parseState(params: URLSearchParams, categories: readonly Category[]): PetaState {
  const from = num(params.get("dari"));
  const to = num(params.get("sampai"));
  const mode = params.get("skala");
  const lat = num(params.get("lat"));
  const lng = num(params.get("lng"));
  const zoom = num(params.get("z"));
  const layers = params.get("lapisan");
  const layerSet = layers === null ? null : new Set(layers.split(","));
  return {
    range: from !== null && to !== null ? normalizeRange({ from, to }) : FULL_RANGE,
    mode: (AXIS_MODES as readonly string[]).includes(mode ?? "") ? (mode as AxisMode) : "log",
    filters: {
      categories: list(params.get("kat"), categories),
      types: list(params.get("tipe"), EVENT_TYPES),
      islands: list(params.get("pulau"), ISLANDS),
      statuses: list(params.get("status"), STATUSES),
      unescoOnly: params.get("unesco") === "1",
    },
    showAll: params.get("semua") === "1",
    layers: layerSet
      ? { pins: layerSet.has("pin"), labels: layerSet.has("label"), traces: layerSet.has("jejak"), route: layerSet.has("rute") }
      : DEFAULT_LAYERS,
    view: lat !== null && lng !== null && zoom !== null ? { lat, lng, zoom } : null,
    ev: params.get("ev"),
    site: params.get("situs"),
  };
}

const r4 = (n: number) => String(Math.round(n * 1000) / 1000);

/** Menyusun query string dari status. Hanya nilai yang berbeda dari bawaan yang ditulis. */
export function serializeState(s: PetaState): string {
  const p = new URLSearchParams();
  if (s.range.from > START_YEAR + 0.5 || s.range.to < END_YEAR - 0.5) {
    p.set("dari", r4(s.range.from));
    p.set("sampai", r4(s.range.to));
  }
  if (s.mode !== "log") p.set("skala", s.mode);
  if (s.filters.categories.length) p.set("kat", s.filters.categories.join(","));
  if (s.filters.types.length) p.set("tipe", s.filters.types.join(","));
  if (s.filters.islands.length) p.set("pulau", s.filters.islands.join(","));
  if (s.filters.statuses.length) p.set("status", s.filters.statuses.join(","));
  if (s.filters.unescoOnly) p.set("unesco", "1");
  if (s.showAll) p.set("semua", "1");
  const l = s.layers;
  if (l.pins !== DEFAULT_LAYERS.pins || l.labels !== DEFAULT_LAYERS.labels || l.traces !== DEFAULT_LAYERS.traces || l.route !== DEFAULT_LAYERS.route) {
    p.set("lapisan", [l.pins && "pin", l.labels && "label", l.traces && "jejak", l.route && "rute"].filter(Boolean).join(","));
  }
  if (s.view) {
    p.set("lat", r4(s.view.lat));
    p.set("lng", r4(s.view.lng));
    p.set("z", String(Math.round(s.view.zoom * 100) / 100));
  }
  if (s.ev) p.set("ev", s.ev);
  if (s.site) p.set("situs", s.site);
  return p.toString();
}

/** Rentang yang cocok untuk menampilkan satu peristiwa (tahunnya dengan sedikit ruang di kiri dan kanan). */
export function rangeAround(ev: TimelineEvent): YearRange {
  const y = axisYear(ev);
  const end = ev.endKey ?? y;
  const pad = Math.max(2, (end - y) * 0.5, Math.abs(END_YEAR - y) * 0.02);
  return normalizeRange({ from: y - pad, to: end + pad });
}
