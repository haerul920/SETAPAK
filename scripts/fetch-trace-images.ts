/**
 * SETAPAK - Foto jejak tingkat 3 dari Wikidata P18 (docs/DATA_EXPANSION.md B.8, docs/ASSET_PIPELINE.md).
 *
 * Tahap:
 *   fetch  : untuk tiap jejak di data/wikidata-heritage.json yang punya `image`, tanya Commons
 *            (lisensi, ukuran, pembuat), saring (lisensi diizinkan, JPEG/PNG, >= 700 px, ada
 *            pembuat, bukan logo/peta/denah/potret), unduh thumbnail 1280 px, tulis
 *            scripts/.cache/trace-candidates.json
 *   build  : ubah kandidat yang tidak ada di data/trace-rejects.json menjadi WebP/AVIF 640 dan 1280
 *            (+ blur placeholder) di public/media/<qid>/, tambahkan ke data/media.json
 *
 * Pemeriksaan visual dilakukan terpisah: `tsx scripts/pack-sheets.ts --file=trace --group-by=key`
 * lalu kandidat yang ditolak dicatat di data/trace-rejects.json dengan alasannya.
 *
 * Pemakaian: tsx scripts/fetch-trace-images.ts [fetch|build]
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { extractYear, isAllowedLicense, licenseUrlFor, stripHtml } from "./lib/licenses";
import { cacheRead, cacheWrite, politeFetch, sleep, UA } from "./lib/net";
import type { Trace } from "./import-wikidata";
import type { Candidate } from "./fetch-assets";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, "scripts", ".cache");
const RAW = path.join(CACHE, "raw");
const CAND_FILE = path.join(CACHE, "trace-candidates.json");
const REJECT_FILE = path.join(ROOT, "data", "trace-rejects.json");
const MEDIA_FILE = path.join(ROOT, "data", "media.json");
const PUBLIC_MEDIA = path.join(ROOT, "public", "media");
const API = "https://commons.wikimedia.org/w/api.php";
const SIZES = [640, 1280] as const;
const ACCESSED = new Date().toISOString().slice(0, 10);
const BUCKET = 36;

const BAD_TITLE = /logo|icon|\bmap\b|peta\b|kaart|diagram|plan\b|denah|stamp|perangko|coin|banknote|\buang\b|poster|selfie|wedding|pengantin|cosplay|\.svg|\.gif|screenshot|signature|flag|bendera|portrait|potret/i;

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(0, 6);
}

interface PageInfo {
  title: string;
  imageinfo?: {
    url: string;
    thumburl?: string;
    descriptionurl: string;
    mime: string;
    width: number;
    height: number;
    size: number;
    extmetadata?: Record<string, { value: string }>;
  }[];
}

async function queryBatch(titles: string[]): Promise<{ pages: PageInfo[]; redirects: Map<string, string> }> {
  const qs = new URLSearchParams({
    action: "query",
    titles: titles.map((t) => `File:${t.replace(/^File:/, "")}`).join("|"),
    redirects: "1",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "1280",
    iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|Credit|DateTimeOriginal|Restrictions",
    format: "json",
    origin: "*",
  });
  const url = `${API}?${qs.toString()}`;
  type Res = { query?: { pages?: Record<string, PageInfo>; redirects?: { from: string; to: string }[]; normalized?: { from: string; to: string }[] } };
  let res = cacheRead<Res>("trace-commons", url);
  if (!res) {
    const r = await politeFetch(url, { gapMs: 400, accept: "application/json" });
    if (!r.ok) return { pages: [], redirects: new Map() };
    res = JSON.parse(r.body) as Res;
    cacheWrite("trace-commons", url, res);
  }
  const redirects = new Map<string, string>();
  for (const x of [...(res.query?.normalized ?? []), ...(res.query?.redirects ?? [])]) redirects.set(x.to, x.from);
  return { pages: Object.values(res.query?.pages ?? {}), redirects };
}

async function download(url: string, dest: string): Promise<boolean> {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) return true;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60_000) });
      if (res.status === 429 || res.status >= 500) {
        await sleep(Math.min(30, Number(res.headers.get("retry-after")) || 5 * (attempt + 1)) * 1000);
        continue;
      }
      if (!res.ok) return false;
      fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      return true;
    } catch {
      /* ulangi */
    }
  }
  return false;
}

