import { describe, expect, it } from "vitest";
import { sortedEvents } from "@/data";
import { buildLayout, clusterAtY } from "@/lib/layout";
import {
  createTimeScale,
  END_YEAR,
  formatYear,
  parseYearInput,
  SEGMENTS,
  START_YEAR,
  tickLabel,
  yearParts,
} from "@/lib/time-scale";

const sampleYears = (() => {
  const out: number[] = [];
  for (const s of SEGMENTS) {
    for (let i = 0; i <= 50; i++) out.push(s.from + ((s.to - s.from) * i) / 50);
  }
  return out;
})();

describe("createTimeScale", () => {
  for (const mobile of [false, true]) {
    const label = mobile ? "mobile" : "desktop";
    const scale = createTimeScale({ mobile });

    it(`${label}: total sesuai jumlah segmen ditambah perlambatan`, () => {
      const base = SEGMENTS.reduce((a, s) => a + s.px, 0);
      expect(scale.total).toBeCloseTo((base + 1800) * (mobile ? 0.8 : 1), 6);
    });

    it(`${label}: yearToY dan yToYear saling invers (< 0,5 px)`, () => {
      for (const yr of sampleYears) {
        const y = scale.yearToY(yr);
        expect(Math.abs(scale.yearToY(scale.yToYear(y)) - y)).toBeLessThan(0.5);
      }
      for (let y = 0; y <= scale.total; y += 137) {
        expect(Math.abs(scale.yearToY(scale.yToYear(y)) - y)).toBeLessThan(0.5);
      }
    });

    it(`${label}: monoton naik`, () => {
      let prev = -1;
      for (let y = 0; y <= scale.total; y += 50) {
        const yr = scale.yToYear(y);
        expect(yr).toBeGreaterThanOrEqual(prev === -1 ? START_YEAR : prev);
        prev = yr;
      }
    });

    it(`${label}: batas segmen kontinu`, () => {
      for (const s of SEGMENTS) {
        const at = scale.yearToY(s.to);
        expect(Math.abs(scale.yearToY(s.to - 1e-6) - at)).toBeLessThan(0.5);
        expect(Math.abs(scale.yearToY(s.to + 1e-6) - at)).toBeLessThan(0.5);
      }
    });
  }

  it("ujung skala tepat di awal dan akhir", () => {
    const s = createTimeScale();
    expect(s.yearToY(START_YEAR)).toBe(0);
    expect(s.yToYear(0)).toBe(START_YEAR);
    expect(s.yToYear(s.total)).toBe(END_YEAR);
  });

  it("tahanan menahan tahun dan menggeser semua yang sesudahnya", () => {
    const plain = createTimeScale();
    const held = createTimeScale({ holds: [{ year: 1669.48, px: 500 }] });
    expect(held.total).toBeCloseTo(plain.total + 500, 6);
    const hold = held.holdAt(1669.48)!;
    expect(hold.y1 - hold.y0).toBeCloseTo(500, 6);
    expect(held.yToYear(hold.y0 + 250)).toBeCloseTo(1669.48, 9);
    expect(held.yearToY(1700) - plain.yearToY(1700)).toBeCloseTo(500, 6);
    expect(held.yearToY(1600)).toBeCloseTo(plain.yearToY(1600), 6);
  });

  it("pxPerYear mengikuti tabel segmen", () => {
    const s = createTimeScale();
    // tabel v4: D 24.000 px per 1.500 tahun, E 24.000 per 400, F 30.240 per 126
    expect(s.pxPerYear(800)).toBeCloseTo(16, 6);
    expect(s.pxPerYear(1800)).toBeCloseTo(60, 6);
    expect(s.pxPerYear(1950)).toBeCloseTo(240, 6);
  });
});

