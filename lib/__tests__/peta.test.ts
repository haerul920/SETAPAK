import { describe, expect, it } from "vitest";
import { categoryLabels, kingdoms, sortedEvents, type Category } from "@/data";
import {
  DEFAULT_STATE,
  eventsInRange,
  EMPTY_FILTERS,
  histogram,
  packBands,
  parseState,
  rangeAround,
  search,
  serializeState,
  siteStart,
  UNESCO_SITES,
  visiblePins,
} from "@/lib/peta-data";
import { AXIS_MODES, ERA_PRESETS, FULL_RANGE, keyStep, normalizeRange, posToYear, yearToPos } from "@/lib/peta-time";
import { END_YEAR, START_YEAR } from "@/lib/time-scale";

const CATS = Object.keys(categoryLabels) as Category[];

describe("sumbu waktu peta", () => {
  for (const mode of AXIS_MODES) {
    it(`${mode}: saling invers, monoton, dan di dalam 0..1`, () => {
      let prev = -1;
      for (const yr of [START_YEAR, -500_000, -51_200, -3_000, 0, 700, 1_300, 1_669, 1_945, 2_006, END_YEAR]) {
        const p = yearToPos(mode, yr);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
        expect(p).toBeGreaterThan(prev);
        prev = p;
        const back = posToYear(mode, p);
        const tol = Math.max(0.6, Math.abs(END_YEAR - yr) * 1e-6);
        expect(Math.abs(back - yr)).toBeLessThan(mode === "scroll" ? Math.max(tol, 2_000) : tol);
      }
      expect(yearToPos(mode, START_YEAR)).toBe(0);
      expect(yearToPos(mode, END_YEAR)).toBe(1);
    });
  }

  it("skala log memberi masa dekat ruang jauh lebih lebar daripada linear, masa purba tetap terjangkau", () => {
    // 1945 sampai 2026 hanya 0,005% dari rentang linear, tetapi puluhan persen pada skala log
    expect(yearToPos("log", END_YEAR) - yearToPos("log", 1_945)).toBeGreaterThan(0.2);
    expect(yearToPos("linear", END_YEAR) - yearToPos("linear", 1_945)).toBeLessThan(0.001);
    // 51.200 tahun lalu tidak menempel di tepi kiri pada skala log
    expect(yearToPos("log", END_YEAR - 51_200)).toBeGreaterThan(0.2);
  });

  it("pintasan masa valid dan berurutan, normalisasi rentang, langkah keyboard positif", () => {
    for (const p of ERA_PRESETS) expect(p.from).toBeLessThan(p.to);
    expect(normalizeRange({ from: 2_100, to: -9_999_999 })).toEqual({ from: START_YEAR, to: END_YEAR });
    for (const mode of AXIS_MODES) expect(keyStep(mode, 1_900, false)).toBeGreaterThan(0);
  });
});