async function stageFetch(): Promise<void> {
  const traces = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "wikidata-heritage.json"), "utf8")) as Trace[];
  const withImage = traces.filter((t) => t.image);
  console.log(`${withImage.length} jejak punya foto P18`);
  fs.mkdirSync(RAW, { recursive: true });
  const byTitle = new Map<string, Trace>();
  for (const t of withImage) byTitle.set(t.image!.replace(/_/g, " "), t);

  const out: (Candidate & { traceId: string; traceName: string; bucket: number })[] = [];
  const rejected: Record<string, number> = { lisensi: 0, ukuran: 0, mime: 0, judul: 0, tanpaPembuat: 0, tanpaInfo: 0, unduhGagal: 0 };
  const titles = [...byTitle.keys()];
  for (let i = 0; i < titles.length; i += 40) {
    const { pages, redirects } = await queryBatch(titles.slice(i, i + 40));
    for (const p of pages) {
      const original = redirects.get(p.title) ?? p.title;
      const clean = (s: string) => s.replace(/^File:/, "").replace(/_/g, " ");
      const trace = byTitle.get(clean(original)) ?? byTitle.get(clean(p.title));
      if (!trace) continue;
      const ii = p.imageinfo?.[0];
      if (!ii) {
        rejected.tanpaInfo++;
        continue;
      }
      const md = ii.extmetadata ?? {};
      const license = stripHtml(md.LicenseShortName?.value);
      if (!isAllowedLicense(license)) {
        rejected.lisensi++;
        continue;
      }
      if (/trademark|insignia/.test(stripHtml(md.Restrictions?.value).toLowerCase())) {
        rejected.lisensi++;
        continue;
      }
      if (!/jpeg|png/.test(ii.mime)) {
        rejected.mime++;
        continue;
      }
      if (Math.max(ii.width, ii.height) < 700) {
        rejected.ukuran++;
        continue;
      }
      if (BAD_TITLE.test(p.title)) {
        rejected.judul++;
        continue;
      }
      const author = stripHtml(md.Artist?.value) || stripHtml(md.Credit?.value);
      if (!author) {
        rejected.tanpaPembuat++;
        continue;
      }
      const qid = trace.id.replace(/^wd-/, "");
      const cid = `wd-${qid}-trace-${hash(p.title)}`;
      const file = path.join(RAW, `${cid}.jpg`);
      if (!(await download(ii.thumburl ?? ii.url, file))) {
        rejected.unduhGagal++;
        continue;
      }
      await sleep(250);
      out.push({
        cid,
        key: "trace",
        target: trace.id,
        role: "hero",
        title: p.title,
        pageUrl: ii.descriptionurl,
        thumbUrl: ii.thumburl ?? ii.url,
        origUrl: ii.url,
        mime: ii.mime,
        width: ii.width,
        height: ii.height,
        size: ii.size,
        license,
        licenseUrl: licenseUrlFor(license, stripHtml(md.LicenseUrl?.value)),
        author: author.slice(0, 160),
        credit: stripHtml(md.Credit?.value).slice(0, 200),
        description: "",
        year: extractYear(md.DateTimeOriginal?.value),
        categories: "",
        score: 0,
        rawFile: path.relative(ROOT, file).replace(/\\/g, "/"),
        traceId: trace.id,
        traceName: trace.name,
        bucket: 0,
      });
    }
    console.log(`  ${Math.min(i + 40, titles.length)}/${titles.length}, lolos ${out.length}`);
  }
  // kelompokkan 36 per halaman lembar kontak (kunci grup = "traces-NN")
  out.sort((a, b) => a.traceId.localeCompare(b.traceId));
  out.forEach((c, idx) => {
    c.bucket = Math.floor(idx / BUCKET) + 1;
    c.key = `traces-${String(c.bucket).padStart(2, "0")}`;
  });
  fs.writeFileSync(CAND_FILE, JSON.stringify(out, null, 1));
  console.log(`\nLolos penyaringan otomatis: ${out.length} dari ${withImage.length}. Ditolak:`, rejected);
}

