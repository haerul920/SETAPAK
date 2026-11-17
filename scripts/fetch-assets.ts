/**
 * SETAPAK - Pipeline aset nyata berlisensi terbuka (Wikimedia Commons).
 *
 * Tahap:
 *   fetch   : cari kandidat per entri data/asset-queries.json, saring lisensi, unduh thumbnail,
 *             tulis scripts/.cache/candidates.json
 *   sheets  : buat lembar kontak (contact sheet) per entri di scripts/.cache/sheets untuk diperiksa
 *             secara visual oleh kurator (agen/tim)
 *   build   : proses kandidat yang DITERIMA di data/asset-curation.json menjadi AVIF/WebP
 *             640/1280/1920 + blur placeholder, tulis data/media.json
 *
 * Pemakaian:
 *   pnpm assets            (fetch + sheets + build)
 *   pnpm assets fetch      (hanya satu tahap)
 *   pnpm assets build
 *
 * Kebijakan Wikimedia: User-Agent deskriptif, jeda antar permintaan, cache lokal.
 */
import fs from "node:fs";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { extractYear, isAllowedLicense, licenseUrlFor, stripHtml } from "./lib/licenses";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, "scripts", ".cache");
const RAW = path.join(CACHE, "raw");
const SHEETS = path.join(CACHE, "sheets");
const QUERIES_FILE = path.join(ROOT, "data", "asset-queries.json");
const CANDIDATES_FILE = path.join(CACHE, "candidates.json");
const CURATION_FILE = path.join(ROOT, "data", "asset-curation.json");
const MEDIA_FILE = path.join(ROOT, "data", "media.json");
const PUBLIC_MEDIA = path.join(ROOT, "public", "media");
const PUBLIC_AUDIO = path.join(ROOT, "public", "audio");

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "SETAPAK/1.0 (platform edukasi cagar budaya, BUDAYA GO! 2026; https://setapak.budayago.id)";
const DELAY_MS = 300;
/** Wikimedia hanya melayani lebar thumbnail standar; 1920 adalah ukuran terbesar yang kami pakai. */
const SIZES = [640, 1280, 1920] as const;
const ACCESSED = new Date().toISOString().slice(0, 10);

type Role = "hero" | "gallery" | "then" | "now" | "hotspot-base" | "texture" | "audio";

interface QueryItem {
  key: string;
  target: string;
  role: Role;
  min: number;
  queries: string[];
  /** turunkan batas lebar minimum bila sumber terbaik memang kecil (misalnya foto arsip atau situs sulit) */
  minWidth?: number;
  /** izinkan foto potret untuk hero (misalnya monumen tinggi) */
  allowPortrait?: boolean;
}

export interface Candidate {
  cid: string; // id stabil: target-key-hash
  key: string;
  target: string;
  role: Role;
  title: string;
  pageUrl: string;
  thumbUrl: string;
  origUrl: string;
  mime: string;
  width: number;
  height: number;
  size: number;
  license: string;
  licenseUrl: string;
  author: string;
  credit: string;
  description: string;
  year?: string;
  categories: string;
  score: number;
  rawFile?: string;
}

interface CurationEntry {
  /** cid kandidat */
  cid: string;
  alt: string;
  altEn?: string;
  /** override role, misal kandidat gallery dipakai sebagai then */
  role?: Role;
  /** override label tahun yang ditampilkan, hanya jika ada di metadata */
  year?: string;
  /** titik fokus untuk object-position, contoh "50% 40%" */
  focus?: string;
  /** pindahkan aset ke target lain (misal aset situs dipakai untuk peristiwa tertentu) */
  target?: string;
}

interface CurationFile {
  _note?: string;
  accepted: CurationEntry[];
  rejected?: Record<string, string>;
}

export interface MediaEntry {
  id: string;
  target: string;
  role: Role;
  kind: "image" | "audio";
  src: string;
  width: number;
  height: number;
  blurDataURL?: string;
  alt: string;
  altEn?: string;
  focus?: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  year?: string;
  accessed: string;
  shareAlike: boolean;
  /** versi berlatar transparan dari scripts/cutout.py, bila lolos pemeriksaan visual */
  cutout?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(0, 6);
}

