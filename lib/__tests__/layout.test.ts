import { describe, expect, it } from "vitest";
import { sortedEvents } from "@/data";
import { buildLayout, clearLabelY } from "@/lib/layout";

describe("label garis batas segmen", () => {
  it("clearLabelY tetap di tempat bila bebas dan pindah ke luar klaster bila bertabrakan", () => {
    const clusters = [
      { y: 1000, height: 320 },
      { y: 1500, height: 320 },
    ];
    expect(clearLabelY(500, clusters)).toBe(500);
    const moved = clearLabelY(1100, clusters);
    expect(moved).not.toBe(1100);
    // hasilnya tidak berada di dalam klaster mana pun
    for (const c of clusters) expect(moved + 22 > c.y && moved - 22 < c.y + c.height).toBe(false);
  });

  it("di tata letak nyata, tidak ada label segmen yang menimpa klaster (desktop dan mobile)", () => {
    for (const mobile of [false, true]) {
      const layout = buildLayout(sortedEvents, { mobile });
      expect(layout.segmentMarks.length).toBeGreaterThan(0);
      for (const m of layout.segmentMarks) {
        const hit = layout.clusters.find((c) => m.labelY + 22 > c.y && m.labelY - 22 < c.y + c.height);
        expect(hit, `label ${m.segment.id} (mobile=${mobile}) menimpa ${hit?.id}`).toBeUndefined();
      }
    }
  });
});
