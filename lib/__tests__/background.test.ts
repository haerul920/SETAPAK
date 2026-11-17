import { describe, expect, it } from "vitest";
import {
  createSky,
  eraStrength,
  fxAt,
  fxWindows,
  initialGovernor,
  PARTICLES,
  particleCount,
  SCENE_RANGES,
  sceneEraAt,
  sceneSpans,
  shaderScale,
  stepGovernor,
  FPS_COOLDOWN_MS,
} from "@/lib/background";
import { ridge, rng, scenePlanes, TILE_H, TILE_W } from "@/lib/scene-shapes";
import { END_YEAR, START_YEAR, createTimeScale } from "@/lib/time-scale";

describe("masa pemandangan", () => {
  it("rentang berurutan tanpa celah dan menutup seluruh waktu", () => {
    expect(SCENE_RANGES[0].from).toBe(-Infinity);
    expect(SCENE_RANGES[SCENE_RANGES.length - 1].to).toBe(Infinity);
    for (let i = 1; i < SCENE_RANGES.length; i++) expect(SCENE_RANGES[i].from).toBe(SCENE_RANGES[i - 1].to);
  });

  it("sceneEraAt memetakan tahun penting ke masa yang benar", () => {
    expect(sceneEraAt(START_YEAR)).toBe("purba");
    expect(sceneEraAt(-51_200)).toBe("seni-cadas");
    expect(sceneEraAt(-3_000)).toBe("senyap");
    expect(sceneEraAt(800)).toBe("klasik");
    expect(sceneEraAt(1_350)).toBe("majapahit");
    expect(sceneEraAt(1_600)).toBe("maritim");
    expect(sceneEraAt(1_814)).toBe("kolonial");
    expect(sceneEraAt(1_945.6)).toBe("kemerdekaan");
    expect(sceneEraAt(END_YEAR)).toBe("kini");
  });

  it("kekuatan masa bersilang-pudar: penuh di tengah, nol jauh di luar, tak pernah melonjak", () => {
    const scale = createTimeScale();
    const spans = sceneSpans(scale);
    const fade = 1000;
    for (const s of spans) {
      if (s.y1 < 1e8 && s.y0 > -1e8) {
        expect(eraStrength(s, (s.y0 + s.y1) / 2, fade)).toBe(1);
        expect(eraStrength(s, s.y1 + fade * 2, fade)).toBe(0);
        expect(eraStrength(s, s.y0 - fade * 2, fade)).toBe(0);
      }
    }
    // di sepanjang lintasan selalu ada paling banyak dua masa aktif
    for (let y = 0; y < scale.total; y += 700) {
      const active = spans.filter((s) => eraStrength(s, y, 900) > 0.001);
      expect(active.length).toBeGreaterThanOrEqual(1);
      expect(active.length).toBeLessThanOrEqual(2);
    }
  });
});

