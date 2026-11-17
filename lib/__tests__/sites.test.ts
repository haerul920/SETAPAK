import { describe, expect, it } from "vitest";
import { sites } from "@/data";
import { hexToOklch } from "@/lib/atmosphere";
import { SITE_COLORS, siteColor } from "@/lib/sites";

describe("warna situs", () => {
  it("setiap situs punya warna hex yang valid dan unik", () => {
    const values = sites.map((s) => SITE_COLORS[s.slug]);
    for (const v of values) expect(v).toMatch(/^#[0-9a-f]{6}$/);
    expect(new Set(values).size).toBe(sites.length);
  });

  it("warna cukup berbeda satu sama lain", () => {
    const labs = sites.map((s) => {
      const [L, C, H] = hexToOklch(SITE_COLORS[s.slug]);
      const h = (H * Math.PI) / 180;
      return [L, C * Math.cos(h), C * Math.sin(h)];
    });
    let min = Infinity;
    for (let i = 0; i < labs.length; i++) {
      for (let j = i + 1; j < labs.length; j++) {
        min = Math.min(min, Math.hypot(labs[i][0] - labs[j][0], labs[i][1] - labs[j][1], labs[i][2] - labs[j][2]));
      }
    }
    expect(min).toBeGreaterThan(0.04);
  });

  it("13 situs inti mempertahankan warna v3 dan slug tak dikenal netral", () => {
    expect(siteColor("borobudur")).toBe("#e7b75f");
    expect(siteColor("tidak-ada")).toBe("#a8916c");
    expect(siteColor(null)).toBe("#a8916c");
  });
});