async function getJson(url: string, attempt = 0): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA } });
  if (res.status === 429 || res.status >= 500) {
    if (attempt > 4) throw new Error(`HTTP ${res.status} ${url}`);
    await sleep(2000 * (attempt + 1));
    return getJson(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

/** Batas waktu per unduhan: foto arsip TIFF besar kadang lama dirender Wikimedia dan menahan seluruh antrean. */
const DOWNLOAD_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 3;

async function download(url: string, dest: string, attempt = 0): Promise<boolean> {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) return true;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= MAX_ATTEMPTS) return false;
      const retry = Math.min(30, Number(res.headers.get("retry-after")) || 5 * (attempt + 1));
      console.warn(`  ~ ${res.status}, tunggu ${retry} dtk`);
      await sleep(retry * 1000);
      return download(url, dest, attempt + 1);
    }
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    return true;
  } catch (err) {
    // batas waktu atau jaringan putus: lewati kandidat ini
    console.warn(`  ~ gagal unduh (${(err as Error).name}), dilewati`);
    return false;
  }
}

/* ---------------------------------------------------------------- */
/* FETCH                                                             */
/* ---------------------------------------------------------------- */

const BAD_TITLE = /logo|icon|\bmap\b|peta|kaart|diagram|plan\b|denah|stamp|perangko|coin|banknote|\buang\b|poster|selfie|wedding|pengantin|cosplay|\.svg|\.gif|screenshot|signature|flag|bendera/i;
const PEOPLE_TITLE = /portrait|potret|tourist|wisatawan|visitor|pengunjung|students|siswa|people|orang|family|keluarga|girl|boy|woman|man\b|men\b|women|couple|model\b|pose/i;
const QUALITY_CATS = /Quality images|Featured pictures|Valued images|Pictures of the day/i;
const ARCHIVE_HINT = /tropenmuseum|kitlv|cephas|woodbury|leiden|collectie|rijksmuseum|nationaal archief|before restoration|van kinsbergen/i;

function scoreCandidate(item: QueryItem, query: string, c: Omit<Candidate, "score" | "cid">): number | null {
  const t = c.title.toLowerCase();
  const isMapKey = item.key.includes("map");
  const minW = item.minWidth ?? (item.role === "hero" ? 1600 : item.role === "audio" ? 0 : item.role === "then" ? 700 : 1000);

  if (item.role === "audio") {
    if (!/audio|ogg|mpeg|wav|flac|webm/.test(c.mime)) return null;
    if (c.size > 12_000_000) return null;
    return 10 - c.size / 2_000_000;
  }

  if (!/jpeg|png|tiff/.test(c.mime)) return null;
  if (Math.max(c.width, c.height) < minW) return null;
  if (!isMapKey && BAD_TITLE.test(t)) return null;
  if (isMapKey && /logo|icon|stamp|coin/.test(t)) return null;
  if (item.role !== "then" && item.role !== "texture" && c.height > c.width * 1.15 && item.role === "hero" && !item.allowPortrait) return null;

  let s = Math.log2(Math.min(c.width, 6000));
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  for (const w of words) if (t.includes(w)) s += 1.2;
  if (QUALITY_CATS.test(c.categories)) s += 4;
  if (PEOPLE_TITLE.test(t)) s -= 4;
  const y = c.year ? parseInt(c.year, 10) : NaN;
  const archival = ARCHIVE_HINT.test(t + " " + c.categories + " " + c.credit) || (!isNaN(y) && y < 1950);

  if (item.role === "then") {
    if (!archival) return null;
    s += 4;
  } else if (item.role === "hero" || item.role === "now") {
    if (archival) s -= 6;
    if (c.width < c.height) s -= 3;
    if (!isNaN(y) && y >= 2005) s += 1;
  } else if (archival && !isMapKey) {
    s -= 1;
  }
  // berkas yang disematkan manual (kueri "File:...") selalu masuk daftar kandidat
  if (query.startsWith("File:")) s += 40;
  return s;
}

