import { describe, expect, it } from "vitest";
import { COLOR_STOPS, contrastRatio, createAtmosphere, hexToOklch, LIGHT_THRESHOLD, MID_RANGE, oklchToHex } from "@/lib/atmosphere";
import { createTimeScale } from "@/lib/time-scale";

const LIGHT_INK = "#f5ecdc";
const DARK_INK = "#1d1a16";

describe("atmosfer", () => {
  it("konversi hex <-> OKLCH bolak-balik", () => {
    for (const s of COLOR_STOPS) {
      expect(oklchToHex(hexToOklch(s.top))).toBe(s.top);
      expect(oklchToHex(hexToOklch(s.bottom))).toBe(s.bottom);
    }
  });

  it("warna tepat di titik tahun dan kontinu di antaranya", () => {
    const scale = createTimeScale();
    const at = createAtmosphere(scale);
    expect(at(0).top).toBe(COLOR_STOPS[0].top);
    expect(at(scale.yearToY(1500)).bottom).toBe("#16323d");
    expect(at(scale.total).top).toBe("#d9e2e8");
    let prev = at(0).luminance;
    for (let y = 0; y <= scale.total; y += 250) {
      const l = at(y).luminance;
      expect(Math.abs(l - prev)).toBeLessThan(0.05);
      prev = l;
    }
  });

  it("warna teks yang dipilih memenuhi AA di luar rentang tengah", () => {
    const scale = createTimeScale();
    const at = createAtmosphere(scale);
    for (let y = 0; y <= scale.total; y += 400) {
      const a = at(y);
      if (a.luminance > MID_RANGE[0] && a.luminance < MID_RANGE[1]) continue;
      const ink = a.luminance > LIGHT_THRESHOLD ? DARK_INK : LIGHT_INK;
      expect(contrastRatio(ink, a.top)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(ink, a.bottom)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
