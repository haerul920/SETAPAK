import { describe, expect, it } from "vitest";
import { sortedEvents } from "@/data";
import { AUTO_BASE_PX_S, AUTO_IN_CLUSTER, AUTO_IN_GAP, autoSpeedAt, nextAutoSpeed } from "@/lib/autoscroll";
import { buildLayout } from "@/lib/layout";

const layout = buildLayout(sortedEvents, { mobile: false });

describe("gulir otomatis", () => {
  it("melambat di dalam klaster peristiwa dan melaju di bentangan kosong", () => {
    const c = layout.clusters[10];
    const inside = autoSpeedAt(layout, c.y + 10, 1);
    expect(inside).toBeCloseTo(AUTO_BASE_PX_S * AUTO_IN_CLUSTER);
    // tengah celah terlebar antara dua klaster adalah bentangan kosong
    let best = { from: 0, gap: 0 };
    for (let i = 0; i + 1 < layout.clusters.length; i++) {
      const from = layout.clusters[i].y + layout.clusters[i].height;
      const gap = layout.clusters[i + 1].y - from;
      if (gap > best.gap) best = { from, gap };
    }
    expect(best.gap).toBeGreaterThan(1500);
    const gapY = best.from + best.gap / 2;
    expect(autoSpeedAt(layout, gapY, 1)).toBeCloseTo(AUTO_BASE_PX_S * AUTO_IN_GAP);
    expect(autoSpeedAt(layout, gapY, 1)).toBeGreaterThan(inside);
  });

  it("melambat sedikit sebelum klaster dimulai (tepi pembacaan)", () => {
    const c = layout.clusters[20];
    expect(autoSpeedAt(layout, c.y - 60, 1)).toBeCloseTo(AUTO_BASE_PX_S * AUTO_IN_CLUSTER);
  });

  it("kecepatan berskala 1x, 2x, 4x dan siklus kembali ke 1x", () => {
    const y = layout.clusters[5].y + 5;
    expect(autoSpeedAt(layout, y, 2)).toBeCloseTo(autoSpeedAt(layout, y, 1) * 2);
    expect(autoSpeedAt(layout, y, 4)).toBeCloseTo(autoSpeedAt(layout, y, 1) * 4);
    expect(nextAutoSpeed(1)).toBe(2);
    expect(nextAutoSpeed(2)).toBe(4);
    expect(nextAutoSpeed(4)).toBe(1);
  });

  it("seluruh guliran selesai dalam waktu wajar pada 1x dan lebih cepat pada 4x", () => {
    let t1 = 0;
    let t4 = 0;
    for (let y = 0; y < layout.total; y += 50) {
      t1 += 50 / autoSpeedAt(layout, y, 1);
      t4 += 50 / autoSpeedAt(layout, y, 4);
    }
    expect(t1).toBeGreaterThan(t4 * 3.9);
    expect(t1).toBeLessThan(60 * 60);
    expect(t4).toBeGreaterThan(60);
  });
});