async function searchQuery(item: QueryItem, query: string): Promise<Candidate[]> {
  const isAudio = item.role === "audio";
  // kueri berawalan "File:" = judul berkas yang disematkan (dipakai bila pencarian tidak menemukan foto terbaik)
  const pinned = query.startsWith("File:");
  const params = new URLSearchParams({
    action: "query",
    ...(pinned
      ? { titles: query }
      : {
          generator: "search",
          gsrsearch: `${query} ${isAudio ? "filetype:audio" : "filetype:bitmap"}`,
          gsrnamespace: "6",
          gsrlimit: "30",
        }),
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    // foto arsip (TIFF besar) cukup 1280 px: jauh lebih cepat dirender dan tetap tajam di bingkai kecil
    iiurlwidth: item.role === "then" ? "1280" : "1920",
    iiextmetadatafilter:
      "LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription|DateTimeOriginal|Categories|Restrictions",
    format: "json",
    origin: "*",
  });
  const data = (await getJson(`${API}?${params.toString()}`)) as {
    query?: { pages?: Record<string, { title: string; imageinfo?: Array<Record<string, unknown>> }> };
  };
  await sleep(DELAY_MS);
  const pages = Object.values(data.query?.pages ?? {});
  const out: Candidate[] = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0] as
      | {
          url: string;
          thumburl?: string;
          descriptionurl: string;
          mime: string;
          width: number;
          height: number;
          size: number;
          extmetadata?: Record<string, { value: string }>;
        }
      | undefined;
    if (!ii) continue;
    const md = ii.extmetadata ?? {};
    const license = stripHtml(md.LicenseShortName?.value);
    if (!isAllowedLicense(license)) continue;
    const restrictions = stripHtml(md.Restrictions?.value).toLowerCase();
    if (/trademark|insignia/.test(restrictions)) continue;
    const author = stripHtml(md.Artist?.value) || stripHtml(md.Credit?.value);
    if (!author) continue;
    const base = {
      key: item.key,
      target: item.target,
      role: item.role,
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
      description: stripHtml(md.ImageDescription?.value).slice(0, 400),
      year: extractYear(md.DateTimeOriginal?.value),
      categories: stripHtml(md.Categories?.value),
    };
    const score = scoreCandidate(item, query, base);
    if (score === null) continue;
    out.push({ ...base, score, cid: `${item.target}-${item.key}-${hash(p.title)}` });
  }
  return out;
}

async function stageFetch(): Promise<void> {
  fs.mkdirSync(RAW, { recursive: true });
  const { items } = JSON.parse(fs.readFileSync(QUERIES_FILE, "utf8")) as { items: QueryItem[] };
  const usedTitles = new Set<string>();
  const all: Candidate[] = [];
  const onlyArg = process.argv.find((a) => a.startsWith("--target="))?.split("=")[1];
  const only = onlyArg ? new Set(onlyArg.split(",")) : null;

  const previous: Candidate[] = fs.existsSync(CANDIDATES_FILE)
    ? (JSON.parse(fs.readFileSync(CANDIDATES_FILE, "utf8")) as Candidate[])
    : [];

  const seen = new Set<string>();
  for (const item of items) {
    if (only && !only.has(item.target)) {
      seen.add(`${item.target}/${item.key}`);
      const keep = previous.filter((c) => c.target === item.target && c.key === item.key);
      keep.forEach((c) => usedTitles.add(c.title));
      all.push(...keep);
      continue;
    }
    const pool = new Map<string, Candidate>();
    for (const q of item.queries) {
      try {
        const found = await searchQuery(item, q);
        for (const c of found) {
          const prev = pool.get(c.title);
          if (!prev || prev.score < c.score) pool.set(c.title, c);
        }
      } catch (err) {
        console.warn(`  ! query gagal "${q}": ${(err as Error).message}`);
      }
    }
    const want = Math.max(item.min * 2, item.min + 2) + (item.role === "audio" ? 0 : 2);
    const ranked = [...pool.values()]
      .filter((c) => !usedTitles.has(c.title))
      .sort((a, b) => b.score - a.score)
      .slice(0, want);
    ranked.forEach((c) => usedTitles.add(c.title));

    for (const c of ranked) {
      const ext = item.role === "audio" ? path.extname(new URL(c.origUrl).pathname).toLowerCase() || ".ogg" : ".jpg";
      const file = path.join(RAW, `${c.cid}${ext}`);
      const url = item.role === "audio" ? c.origUrl : c.thumbUrl;
      const ok = await download(url, file);
      await sleep(DELAY_MS * 3);
      if (ok) {
        c.rawFile = path.relative(ROOT, file).replace(/\\/g, "/");
        all.push(c);
      }
    }
    console.log(`${item.target}/${item.key} (${item.role}): ${ranked.length} kandidat, min ${item.min}`);
    // simpan bertahap supaya hasil tidak hilang bila proses dihentikan
    seen.add(`${item.target}/${item.key}`);
    fs.writeFileSync(CANDIDATES_FILE, JSON.stringify([...all, ...previous.filter((c) => !seen.has(`${c.target}/${c.key}`))], null, 2));
  }
  fs.writeFileSync(CANDIDATES_FILE, JSON.stringify(all, null, 2));
  console.log(`\nTotal kandidat: ${all.length}. Tersimpan di ${path.relative(ROOT, CANDIDATES_FILE)}`);
}

