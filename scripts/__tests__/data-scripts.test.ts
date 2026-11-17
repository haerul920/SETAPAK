import { describe, expect, it } from "vitest";
import { sites, sortedEvents } from "@/data";
import { categorize, firstSentence } from "../import-wikidata";
import { haversineKm } from "../match-coords";
import { matchLabel, parseLabel, quoteAround } from "../verify-facts";

describe("parseLabel", () => {
  it("tahun, bulan, abad, dasawarsa, dan tahun lalu", () => {
    expect(parseLabel("16 Juni 682")).toMatchObject({ kind: "years", years: [682], months: [5] });
    expect(parseLabel("1973 - 1983").years).toEqual([1973, 1983]);
    expect(parseLabel("Abad ke-8 - 10")).toMatchObject({ kind: "century", centuries: [8, 10] });
    expect(parseLabel("± awal abad ke-14").centuries).toEqual([14]);
    expect(parseLabel("1970-an")).toMatchObject({ kind: "years", years: [], decadeYears: [1970] });
    expect(parseLabel("1977 - awal 1980-an")).toMatchObject({ years: [1977], decadeYears: [1980] });
    expect(parseLabel("≥ 43.900 tahun lalu")).toMatchObject({ kind: "ago", agoNumbers: [{ value: 43900, unit: "ribu" }] });
    expect(parseLabel("± 1,65 juta tahun lalu").agoNumbers).toEqual([{ value: 1.65, unit: "juta" }]);
    expect(parseLabel("Diperdebatkan").kind).toBe("none");
  });

  it("jam dan angka Hijriah tidak dihitung sebagai tahun", () => {
    expect(parseLabel("16 - 17 Agustus 1945").years).toEqual([1945]);
    expect(parseLabel("1500 (900 H)").years).toEqual([1500]);
  });

  it("semua label di data menghasilkan spesifikasi tanpa NaN", () => {
    for (const e of sortedEvents) {
      const spec = parseLabel(e.dateLabel);
      for (const y of [...spec.years, ...spec.decadeYears, ...spec.centuries]) expect(Number.isFinite(y)).toBe(true);
    }
  });
});