interface MediaOut {
  id: string;
  target: string;
  role: "hero";
  kind: "image";
  src: string;
  width: number;
  height: number;
  blurDataURL?: string;
  alt: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  year?: string;
  accessed: string;
  shareAlike: boolean;
  sizes: number[];
}

async function stageBuild(): Promise<void> {
  const cands = JSON.parse(fs.readFileSync(CAND_FILE, "utf8")) as (Candidate & { traceName: string })[];
  const rejects: Record<string, string> = fs.existsSync(REJECT_FILE) ? (JSON.parse(fs.readFileSync(REJECT_FILE, "utf8")) as { rejected: Record<string, string> }).rejected : {};
  const existing = JSON.parse(fs.readFileSync(MEDIA_FILE, "utf8")) as MediaOut[];
  const keep = existing.filter((m) => !m.target.startsWith("wd-"));
  const made: MediaOut[] = [];
  const perTarget = new Map<string, number>();
  for (const c of cands) {
    if (rejects[c.cid]) continue;
    const n = (perTarget.get(c.target) ?? 0) + 1;
    perTarget.set(c.target, n);
    if (n > 1) continue; // satu foto utama per jejak
    const base = `hero-${n}`;
    const outDir = path.join(PUBLIC_MEDIA, c.target);
    fs.mkdirSync(outDir, { recursive: true });
    const input = path.join(ROOT, c.rawFile!);
    const meta = await sharp(input).metadata();
    const swap = (meta.orientation ?? 1) >= 5;
    const srcW = (swap ? meta.height : meta.width) ?? c.width;
    const srcH = (swap ? meta.width : meta.height) ?? c.height;
    for (const size of SIZES) {
      const w = Math.min(size, srcW);
      const pipe = () => sharp(input).rotate().resize({ width: w });
      await pipe().webp({ quality: 72 }).toFile(path.join(outDir, `${base}-${size}.webp`));
      await pipe().avif({ quality: 48, effort: 3 }).toFile(path.join(outDir, `${base}-${size}.avif`));
    }
    const blur = await sharp(input).rotate().resize(16).webp({ quality: 40 }).toBuffer();
    made.push({
      id: `${c.target}-${base}`,
      target: c.target,
      role: "hero",
      kind: "image",
      src: `/media/${c.target}/${base}`,
      width: Math.min(1280, srcW),
      height: Math.round((srcH / srcW) * Math.min(1280, srcW)),
      blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
      alt: `Foto ${c.traceName}`,
      title: c.title,
      author: c.author,
      license: c.license,
      licenseUrl: c.licenseUrl,
      sourceUrl: c.pageUrl,
      year: c.year,
      accessed: ACCESSED,
      shareAlike: /sa/i.test(c.license.replace(/^cc[\s-]by/i, "")),
      sizes: [...SIZES],
    });
    if (made.length % 25 === 0) process.stdout.write(`${made.length} `);
  }
  fs.writeFileSync(MEDIA_FILE, JSON.stringify([...keep, ...made], null, 2) + "\n");
  console.log(`\n${made.length} foto jejak ditulis. Ditolak kurasi: ${Object.keys(rejects).length}. media.json: ${keep.length + made.length} entri.`);
}

const stage = process.argv[2] ?? "fetch";
(stage === "build" ? stageBuild() : stageFetch()).catch((e) => {
  console.error(e);
  process.exit(1);
});
