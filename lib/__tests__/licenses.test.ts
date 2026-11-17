import { describe, expect, it } from "vitest";
import { extractYear, isAllowedLicense, stripHtml } from "../../scripts/lib/licenses";

describe("scripts/lib/licenses", () => {
  it("mengizinkan PD, CC0, CC BY, dan CC BY-SA", () => {
    for (const l of ["Public domain", "PD-old", "CC0", "CC BY 2.0", "CC BY 4.0", "CC BY-SA 3.0", "CC BY-SA 4.0", "CC BY-SA 3.0 igo"]) {
      expect(isAllowedLicense(l), l).toBe(true);
    }
  });
  it("menolak NC, ND, tanpa lisensi, dan fair use", () => {
    for (const l of ["CC BY-NC 4.0", "CC BY-NC-SA 2.0", "CC BY-ND 4.0", "", "Fair use", "No restrictions", "GFDL", undefined]) {
      expect(isAllowedLicense(l as string), String(l)).toBe(false);
    }
  });
  it("membersihkan HTML dan mengganti em dash", () => {
    expect(stripHtml('<a href="x">Nama</a> — Foto')).toBe("Nama, Foto");
    expect(extractYear("circa 1872")).toBe("1872");
    expect(extractYear("<span>1890-1891</span>")).toBe("1890-1891");
  });
});
