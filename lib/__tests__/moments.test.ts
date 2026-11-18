import { describe, expect, it } from "vitest";
import { MOMENT_EVENTS, specialFor } from "@/components/moments/registry";
import { sortedEvents } from "@/data";
import { buildLayout } from "@/lib/layout";

const byId = new Map(sortedEvents.map((e) => [e.id, e]));

describe("momen istimewa v4", () => {
  it("semua id pemicu ada di data", () => {
    for (const ids of Object.values(MOMENT_EVENTS)) for (const id of ids) expect(byId.has(id), id).toBe(true);
  });

  it("registry memetakan gempa, tsunami, dan kapal PLTD Apung", () => {
    expect(specialFor(byId.get("ev-tugu-1867")!)?.kind).toBe("quake");
    expect(specialFor(byId.get("ev-prambanan-2006")!)?.kind).toBe("quake");
    expect(specialFor(byId.get("ev-sewu-2006")!)?.kind).toBe("quake");
    expect(specialFor(byId.get("ev-tsunami-baiturrahman")!)?.kind).toBe("steady");
    expect(specialFor(byId.get("ev-tsunami-pltd")!)?.kind).toBe("drift");
  });

  it("momen v3 tetap berfungsi", () => {
    expect(specialFor(byId.get("ev-proklamasi-1945")!)?.kind).toBe("clock");
    expect(specialFor(byId.get("ev-sombaopu-ledakan")!)?.kind).toBe("blast");
    expect(specialFor(byId.get("ev-borobudur-2010")!)?.kind).toBe("ashSweep");
  });

  it("rangkaian 1945: tujuh peristiwa berurutan di tujuh situs, berjarak cukup di lintasan", () => {
    const events = MOMENT_EVENTS.seq1945.map((id) => byId.get(id)!);
    expect(new Set(events.map((e) => e.siteSlug)).size).toBeGreaterThanOrEqual(6);
    for (const mobile of [false, true]) {
      const layout = buildLayout(sortedEvents, { mobile });
      const ys = events.map((e) => layout.eventY.get(e.id)!);
      for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1]);
      // seluruh rangkaian membentang lebih dari tiga layar (skala lokal melambat Agustus sampai Desember)
      expect(ys[ys.length - 1] - ys[0]).toBeGreaterThan(3 * (mobile ? 760 : 900));
    }
  });

  it("jalur pala: benteng dan penaklukan Banda berurutan menurut tahun", () => {
    const years = MOMENT_EVENTS.spice.map((id) => byId.get(id)!.sortKey);
    expect(years).toEqual([...years].sort((a, b) => a - b));
    expect(Math.floor(years[0])).toBe(1575);
    expect(Math.floor(years[years.length - 1])).toBe(1621);
  });

  it("tsunami: kapal dan masjid berada pada tahun yang sama", () => {
    const a = byId.get("ev-tsunami-baiturrahman")!;
    const b = byId.get("ev-tsunami-pltd")!;
    expect(Math.floor(a.sortKey)).toBe(2004);
    expect(Math.floor(b.sortKey)).toBe(2004);
  });
});