describe("matchLabel", () => {
  it("tahun ada atau hilang", () => {
    expect(matchLabel(parseLabel("1945"), "Proklamasi pada 1945 di Jakarta").match).toBe("cocok");
    expect(matchLabel(parseLabel("1945"), "Proklamasi pada 19450 dan 11945").match).toBe("tidak-ditemukan");
    expect(matchLabel(parseLabel("1973 - 1983"), "dimulai 1973").match).toBe("tidak-ditemukan");
  });

  it("tanggal lengkap: bulan Indonesia atau Inggris", () => {
    expect(matchLabel(parseLabel("14 Juni 1669"), "On 14 June 1669 the wall fell").match).toBe("cocok");
    expect(matchLabel(parseLabel("14 Juni 1669"), "Pada Juni 1669 benteng jatuh").match).toBe("cocok");
    expect(matchLabel(parseLabel("14 Juni 1669"), "Pada 1669 benteng jatuh").match).toBe("cocok-tahun-saja");
  });

  it("abad: ordinal Inggris, abad ke-N, angka Romawi, atau tahun dalam abad", () => {
    expect(matchLabel(parseLabel("Abad ke-9"), "built in the 9th century").match).toBe("cocok");
    expect(matchLabel(parseLabel("Abad ke-9"), "berasal dari abad ke-9 Masehi").match).toBe("cocok");
    expect(matchLabel(parseLabel("Abad ke-9"), "bentuk huruf berasal dari abad IX").match).toBe("cocok");
    expect(matchLabel(parseLabel("Abad ke-9"), "dibangun sekitar 850").match).toBe("cocok-abad");
    expect(matchLabel(parseLabel("Abad ke-9"), "dibangun tahun 1200").match).toBe("tidak-ditemukan");
  });

  it("dasawarsa menerima tahun mana pun di dalamnya", () => {
    expect(matchLabel(parseLabel("1970-an"), "pemugaran pada 1975 sampai 1976").match).toBe("cocok");
    expect(matchLabel(parseLabel("1970-an"), "pemugaran pada 1985").match).toBe("tidak-ditemukan");
  });

  it("tahun lalu: format ribuan dan satuan ka", () => {
    expect(matchLabel(parseLabel("≥ 43.900 tahun lalu"), "dated to 43,900 years ago").match).toBe("cocok");
    expect(matchLabel(parseLabel("≥ 43.900 tahun lalu"), "dated to 43.9 ka").match).toBe("cocok");
    expect(matchLabel(parseLabel("± 1,65 juta tahun lalu"), "about 1.65 million years old").match).toBe("cocok");
    expect(matchLabel(parseLabel("≥ 43.900 tahun lalu"), "dated to 10,000 years ago").match).toBe("tidak-ditemukan");
  });

  it("kutipan maksimal 25 kata dan memuat token", () => {
    const text = `${"kata ".repeat(60)}pada 1945 proklamasi dibacakan ${"akhir ".repeat(60)}`;
    const q = quoteAround(text, "1945");
    expect(q).toContain("1945");
    expect(q.replace(/\.\.\./g, "").split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(25);
  });
});

describe("import-wikidata", () => {
  it("firstSentence memotong di akhir kalimat, bukan di singkatan atau angka desimal", () => {
    expect(firstSentence("Candi Sewu adalah candi Buddha. Dibangun pada abad ke-8.")).toBe("Candi Sewu adalah candi Buddha.");
    expect(firstSentence("Dr. Soetomo mendirikan Budi Utomo. Itu terjadi pada 1908.")).toBe("Dr. Soetomo mendirikan Budi Utomo.");
    expect(firstSentence("Tingginya 6,5 meter dan lebarnya 4.2 meter. Kalimat lain.")).toBe("Tingginya 6,5 meter dan lebarnya 4.2 meter.");
  });

  it("categorize memakai nama lebih dulu, lalu kelas Wikidata, lalu tahun", () => {
    expect(categorize("Candi Plaosan", new Set(), 850)).toBe("candi");
    expect(categorize("Masjid Raya Baiturrahman", new Set(), 1881)).toBe("islam");
    expect(categorize("Benteng Marlborough", new Set(), 1714)).toBe("benteng");
    expect(categorize("Prasasti Talang Tuo", new Set(), 684)).toBe("prasasti");
    expect(categorize("Tugu Pahlawan", new Set(), 1951)).toBe("kemerdekaan");
    expect(categorize("Sesuatu", new Set(["Q32815"]), 1900)).toBe("islam");
    expect(categorize("Stasiun Tawang", new Set(), 1914)).toBe("kolonial");
    expect(categorize("Stasiun Baru", new Set(), 2010)).toBe("lainnya");
  });
});

describe("match-coords", () => {
  it("haversineKm", () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0);
    const borobudurToPrambanan = haversineKm({ lat: -7.608, lng: 110.204 }, { lat: -7.752, lng: 110.491 });
    expect(borobudurToPrambanan).toBeGreaterThan(30);
    expect(borobudurToPrambanan).toBeLessThan(40);
  });
});

describe("integritas data v4", () => {
  it("koordinat semua situs berada di dalam kotak Indonesia", () => {
    for (const s of sites) {
      expect(s.coords.lat, s.slug).toBeGreaterThan(-11.8);
      expect(s.coords.lat, s.slug).toBeLessThan(6.5);
      expect(s.coords.lng, s.slug).toBeGreaterThan(94);
      expect(s.coords.lng, s.slug).toBeLessThan(141.5);
    }
  });

  it("Jam Gadang berada di selatan khatulistiwa setelah koreksi", () => {
    expect(sites.find((s) => s.slug === "jam-gadang")!.coords.lat).toBeLessThan(0);
  });

  it("peristiwa tidak berstatus terverifikasi tanpa sumber, dan tanpa em dash", () => {
    for (const e of sortedEvents) {
      if (e.status === "terverifikasi" && e.id !== "ev-penutup-2026") expect(e.sourceIds.length, e.id).toBeGreaterThan(0);
      expect(e.title + e.narrative + (e.alternatives ?? []).join(" "), e.id).not.toMatch(/—/);
    }
  });

  it("peristiwa yang berstatus diperdebatkan menyertakan alternatif atau label yang menyebut perdebatan", () => {
    for (const e of sortedEvents.filter((x) => x.status === "diperdebatkan")) {
      const flagged = /diperdebatkan/i.test(e.dateLabel) || (e.alternatives?.length ?? 0) > 0;
      expect(flagged, e.id).toBe(true);
    }
  });
});