describe("format tahun", () => {
  it("tidak pernah NaN", () => {
    for (const yr of [...sampleYears, NaN, Infinity, -Infinity, 0, 1, 999, 1000]) {
      for (const lang of ["id", "en"] as const) expect(formatYear(yr, lang)).not.toMatch(/NaN|Infinity/);
    }
  });
  it("aturan format", () => {
    expect(formatYear(START_YEAR, "id")).toBe("1.650.000 TAHUN LALU");
    expect(formatYear(2026 - 51200, "id")).toBe("51.200 TAHUN LALU");
    expect(formatYear(-3199, "id")).toBe("3.200 SM");
    expect(formatYear(850.5, "id")).toBe("TAHUN 850 M");
    expect(formatYear(850.5, "en")).toBe("850 CE");
    expect(formatYear(1945.62, "id")).toBe("1945");
    expect(yearParts(-20000, "en").suffix).toBe(" YEARS AGO");
    expect(tickLabel(1500, "id")).toBe("1500");
  });
  it("parseYearInput menerima berbagai bentuk", () => {
    expect(parseYearInput("1669.45")).toBeCloseTo(1669.45, 6);
    expect(parseYearInput("1945,62")).toBeCloseTo(1945.62, 6);
    expect(parseYearInput("40.000")).toBe(40000 > 2026 ? 2026 : 40000);
    expect(parseYearInput("1945")).toBe(1945);
    expect(parseYearInput("850")).toBe(850);
    expect(parseYearInput("-40000")).toBe(-40000);
    expect(parseYearInput("40000 tahun lalu")).toBe(2026 - 40000);
    expect(parseYearInput("40.000 years ago")).toBe(2026 - 40000);
    expect(parseYearInput("3200 SM")).toBe(-3199);
    expect(parseYearInput("abc")).toBeNull();
    expect(parseYearInput("99999999")).toBe(END_YEAR);
  });
});

describe("buildLayout", () => {
  for (const mobile of [false, true]) {
    const layout = buildLayout(sortedEvents, { mobile });
    const label = mobile ? "mobile" : "desktop";

    it(`${label}: semua peristiwa tertempatkan satu kali`, () => {
      const ids = layout.clusters.flatMap((c) => c.events.map((e) => e.event.id));
      expect(new Set(ids).size).toBe(sortedEvents.length);
      expect(ids.length).toBe(sortedEvents.length);
    });

    it(`${label}: klaster tidak bertabrakan`, () => {
      for (let i = 1; i < layout.clusters.length; i++) {
        const a = layout.clusters[i - 1];
        const b = layout.clusters[i];
        expect(b.y).toBeGreaterThanOrEqual(a.y + a.height);
      }
    });

    it(`${label}: posisi y setiap klaster cocok dengan tahunnya`, () => {
      for (const c of layout.clusters) {
        // peristiwa sedikit sebelum titik awal skala (Sangiran, sortKey -1.648.000) ditempatkan di awal
        const expected = Math.max(c.year, START_YEAR);
        expect(Math.abs(layout.scale.yToYear(c.y) - expected)).toBeLessThan(expected < -10000 ? 1 : 0.01);
      }
    });

    it(`${label}: klaster aktif ditemukan di tengah klaster`, () => {
      for (const c of layout.clusters) expect(clusterAtY(layout, c.y + c.height / 2)?.id).toBe(c.id);
    });
  }

  it("peristiwa tahun sama atau berdekatan menjadi satu klaster", () => {
    const layout = buildLayout(sortedEvents, { mobile: false });
    const c1669 = layout.clusterOfEvent.get("ev-sombaopu-ledakan");
    expect(c1669?.events.map((e) => e.event.id)).toContain("ev-sombaopu-jatuh");
    const c2009 = layout.clusterOfEvent.get("ev-liyangan-2009");
    expect(c2009?.events.length).toBe(3);
  });

  it("batang durasi untuk endKey dengan panjang memadai", () => {
    const layout = buildLayout(sortedEvents, { mobile: false });
    const borobudur = layout.bars.find((b) => b.event.id === "ev-borobudur-1973");
    expect(borobudur).toBeTruthy();
    expect(borobudur!.bar.y1 - borobudur!.bar.y0).toBeGreaterThan(1500);
  });
});
