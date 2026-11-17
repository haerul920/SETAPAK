/**
 * SETAPAK - Tabel cakupan aset per situs, ditulis ke blok penanda di docs/ASSET_GAPS.md.
 * Sumber: data/media.json dan data/index.ts. Blok jejak Wikidata di berkas yang sama tidak disentuh.
 *
 * Pemakaian: tsx scripts/asset-gaps.ts
 */
import fs from "node:fs";
import path from "node:path";
import { sites } from "../data";

const ROOT = process.cwd();
const DOC = path.join(ROOT, "docs", "ASSET_GAPS.md");
const BEGIN = "<!-- assets:begin -->";
const END = "<!-- assets:end -->";

interface M {
  id: string;
  target: string;
  role: string;
  kind: string;
  cutout?: string;
}

const media = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "media.json"), "utf8")) as M[];
const traceCount = media.filter((m) => m.target.startsWith("wd-") && m.kind === "image").length;
const images = media.filter((m) => m.kind === "image");

const bySite = new Map<string, Record<string, number>>();
for (const m of images) {
  const r = bySite.get(m.target) ?? {};
  r[m.role] = (r[m.role] ?? 0) + 1;
  bySite.set(m.target, r);
}

const rows: string[] = [];
const noHero: string[] = [];
const noThen: string[] = [];
const fewGallery: string[] = [];
for (const s of sites) {
  const r = bySite.get(s.slug) ?? {};
  const hero = r.hero ?? 0;
  const gallery = r.gallery ?? 0;
  const then = r.then ?? 0;
  const cut = images.filter((m) => m.target === s.slug && m.cutout).length;
  if (!hero) noHero.push(s.name);
  if (!then) noThen.push(s.name);
  if (hero + gallery < 3) fewGallery.push(`${s.name} (${hero + gallery})`);
  rows.push(`| ${s.name} | ${hero} | ${gallery} | ${then} | ${cut || ""} |`);
}

const block = [
  BEGIN,
  "## Cakupan foto per situs (dibuat otomatis oleh `pnpm assets:gaps`)",
  `Situs kurasi: ${sites.length}. Foto situs: ${images.length - traceCount}. Foto jejak tingkat 3 (Wikidata P18): ${traceCount}.`,
  "",
  `- Situs tanpa foto utama: ${noHero.length ? noHero.join(", ") : "tidak ada"}.`,
  `- Situs tanpa foto arsip (Dulu): ${noThen.length} situs. Foto arsip hanya dipakai bila ada berlisensi terbuka dan jelas lokasinya: ${noThen.join(", ")}.`,
  `- Situs dengan foto utama dan galeri kurang dari 3: ${fewGallery.length ? fewGallery.join(", ") : "tidak ada"}.`,
  "",
  "| Situs | Utama | Galeri | Arsip | Cutout |",
  "|---|---|---|---|---|",
  ...rows,
  END,
].join("\n");

let doc = fs.readFileSync(DOC, "utf8");
const a = doc.indexOf(BEGIN);
const b = doc.indexOf(END);
if (a >= 0 && b > a) doc = doc.slice(0, a) + block + doc.slice(b + END.length);
else doc = doc.trimEnd() + "\n\n" + block + "\n";
fs.writeFileSync(DOC, doc);
console.log(`Tulis ${path.relative(ROOT, DOC)}: ${noHero.length} situs tanpa foto utama, ${noThen.length} tanpa arsip.`);