describe("parameter shader langit", () => {
  const scale = createTimeScale();
  const sky = createSky(scale);
  it("selalu dalam rentang dan tidak pernah NaN", () => {
    for (let y = 0; y <= scale.total; y += 333) {
      const p = sky(y);
      for (const v of [p.fog, p.rays, p.caustics, ...p.light]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("halus: perubahan antarpiksel kecil", () => {
    let prev = sky(0);
    for (let y = 1; y <= scale.total; y += 25) {
      const p = sky(y);
      expect(Math.abs(p.fog - prev.fog)).toBeLessThan(0.02);
      expect(Math.abs(p.rays - prev.rays)).toBeLessThan(0.02);
      prev = p;
    }
  });

  it("kabut paling pekat di masa purba, sinar paling kuat pagi 2026, kaustik hanya di masa maritim", () => {
    expect(sky(0).fog).toBeGreaterThan(sky(scale.total).fog);
    expect(sky(scale.total).rays).toBe(1);
    expect(sky(scale.yearToY(1600)).caustics).toBeGreaterThan(0.4);
    expect(sky(scale.yearToY(800)).caustics).toBe(0);
    expect(sky(scale.yearToY(1990)).caustics).toBe(0);
  });
});

describe("efek api", () => {
  it("jendela dibuat dari peristiwa bernuansa api dan naik turun linear", () => {
    const events = [
      { id: "a", title: "Letusan besar", narrative: "" },
      { id: "b", title: "Prasasti ditemukan", narrative: "tidak ada" },
      { id: "c", title: "Rumah", narrative: "terbakar habis" },
    ];
    const y = new Map([
      ["a", 1000],
      ["b", 2000],
      ["c", 3000],
    ]);
    const w = fxWindows(events, y, 300);
    expect(w.length).toBe(2);
    expect(fxAt(w, 1000, 800)).toBe(1);
    expect(fxAt(w, 2000, 400)).toBe(0);
    expect(fxAt(w, 1000 + 300 + 400, 800)).toBeCloseTo(0.5, 5);
    expect(fxAt(w, 5000, 800)).toBe(0);
  });
});

describe("partikel depan", () => {
  it("setiap masa punya spesifikasi, dan jumlah partikel mengikuti kualitas", () => {
    for (const r of SCENE_RANGES) {
      const s = PARTICLES[r.era];
      expect(s.size[0]).toBeLessThan(s.size[1]);
      expect(s.color.every((c) => c >= 0 && c <= 255)).toBe(true);
    }
    expect(particleCount(2, false)).toBeGreaterThanOrEqual(20);
    expect(particleCount(2, false)).toBeLessThanOrEqual(40);
    expect(particleCount(1, false)).toBeGreaterThanOrEqual(20);
    expect(particleCount(0, false)).toBeLessThan(particleCount(1, false));
    expect(particleCount(2, true)).toBeLessThan(particleCount(2, false));
  });
});

describe("penjaga kualitas", () => {
  it("turun satu tingkat setelah 2 detik di bawah 45 FPS", () => {
    let st = initialGovernor(2);
    for (let i = 0; i < 3; i++) st = stepGovernor(st, 30, 500);
    expect(st.level).toBe(2);
    st = stepGovernor(st, 30, 500);
    expect(st.level).toBe(1);
    expect(st.cooldownMs).toBe(FPS_COOLDOWN_MS);
  });

  it("FPS yang pulih mereset hitungan, dan jeda mencegah jatuh berturut-turut", () => {
    let st = initialGovernor(2);
    for (let i = 0; i < 3; i++) st = stepGovernor(st, 30, 500);
    st = stepGovernor(st, 58, 500);
    expect(st.lowMs).toBe(0);
    for (let i = 0; i < 4; i++) st = stepGovernor(st, 30, 500);
    expect(st.level).toBe(1);
    // masa jeda: FPS rendah tidak langsung menurunkan lagi
    for (let i = 0; i < 4; i++) st = stepGovernor(st, 20, 500);
    expect(st.level).toBe(1);
  });

  it("tidak pernah turun di bawah 0 dan resolusi shader mengecil di tingkat hemat", () => {
    let st = initialGovernor(0);
    for (let i = 0; i < 40; i++) st = stepGovernor(st, 5, 500);
    expect(st.level).toBe(0);
    expect(shaderScale(2)).toBe(0.5);
    expect(shaderScale(0)).toBeLessThan(shaderScale(1));
  });
});

describe("siluet pemandangan", () => {
  it("garis punggung periodik: awal dan akhir sama tinggi, dan deterministik", () => {
    const a = ridge(5, 600, 120);
    const b = ridge(5, 600, 120);
    expect(a).toBe(b);
    const nums = (a.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    // pasangan: [0,H] lalu titik pertama ... titik terakhir [W, y0] lalu [W,H]
    const firstY = nums[3];
    const lastY = nums[nums.length - 3];
    expect(nums[2]).toBe(0);
    expect(lastY).toBe(firstY);
    expect(nums[nums.length - 4]).toBe(TILE_W);
  });

  it("setiap masa punya tiga bidang berisi path yang valid", () => {
    for (const r of SCENE_RANGES) {
      const p = scenePlanes(r.era);
      for (const d of [p.far, p.mid, p.near]) {
        expect(d.length).toBeGreaterThan(40);
        expect(d).not.toMatch(/NaN|Infinity|undefined/);
        expect(d.startsWith("M")).toBe(true);
        const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
        expect(nums.every((n) => Number.isFinite(n))).toBe(true);
        // koordinat tetap di sekitar kotak 1600 x 900 (ada perintah relatif, jadi batasnya longgar)
        expect(Math.max(...nums.map(Math.abs))).toBeLessThan(TILE_W + 600);
      }
    }
  });

  it("pembangkit acak deterministik dan berada di [0,1)", () => {
    const a = rng(9);
    const b = rng(9);
    for (let i = 0; i < 50; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(TILE_H).toBe(900);
  });
});