/* ---------------------------------------------------------------- */
/* CONTACT SHEETS                                                    */
/* ---------------------------------------------------------------- */

function esc(s: string): string {
  return s.replace(/[<>&"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[ch] as string);
}

async function stageSheets(): Promise<void> {
  fs.mkdirSync(SHEETS, { recursive: true });
  const cands = (JSON.parse(fs.readFileSync(CANDIDATES_FILE, "utf8")) as Candidate[]).filter(
    (c) => c.role !== "audio" && c.rawFile
  );
  const groups = new Map<string, Candidate[]>();
  for (const c of cands) {
    const g = `${c.target}__${c.key}`;
    groups.set(g, [...(groups.get(g) ?? []), c]);
  }
  const TW = 360;
  const TH = 240;
  const COLS = 4;
  for (const [g, list] of groups) {
    const rows = Math.ceil(list.length / COLS);
    const W = COLS * TW;
    const H = rows * (TH + 28);
    const composites: OverlayOptions[] = [];
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      const x = (i % COLS) * TW;
      const y = Math.floor(i / COLS) * (TH + 28);
      try {
        const tile = await sharp(path.join(ROOT, c.rawFile!))
          .resize(TW - 6, TH - 6, { fit: "contain", background: "#222" })
          .jpeg({ quality: 70 })
          .toBuffer();
        composites.push({ input: tile, left: x + 3, top: y + 3 });
      } catch {
        /* abaikan file rusak */
      }
      const label = `${i + 1}. ${c.cid.split("-").pop()} ${c.year ?? ""} ${c.width}px`;
      const svg = Buffer.from(
        `<svg width="${TW}" height="28" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#000"/><text x="6" y="19" font-family="monospace" font-size="15" fill="#ffd27a">${esc(label)}</text></svg>`
      );
      composites.push({ input: svg, left: x, top: y + TH });
    }
    await sharp({ create: { width: W, height: H, channels: 3, background: "#111" } })
      .composite(composites)
      .jpeg({ quality: 72 })
      .toFile(path.join(SHEETS, `${g}.jpg`));
    const legend = list.map((c, i) => `${i + 1}. ${c.cid} | ${c.title} | ${c.license} | ${c.author.slice(0, 60)}`).join("\n");
    fs.writeFileSync(path.join(SHEETS, `${g}.txt`), legend + "\n");
  }
  console.log(`Lembar kontak dibuat di ${path.relative(ROOT, SHEETS)} (${groups.size} lembar).`);
}

/* ---------------------------------------------------------------- */
/* BUILD                                                             */
/* ---------------------------------------------------------------- */

async function stageBuild(): Promise<void> {
  if (!fs.existsSync(CURATION_FILE)) {
    console.error(`Belum ada ${path.relative(ROOT, CURATION_FILE)}. Jalankan tahap fetch dan kurasi dulu.`);
    process.exit(1);
  }
  const cands = JSON.parse(fs.readFileSync(CANDIDATES_FILE, "utf8")) as Candidate[];
  const byCid = new Map(cands.map((c) => [c.cid, c]));
  const curation = JSON.parse(fs.readFileSync(CURATION_FILE, "utf8")) as CurationFile;
  const existing: MediaEntry[] = fs.existsSync(MEDIA_FILE)
    ? (JSON.parse(fs.readFileSync(MEDIA_FILE, "utf8")) as MediaEntry[])
    : [];
  // dipertahankan: foto izin tertulis dan foto jejak tingkat 3 (dibangun scripts/fetch-trace-images.ts)
  const manual = existing.filter((m) => m.license === "Izin tertulis" || m.target.startsWith("wd-"));

  const counters = new Map<string, number>();
  const media: MediaEntry[] = [];

  for (const entry of curation.accepted) {
    const c = byCid.get(entry.cid);
    if (!c || !c.rawFile) {
      console.warn(`  ! kandidat tidak ditemukan: ${entry.cid}`);
      continue;
    }
    if (!isAllowedLicense(c.license)) {
      console.warn(`  ! lisensi ditolak: ${entry.cid} (${c.license})`);
      continue;
    }
    const role = entry.role ?? c.role;
    const target = entry.target ?? c.target;
    const counterKey = c.role === "audio" ? c.key : `${target}/${role}`;
    const n = (counters.get(counterKey) ?? 0) + 1;
    counters.set(counterKey, n);
    const id = c.role === "audio" ? `${c.key}-${n}` : `${target}-${role}-${n}`;
    const shareAlike = /sa/i.test(c.license.replace(/^cc[\s-]by/i, ""));

    if (c.role === "audio") {
      fs.mkdirSync(PUBLIC_AUDIO, { recursive: true });
      const ext = path.extname(new URL(c.origUrl).pathname).toLowerCase();
      const dest = path.join(PUBLIC_AUDIO, `${id}${ext}`);
      fs.copyFileSync(path.join(ROOT, c.rawFile), dest);
      media.push({
        id,
        target,
        role,
        kind: "audio",
        src: `/audio/${id}${ext}`,
        width: 0,
        height: 0,
        alt: entry.alt,
        altEn: entry.altEn,
        title: c.title,
        author: c.author,
        license: c.license,
        licenseUrl: c.licenseUrl,
        sourceUrl: c.pageUrl,
        year: entry.year ?? c.year,
        accessed: ACCESSED,
        shareAlike,
      });
      continue;
    }

    const outDir = path.join(PUBLIC_MEDIA, target);
    fs.mkdirSync(outDir, { recursive: true });
    const baseName = `${role}-${n}`;
    const meta = await sharp(path.join(ROOT, c.rawFile)).metadata();
    const swap = (meta.orientation ?? 1) >= 5; // EXIF memutar 90 derajat
    const srcW = (swap ? meta.height : meta.width) ?? c.width;
    const srcH = (swap ? meta.width : meta.height) ?? c.height;
    let outW = 0;
    let outH = 0;
    const ENC = path.join(CACHE, "encoded");
    fs.mkdirSync(ENC, { recursive: true });
    for (const size of SIZES) {
      const w = Math.min(size, srcW);
      for (const ext of ["webp", "avif"] as const) {
        // cache encode berdasarkan cid supaya perubahan urutan kurasi tidak menukar file
        const cached = path.join(ENC, `${c.cid}-${size}.${ext}`);
        if (!fs.existsSync(cached)) {
          const pipe = sharp(path.join(ROOT, c.rawFile)).rotate().resize({ width: w });
          await (ext === "webp" ? pipe.webp({ quality: 74 }) : pipe.avif({ quality: 50, effort: 3 })).toFile(cached);
        }
        fs.copyFileSync(cached, path.join(outDir, `${baseName}-${size}.${ext}`));
      }
      if (size === 1920) {
        outW = w;
        outH = Math.round((srcH / srcW) * w);
      }
    }
    const blur = await sharp(path.join(ROOT, c.rawFile)).rotate().resize(16).webp({ quality: 40 }).toBuffer();
    media.push({
      id,
      target,
      role,
      kind: "image",
      src: `/media/${target}/${baseName}`,
      width: outW,
      height: outH,
      blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
      alt: entry.alt,
      altEn: entry.altEn,
      focus: entry.focus,
      title: c.title,
      author: c.author,
      license: c.license,
      licenseUrl: c.licenseUrl,
      sourceUrl: c.pageUrl,
      year: entry.year ?? c.year,
      accessed: ACCESSED,
      shareAlike,
      cutout: fs.existsSync(path.join(outDir, `${baseName}-cutout.webp`)) ? `/media/${target}/${baseName}-cutout.webp` : undefined,
    });
    process.stdout.write(".");
  }
  const final = [...media, ...manual];
  fs.writeFileSync(MEDIA_FILE, JSON.stringify(final, null, 2) + "\n");
  console.log(`\n${final.length} aset ditulis ke ${path.relative(ROOT, MEDIA_FILE)}`);
}

async function main(): Promise<void> {
  const stage = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "all";
  if (stage === "fetch" || stage === "all") await stageFetch();
  if (stage === "sheets" || stage === "all") await stageSheets();
  if (stage === "build" || (stage === "all" && fs.existsSync(CURATION_FILE))) await stageBuild();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
