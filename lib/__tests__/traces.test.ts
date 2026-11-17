import { describe, expect, it } from "vitest";
import { sortedEvents } from "@/data";
import full from "@/data/wikidata-heritage.json";
import { buildLayout, CLUSTER_GAP, MAX_PER_CLUSTER } from "@/lib/layout";
import { createTimeScale } from "@/lib/time-scale";
import { BUBBLE_MIN, BUBBLE_SIZE, BUBBLE_WINDOW, layoutTraces, shortName, TRACE_DIMS, traces } from "@/lib/traces";

describe("data jejak tingkat 3", () => {
  it("data ringan selaras dengan data lengkap", () => {
    expect(traces.length).toBe(full.length);
    const byId = new Map((full as { id: string; name: string; year: number }[]).map((t) => [t.id, t]));
    for (const t of traces) {
      const f = byId.get(t.id);
      expect(f).toBeTruthy();
      expect(f!.name).toBe(t.name);
      expect(f!.year).toBe(t.year);
    }
  });

  it("setiap jejak lengkap, bertahun valid, dan bertanda perlu dicek", () => {
    expect(traces.length).toBeGreaterThan(300);
    expect(new Set(traces.map((t) => t.id)).size).toBe(traces.length);
    for (const t of full as { id: string; name: string; year: number; status: string; summary: string; wikidata: string }[]) {
      expect(t.id).toMatch(/^wd-Q\d+$/);
      expect(t.name.length).toBeGreaterThan(2);
      expect(t.year).toBeGreaterThanOrEqual(300);
      expect(t.year).toBeLessThanOrEqual(2026);
      expect(t.status).toBe("perlu-cek");
      expect(t.summary.length).toBeGreaterThan(10);
      expect(t.wikidata).toMatch(/^https:\/\/www\.wikidata\.org\/wiki\/Q\d+$/);
    }
  });
});

describe("tata letak jejak", () => {
  for (const mobile of [false, true]) {
    const label = mobile ? "mobile" : "desktop";
    const scale = createTimeScale({ mobile });
    const { stones, bubbles } = layoutTraces(traces, (y) => scale.yearToY(y), mobile);
    const dims = mobile ? TRACE_DIMS.mobile : TRACE_DIMS.desktop;
    const bubbleSize = mobile ? BUBBLE_SIZE.mobile : BUBBLE_SIZE.desktop;

    it(`${label}: setiap jejak tampil tepat satu kali (batu atau gelembung)`, () => {
      const ids = [...stones.map((s) => s.trace.id), ...bubbles.flatMap((b) => b.traces.map((t) => t.id))];
      expect(ids.length).toBe(traces.length);
      expect(new Set(ids).size).toBe(traces.length);
    });

    it(`${label}: gelembung hanya untuk lebih dari 6 jejak dalam 200 px`, () => {
      for (const b of bubbles) {
        expect(b.traces.length).toBeGreaterThanOrEqual(BUBBLE_MIN);
        const ys = b.traces.map((t) => scale.yearToY(t.year));
        expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(BUBBLE_WINDOW);
      }
    });

    it(`${label}: tidak ada batu atau gelembung yang saling menumpuk pada satu jalur`, () => {
      const items = [
        ...stones.map((s) => ({ side: s.side, y: s.y, half: dims.size / 2 })),
        ...bubbles.map((b) => ({ side: b.side, y: b.y, half: bubbleSize / 2 })),
      ];
      for (const side of ["left", "right"] as const) {
        const lane = items.filter((i) => i.side === side).sort((a, b) => a.y - b.y);
        for (let i = 1; i < lane.length; i++) {
          expect(lane[i].y - lane[i].half).toBeGreaterThanOrEqual(lane[i - 1].y + lane[i - 1].half - 0.01);
        }
      }
      if (mobile) expect(items.every((i) => i.side === "right")).toBe(true);
    });

    it(`${label}: batu bergeser paling banyak beberapa slot dari tahunnya`, () => {
      for (const s of stones) {
        const base = scale.yearToY(s.trace.year);
        expect(Math.abs(s.y - base)).toBeLessThan(dims.size * 12);
      }
    });
  }

  it("deterministik: tata letak yang sama untuk masukan yang sama", () => {
    const scale = createTimeScale();
    const a = layoutTraces(traces, (y) => scale.yearToY(y), false);
    const b = layoutTraces(traces, (y) => scale.yearToY(y), false);
    const key = (l: typeof a) => l.stones.map((s) => `${s.trace.id}:${s.side}:${Math.round(s.y)}`);
    expect(key(a)).toEqual(key(b));
  });

  it("nama pendek memangkas dengan elipsis", () => {
    expect(shortName("Pendek")).toBe("Pendek");
    const long = shortName("Masjid Agung Sangat Panjang Sekali Namanya Di Sini", 20);
    expect(long.length).toBe(20);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("kepadatan guliran (peristiwa kurasi)", () => {
  for (const mobile of [false, true]) {
    const label = mobile ? "mobile" : "desktop";
    const layout = buildLayout(sortedEvents, { mobile });

    it(`${label}: tidak ada klaster lebih dari ${MAX_PER_CLUSTER} objek`, () => {
      expect(Math.max(...layout.clusters.map((c) => c.events.length))).toBeLessThanOrEqual(MAX_PER_CLUSTER);
    });

    it(`${label}: jarak antarklaster minimal ${CLUSTER_GAP} px`, () => {
      for (let i = 1; i < layout.clusters.length; i++) {
        const a = layout.clusters[i - 1];
        expect(layout.clusters[i].y - (a.y + a.height)).toBeGreaterThanOrEqual(CLUSTER_GAP - 0.5);
      }
    });

    it(`${label}: tambahan ruang (tahanan) terbatas`, () => {
      const base = createTimeScale({ mobile }).total;
      expect((layout.total - base) / layout.total).toBeLessThan(mobile ? 0.45 : 0.15);
    });

    it(`${label}: histogram kepadatan menjumlahkan semua peristiwa dan jejak`, () => {
      const sum = layout.density.reduce((a, b) => a + b, 0);
      expect(sum).toBe(sortedEvents.length * 3 + traces.length);
    });
  }

  it("1945 memuat tujuh peristiwa atau lebih, semuanya tertempatkan", () => {
    const layout = buildLayout(sortedEvents, { mobile: false });
    const in1945 = sortedEvents.filter((e) => Math.floor(e.sortKey) === 1945);
    expect(in1945.length).toBeGreaterThanOrEqual(7);
    for (const ev of in1945) expect(layout.eventY.has(ev.id)).toBe(true);
  });

  it("total panjang desktop sekitar 100.000 px", () => {
    const layout = buildLayout(sortedEvents, { mobile: false });
    expect(layout.total).toBeGreaterThan(99_000);
    expect(layout.total).toBeLessThan(125_000);
  });
});