describe("data peta", () => {
  it("rentang penuh memuat semua peristiwa bersitus, rentang sempit hanya yang cocok", () => {
    expect(eventsInRange(FULL_RANGE, EMPTY_FILTERS).length).toBe(sortedEvents.filter((e) => e.siteSlug).length);
    const r = { from: 1_945, to: 1_946 };
    const evs = eventsInRange(r, EMPTY_FILTERS);
    expect(evs.length).toBeGreaterThanOrEqual(7);
    expect(evs.every((e) => e.sortKey >= r.from && e.sortKey <= r.to)).toBe(true);
  });

  it("filter kategori, tipe, status, dan UNESCO menyaring peristiwa", () => {
    const all = eventsInRange(FULL_RANGE, EMPTY_FILTERS).length;
    const rusak = eventsInRange(FULL_RANGE, { ...EMPTY_FILTERS, types: ["rusak"] });
    expect(rusak.length).toBeGreaterThan(0);
    expect(rusak.length).toBeLessThan(all);
    expect(rusak.every((e) => e.type === "rusak")).toBe(true);
    const verified = eventsInRange(FULL_RANGE, { ...EMPTY_FILTERS, statuses: ["terverifikasi"] });
    expect(verified.every((e) => e.status === "terverifikasi")).toBe(true);
    expect(UNESCO_SITES.size).toBeGreaterThan(3);
    const unesco = eventsInRange(FULL_RANGE, { ...EMPTY_FILTERS, unescoOnly: true });
    expect(unesco.length).toBeGreaterThan(0);
    expect(unesco.every((e) => UNESCO_SITES.has(e.siteSlug as string))).toBe(true);
  });

  it("pin: situs yang belum ada tidak tampil kecuali 'semua masa'", () => {
    const early = { from: START_YEAR, to: -40_000 };
    const hidden = visiblePins(early, EMPTY_FILTERS, false);
    const shown = visiblePins(early, EMPTY_FILTERS, true);
    expect(shown.length).toBeGreaterThan(hidden.length);
    expect(hidden.every((p) => p.exists)).toBe(true);
    expect(shown.filter((p) => !p.exists).length).toBe(shown.length - hidden.length);
    for (const p of hidden) expect(siteStart(p.site.slug)).toBeLessThanOrEqual(early.to);
    // rentang akhir: semua situs ada
    expect(visiblePins(FULL_RANGE, EMPTY_FILTERS, false).length).toBe(shown.length);
  });

  it("histogram menjumlahkan semua peristiwa bersitus", () => {
    const h = histogram((y) => yearToPos("log", y), 80, EMPTY_FILTERS);
    expect(h.reduce((a, b) => a + b, 0)).toBe(sortedEvents.filter((e) => e.siteSlug).length);
  });

  it("interval packing: pita pada baris yang sama tidak pernah tumpang tindih", () => {
    for (const mode of AXIS_MODES) {
      const pos = (y: number) => yearToPos(mode, y);
      const { rows, rowCount } = packBands(kingdoms, pos);
      expect(rows.length).toBe(kingdoms.length);
      expect(rowCount).toBeLessThanOrEqual(kingdoms.length);
      for (let r = 0; r < rowCount; r++) {
        const inRow = rows.filter((x) => x.row === r).sort((a, b) => a.kingdom.start - b.kingdom.start);
        for (let i = 1; i < inRow.length; i++) expect(pos(inRow[i].kingdom.start)).toBeGreaterThanOrEqual(pos(inRow[i - 1].kingdom.end));
      }
    }
  });

  it("pencarian fuzzy menemukan situs dan peristiwa walau salah ketik", () => {
    const hits = search("Borobudr");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => (h.kind === "site" ? h.site.slug : h.event.siteSlug) === "borobudur")).toBe(true);
    expect(search("x")).toEqual([]);
    expect(search("proklamasi").length).toBeGreaterThan(0);
  });

  it("query string: bolak-balik tanpa kehilangan status, nilai asing diabaikan", () => {
    const s = {
      ...DEFAULT_STATE,
      range: { from: 1_500, to: 1_700 },
      mode: "linear" as const,
      filters: { ...EMPTY_FILTERS, categories: ["candi", "benteng"] as Category[], types: ["dibangun"] as const, unescoOnly: true },
      showAll: true,
      layers: { pins: true, labels: false, traces: true, route: false },
      view: { lat: -2.5, lng: 118, zoom: 4.5 },
      ev: "ev-borobudur-1814",
    };
    const qs = serializeState({ ...s, filters: { ...s.filters, types: [...s.filters.types] } });
    const back = parseState(new URLSearchParams(qs), CATS);
    expect(back.range).toEqual({ from: 1_500, to: 1_700 });
    expect(back.mode).toBe("linear");
    expect(back.filters.categories).toEqual(["candi", "benteng"]);
    expect(back.filters.types).toEqual(["dibangun"]);
    expect(back.filters.unescoOnly).toBe(true);
    expect(back.showAll).toBe(true);
    expect(back.layers).toEqual({ pins: true, labels: false, traces: true, route: false });
    expect(back.view).toEqual({ lat: -2.5, lng: 118, zoom: 4.5 });
    expect(back.ev).toBe("ev-borobudur-1814");
    const junk = parseState(new URLSearchParams("kat=bukan,candi&skala=ngawur&dari=abc&sampai=2&lat=1"), CATS);
    expect(junk.filters.categories).toEqual(["candi"]);
    expect(junk.mode).toBe("log");
    expect(junk.range).toEqual(FULL_RANGE);
    expect(junk.view).toBeNull();
    expect(serializeState(DEFAULT_STATE)).toBe("");
  });

  it("rentang di sekitar peristiwa memuat tahunnya", () => {
    for (const e of sortedEvents.filter((x) => x.siteSlug).slice(0, 60)) {
      const r = rangeAround(e);
      expect(r.from).toBeLessThanOrEqual(Math.max(START_YEAR, e.sortKey));
      expect(r.to).toBeGreaterThanOrEqual(e.endKey ?? e.sortKey);
    }
  });
});
