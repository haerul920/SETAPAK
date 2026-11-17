/**
 * Validasi data/media.json terhadap file dan aturan lisensi (docs/ASSET_PIPELINE.md).
 * Gagal (exit 1) jika:
 *  - entri tanpa file, tanpa pembuat, atau berlisensi tidak diizinkan
 *  - ada file di public/media atau public/audio yang tidak tercatat di media.json
 *  - kode merujuk media id / path /media/... yang tidak ada di media.json
 */
import fs from "node:fs";
import path from "node:path";
import { isAllowedLicense } from "./lib/licenses";

const ROOT = process.cwd();
const media = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "media.json"), "utf8")) as Array<{
  id: string;
  kind: "image" | "audio";
  src: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  alt: string;
  cutout?: string;
  sizes?: number[];
}>;
const SIZES = [640, 1280, 1920];
const errors: string[] = [];
const ids = new Set<string>();
const knownFiles = new Set<string>();

for (const m of media) {
  if (ids.has(m.id)) errors.push(`id ganda: ${m.id}`);
  ids.add(m.id);
  if (!m.author?.trim()) errors.push(`${m.id}: pembuat kosong`);
  if (!m.alt?.trim()) errors.push(`${m.id}: alt kosong`);
  if (!m.sourceUrl?.startsWith("http")) errors.push(`${m.id}: sourceUrl tidak valid`);
  if (!(isAllowedLicense(m.license) || m.license === "Izin tertulis")) errors.push(`${m.id}: lisensi tidak diizinkan (${m.license})`);
  if (m.kind === "image") {
    for (const s of m.sizes ?? SIZES) {
      for (const ext of ["webp", "avif"]) {
        const rel = `${m.src}-${s}.${ext}`;
        knownFiles.add(path.normalize(rel));
        if (!fs.existsSync(path.join(ROOT, "public", rel))) errors.push(`${m.id}: file hilang ${rel}`);
      }
    }
    if (m.cutout) {
      knownFiles.add(path.normalize(m.cutout));
      if (!fs.existsSync(path.join(ROOT, "public", m.cutout))) errors.push(`${m.id}: cutout hilang ${m.cutout}`);
    }
  } else {
    knownFiles.add(path.normalize(m.src));
    if (!fs.existsSync(path.join(ROOT, "public", m.src))) errors.push(`${m.id}: file audio hilang ${m.src}`);
  }
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

for (const sub of ["media", "audio"]) {
  for (const f of walk(path.join(ROOT, "public", sub))) {
    const rel = path.normalize("/" + path.relative(path.join(ROOT, "public"), f).replace(/\\/g, "/"));
    if (!knownFiles.has(rel)) errors.push(`file tanpa kredit di media.json: public${rel.replace(/\\/g, "/")}`);
  }
}

// Rujukan di kode
// id media yang dirujuk langsung di kode (misal "borobudur-hero-1")
const ID_RE = /["'`]((?:wd-Q\d+|sangiran|karst-maros-pangkep|liyangan|muarajambi|borobudur|prambanan|sambisari|kimpulan|trowulan|somba-opu|fort-rotterdam|istana-maimun|rumah-maeda|ev-[a-z0-9-]+|global)-(?:hero|gallery|then|now|texture)-\d+)["'`]/g;
const codeFiles = [...walk(path.join(ROOT, "app")), ...walk(path.join(ROOT, "components")), ...walk(path.join(ROOT, "lib"))].filter((f) => /\.(tsx?|json)$/.test(f));
for (const f of codeFiles) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/["'`](\/media\/[a-z0-9-]+\/[a-z0-9-]+)/g)) {
    if (!media.some((x) => x.src === m[1] || x.cutout?.startsWith(m[1]))) errors.push(`${path.relative(ROOT, f)}: path aset tanpa entri media.json ${m[1]}`);
  }
  for (const m of src.matchAll(ID_RE)) {
    if (!ids.has(m[1])) errors.push(`${path.relative(ROOT, f)}: id media tak dikenal ${m[1]}`);
  }
}
const images = media.filter((m) => m.kind === "image").length;
const audio = media.length - images;
if (errors.length) {
  console.error(`✗ validasi media gagal (${errors.length} masalah):`);
  errors.slice(0, 80).forEach((e) => console.error("  - " + e));
  process.exit(1);
}
console.log(`✓ media.json valid: ${images} gambar, ${audio} audio, semua berkredit dan berlisensi terbuka.`);
