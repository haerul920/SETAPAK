/**
 * Versi ringan data jejak (id, nama, tahun, kategori) untuk tata letak guliran dan halaman kredit.
 * Ringkasan, koordinat, dan tautan sumber (data/wikidata-heritage.json) baru dimuat saat laci
 * detail jejak dibuka, supaya paket JavaScript halaman utama tidak membengkak.
 */
import fs from "node:fs";
import path from "node:path";

interface Full {
  id: string;
  name: string;
  nameEn: string;
  year: number;
  yearLabel: string;
  category: string;
}

export function writeTracesLite(root = process.cwd()): number {
  const full = JSON.parse(fs.readFileSync(path.join(root, "data", "wikidata-heritage.json"), "utf8")) as Full[];
  const lite = full.map((t) => ({ id: t.id, name: t.name, nameEn: t.nameEn, year: t.year, yearLabel: t.yearLabel, category: t.category }));
  fs.writeFileSync(path.join(root, "data", "wikidata-heritage-lite.json"), JSON.stringify(lite) + "\n");
  return lite.length;
}
