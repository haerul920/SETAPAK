/**
 * SETAPAK - Impor jejak tingkat 3 dari Wikidata (docs/DATA_EXPANSION.md bagian B).
 * Wikidata berlisensi CC0. Ringkasan hanya dari REST summary Wikipedia bahasa Indonesia (CC BY-SA)
 * dipotong ke kalimat pertama, atau templat netral. Tidak ada kalimat yang dikarang.
 *
 * Himpunan A: item di Indonesia (P17 = Q252) dengan status warisan apa pun (P1435), terutama
 *             "cagar budaya Indonesia" = Q4246737 (hasil kueri eksplorasi: 495 item), serta status UNESCO.
 * Himpunan B: item di Indonesia dengan koordinat (P625) dan tahun berdiri (P571) yang instance of
 *             (termasuk subclass) kelas bangunan bersejarah di KELAS_B di bawah.
 * Syarat: koordinat dan tahun (P571, atau tanggal penetapan = qualifier P580 pada P1435).
 *
 * Hasil: data/wikidata-heritage.json, docs/WIKIDATA_IMPORT.md, dan bagian otomatis di docs/ASSET_GAPS.md.
 * Pemakaian: pnpm wikidata [--refresh]
 */
import fs from "node:fs";
import path from "node:path";
import { sites } from "../data/index";
import { similarNames as similar } from "./lib/names";
import { haversineKm } from "./match-coords";
import { writeTracesLite } from "./lib/traces-lite";
import { cacheRead, cacheWrite, politeFetch, sleep } from "./lib/net";

const ROOT = process.cwd();
const REFRESH = process.argv.includes("--refresh");
const SPARQL = "https://query.wikidata.org/sparql";

/** Kelas Q-id hasil kueri eksplorasi (label diverifikasi lewat SPARQL). */
const KELAS_B: { id: string; en: string }[] = [
  { id: "Q32815", en: "mosque" },
  { id: "Q5393308", en: "Buddhist temple" },
  { id: "Q842402", en: "Hindu temple" },
  { id: "Q839954", en: "archaeological site" },
  { id: "Q1785071", en: "fort" },
  { id: "Q57821", en: "fortification" },
  { id: "Q16560", en: "palace" },
  { id: "Q1640824", en: "inscription" },
  { id: "Q4989906", en: "monument" },
  { id: "Q33506", en: "museum" },
  { id: "Q1081138", en: "historic site" },
  { id: "Q164240", en: "megalith" },
  { id: "Q381885", en: "tomb" },
  { id: "Q16970", en: "church building" },
];

/** Status yang bukan penetapan situs (dokumen, lahan basah) dan karena itu diabaikan. */
const IGNORED_STATUS = new Set(["Q19683138", "Q16024238", "Q37788009", "Q42948", "Q7809", "Q12490749"]);

export type TraceCategory = "prasejarah" | "seni-cadas" | "prasasti" | "candi" | "islam" | "keraton" | "benteng" | "kolonial" | "kemerdekaan" | "lanskap" | "lainnya";

export interface Trace {
  id: string;
  name: string;
  nameEn: string | null;
  year: number;
  yearPrecision: "year" | "decade" | "century";
  yearLabel: string;
  kind: "dibangun" | "ditetapkan";
  coords: { lat: number; lng: number };
  province: string;
  category: TraceCategory;
  image: string | null;
  wikidata: string;
  wikipedia: string | null;
  summary: string;
  summarySource: "wikipedia-id" | "templat";
  /** punya status warisan di Wikidata (P1435) */
  heritage: boolean;
  status: "perlu-cek";
}

type Binding = Record<string, { value: string }>;

async function sparql(query: string, label: string): Promise<Binding[]> {
  const url = `${SPARQL}?format=json&query=${encodeURIComponent(query)}`;
  if (!REFRESH) {
    const cached = cacheRead<Binding[]>("wd-sparql", url);
    if (cached) return cached;
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await politeFetch(url, { gapMs: 2500, accept: "application/sparql-results+json", timeoutMs: 90_000, retries: 1 });
    if (r.ok) {
      const rows = (JSON.parse(r.body) as { results: { bindings: Binding[] } }).results.bindings;
      cacheWrite("wd-sparql", url, rows);
      console.log(`  ${label}: ${rows.length} baris`);
      return rows;
    }
    console.log(`  ${label}: gagal (${r.status || r.error}), ulangi...`);
    await sleep(5000 * (attempt + 1));
  }
  return [];
}

const COMMON = `
  OPTIONAL { ?item wdt:P18 ?img }
  OPTIONAL { ?item rdfs:label ?lid FILTER(LANG(?lid) = "id") }
  OPTIONAL { ?item rdfs:label ?len FILTER(LANG(?len) = "en") }
  OPTIONAL { ?idwiki schema:about ?item; schema:isPartOf <https://id.wikipedia.org/> }
  OPTIONAL { ?item wdt:P131/wdt:P131?/wdt:P131?/wdt:P131?/wdt:P131? ?prov. ?prov wdt:P31 wd:Q5098. ?prov rdfs:label ?provLabel FILTER(LANG(?provLabel) = "id") }
  OPTIONAL { ?item wdt:P31 ?cls }
`;

const SELECT = `SELECT ?item ?lid ?len ?coord ?inc ?incPrec ?stDate ?img ?idwiki ?provLabel ?cls`;

const queryA = `${SELECT} WHERE {
  ?item wdt:P17 wd:Q252; wdt:P625 ?coord; p:P1435 ?st. ?st ps:P1435 ?status.
  FILTER(?status NOT IN (${[...IGNORED_STATUS].map((s) => `wd:${s}`).join(", ")}))
  OPTIONAL { ?st pq:P580 ?stDate }
  OPTIONAL { ?item p:P571 ?i. ?i psv:P571 ?iv. ?iv wikibase:timeValue ?inc; wikibase:timePrecision ?incPrec }
  ${COMMON}
}`;

const queryB = (cls: string) => `${SELECT} WHERE {
  ?item wdt:P17 wd:Q252; wdt:P625 ?coord; wdt:P31/wdt:P279* wd:${cls}.
  ?item p:P571 ?i. ?i psv:P571 ?iv. ?iv wikibase:timeValue ?inc; wikibase:timePrecision ?incPrec.
  ${COMMON}
}`;

/* ------------------------------------------------------------------ */
/* Pengolahan baris                                                    */
/* ------------------------------------------------------------------ */

interface Raw {
  qid: string;
  nameId?: string;
  nameEn?: string;
  lat: number;
  lng: number;
  incYear?: number;
  incPrec?: number;
  stYear?: number;
  image?: string;
  idwiki?: string;
  province?: string;
  /** punya status warisan (P1435), bukan hanya instance of kelas bangunan */
  heritage: boolean;
  classes: Set<string>;
}

const yearOf = (iso?: string): number | undefined => {
  const m = iso?.match(/^([+-]?\d{1,6})-/);
  return m ? Number(m[1]) : undefined;
};

function collect(rows: Binding[], into: Map<string, Raw>, heritage = false): void {
  for (const r of rows) {
    const qid = r.item.value.split("/").pop()!;
    const point = r.coord?.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
    if (!point) continue;
    let raw = into.get(qid);
    if (!raw) {
      raw = { qid, lat: Number(point[2]), lng: Number(point[1]), heritage, classes: new Set() };
      into.set(qid, raw);
    }
    if (heritage) raw.heritage = true;
    raw.nameId ??= r.lid?.value;
    raw.nameEn ??= r.len?.value;
    if (r.inc && raw.incYear === undefined) {
      raw.incYear = yearOf(r.inc.value);
      raw.incPrec = r.incPrec ? Number(r.incPrec.value) : undefined;
    }
    const sy = yearOf(r.stDate?.value);
    if (sy !== undefined && (raw.stYear === undefined || sy < raw.stYear)) raw.stYear = sy;
    raw.image ??= r.img?.value;
    raw.idwiki ??= r.idwiki?.value;
    raw.province ??= r.provLabel?.value;
    if (r.cls) raw.classes.add(r.cls.value.split("/").pop()!);
  }
}

const centuryOf = (y: number) => Math.ceil(y / 100);

/** Tahun di bawah ini pada presisi tahun/dasawarsa dianggap salah data (contoh: "Prasasti Pagaruyung I" bertahun 14). */
const MIN_VALID_YEAR = 300;

/** Batas keseimbangan jejak tingkat 3 (docs/DATA_EXPANSION.md: target 300 sampai 600). */
const MAX_TOTAL = 600;
const MAX_PER_PROVINCE = 40;
const MAX_PER_PROVINCE_CATEGORY = 14;

function placement(raw: Raw): { year: number; precision: Trace["yearPrecision"]; label: string; kind: Trace["kind"] } | null {
  if (raw.incYear !== undefined && raw.incPrec !== undefined) {
    const y = raw.incYear;
    if (raw.incPrec >= 9 && y >= MIN_VALID_YEAR && y <= 2026) return { year: y, precision: "year", label: String(y), kind: "dibangun" };
    if (raw.incPrec === 8 && y >= MIN_VALID_YEAR && y <= 2026) return { year: y + 5, precision: "decade", label: `${y}-an`, kind: "dibangun" };
    if (raw.incPrec === 7 && y >= 1 && y <= 2100) {
      const c = centuryOf(y);
      return { year: (c - 1) * 100 + 50, precision: "century", label: `abad ke-${c}`, kind: "dibangun" };
    }
  }
  if (raw.stYear !== undefined && raw.stYear >= MIN_VALID_YEAR && raw.stYear <= 2026) return { year: raw.stYear, precision: "year", label: String(raw.stYear), kind: "ditetapkan" };
  return null;
}

const CLASS_CATEGORY: Record<string, TraceCategory> = {
  Q32815: "islam",
  Q5393308: "candi",
  Q842402: "candi",
  Q839954: "candi",
  Q1785071: "benteng",
  Q57821: "benteng",
  Q16560: "keraton",
  Q1640824: "prasasti",
  Q178743: "prasasti",
  Q164240: "prasejarah",
  Q393259: "lanskap",
  Q736917: "lanskap",
  Q16970: "kolonial",
  Q55488: "kolonial",
};

export function categorize(name: string, classes: Set<string>, year: number): TraceCategory {
  const n = name.toLowerCase();
  if (/\bprasasti\b/.test(n)) return "prasasti";
  if (/\b(candi|situs|punden|arca|percandian)\b/.test(n)) return "candi";
  if (/\b(masjid|mesjid|makam|kramat|dargah)\b/.test(n)) return "islam";
  if (/\b(benteng|fort|kubu)\b/.test(n)) return "benteng";
  if (/\b(istana|keraton|kraton|kedaton|puri)\b/.test(n)) return "keraton";
  if (/\b(gua|goa|liang|leang|fosil|manusia purba)\b/.test(n)) return "prasejarah";
  if (/\b(tugu|proklamasi|perjuangan|pahlawan|kemerdekaan)\b/.test(n)) return "kemerdekaan";
  if (/\b(taman nasional|geopark|danau|subak|sawah|lanskap)\b/.test(n)) return "lanskap";
  for (const c of classes) if (CLASS_CATEGORY[c]) return CLASS_CATEGORY[c];
  if (year < 1950 && /\b(stasiun|gedung|kantor|hotel|bank|toko|gereja|katedral|menara|jembatan|pabrik|societet|rumah)\b/.test(n)) return "kolonial";
  return "lainnya";
}

/* ------------------------------------------------------------------ */
/* Dedup terhadap situs kurasi                                         */
/* ------------------------------------------------------------------ */

/**
 * Bukan situs cagar budaya: kawasan alam (taman nasional, pulau, danau, karst, geosite) dan kota.
 * Wikidata memuat status warisan geologi dan taman nasional yang bukan bagian dari cagar budaya.
 */
const NON_SITE_NAME = /^(taman nasional|pulau|kepulauan|danau|warisan hutan|karst|open pit|semarang$)/i;
const NON_SITE_CLASS = new Set(["Q393259", "Q736917"]);
export function isNonSite(name: string, classes: Set<string>): boolean {
  if (NON_SITE_NAME.test(name.trim())) return true;
  for (const c of classes) if (NON_SITE_CLASS.has(c)) return true;
  return false;
}

function duplicatesCurated(name: string, nameEn: string | undefined, lat: number, lng: number): boolean {
  for (const s of sites) {
    const d = haversineKm(s.coords, { lat, lng });
    if (d < 0.5) return true;
    if (d < 25 && (similar(name, s.name) || (nameEn && s.nameEn && similar(nameEn, s.nameEn)))) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Ringkasan idwiki                                                    */
/* ------------------------------------------------------------------ */

/** Singkatan yang diakhiri titik tetapi bukan akhir kalimat (gelar, pangkat, alamat, inisial). */
const ABBREVIATION = /(?:\b(?:Dr|dr|Prof|Ir|H|Hj|No|dll|dsb|St|Jl|Kab|Kec|Hz|Tk|Kol|Brigjen|Letjen|Mayjen|Jend|Gen|Kapt|Lt|Mr|Mrs|Sdr|Ds|Pdt|Hs|Tn|Ny|Bpk|Sd|Drs|Dra|Rd|Raden|Ki|Kh|KH|Nyi|Mgr|Fr|Ps|Pst|Ngr|Lr)|\b[A-Z])\.$/;
const SENTENCE = /^(.+?[.!?])(?:\s+(?=[A-Z"])|$)/;

export function firstSentence(text: string): string {
  let rest = text.replace(/\s+/g, " ").trim();
  let out = "";
  // Sambung bagian yang terpotong di singkatan sampai kalimat utuh (paling banyak 4 sambungan).
  for (let i = 0; i < 5 && rest; i++) {
    const m = rest.match(SENTENCE);
    const part = (m ? m[1] : rest).trim();
    out = out ? `${out} ${part}` : part;
    rest = rest.slice(part.length).trim();
    if (!m || !ABBREVIATION.test(part)) break;
  }
  return out.length > 320 ? `${out.slice(0, 317).trim()}...` : out;
}

async function idwikiSummary(url: string): Promise<string | null> {
  const title = url.split("/wiki/")[1];
  if (!title) return null;
  const api = `https://id.wikipedia.org/api/rest_v1/page/summary/${title}`;
  const cached = REFRESH ? null : cacheRead<{ extract: string | null }>("wd-summary", api);
  if (cached) return cached.extract;
  const r = await politeFetch(api, { gapMs: 150, accept: "application/json", retries: 2 });
  let extract: string | null = null;
  if (r.ok) {
    try {
      const j = JSON.parse(r.body) as { extract?: string; type?: string };
      if (j.extract && j.type !== "disambiguation") extract = firstSentence(j.extract);
    } catch {
      /* abaikan */
    }
  }
  cacheWrite("wd-summary", api, { extract });
  return extract;
}

function template(name: string, province: string, p: { label: string; precision: Trace["yearPrecision"]; kind: Trace["kind"] }): string {
  const where = province ? ` di ${province}` : "";
  if (p.kind === "ditetapkan") return `${name}${where} tercatat ditetapkan pada ${p.label}.`;
  if (p.precision === "century") return `${name}${where} tercatat berasal dari ${p.label}.`;
  if (p.precision === "decade") return `${name}${where} tercatat berdiri pada dasawarsa ${p.label}.`;
  return `${name}${where} tercatat berdiri sekitar ${p.label}.`;
}

/* ------------------------------------------------------------------ */
/* Utama                                                               */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  const raws = new Map<string, Raw>();
  console.log("Himpunan A (status warisan)...");
  collect(await sparql(queryA, "status warisan"), raws, true);
  console.log("Himpunan B (kelas bangunan bertahun)...");
  for (const k of KELAS_B) collect(await sparql(queryB(k.id), k.en), raws);
  console.log(`Item mentah unik: ${raws.size}`);

  const stats = { tanpaNama: 0, tanpaTahun: 0, duplikat: 0, bukanSitus: 0 };
  const kept: { raw: Raw; name: string; place: NonNullable<ReturnType<typeof placement>> }[] = [];
  for (const raw of raws.values()) {
    const name = raw.nameId ?? raw.nameEn;
    if (!name || /^Q\d+$/.test(name)) {
      stats.tanpaNama++;
      continue;
    }
    if (isNonSite(name, raw.classes)) {
      stats.bukanSitus++;
      continue;
    }
    const place = placement(raw);
    if (!place) {
      stats.tanpaTahun++;
      continue;
    }
    if (duplicatesCurated(name, raw.nameEn, raw.lat, raw.lng)) {
      stats.duplikat++;
      continue;
    }
    kept.push({ raw, name, place });
  }
  console.log(`Disaring: tanpa nama ${stats.tanpaNama}, tanpa tahun valid ${stats.tanpaTahun}, duplikat kurasi ${stats.duplikat}. Lolos: ${kept.length}`);

  // Gerbang kualitas dan keseimbangan. Wikidata memuat impor massal (misalnya ratusan masjid satu provinsi
  // tanpa artikel Wikipedia) yang akan menenggelamkan guliran. Jejak dipilih menurut skor, dengan batas
  // per provinsi dan per kategori dalam provinsi.
  const scored = kept
    .map((k) => {
      const category = categorize(k.name, k.raw.classes, k.place.year);
      const hasWiki = Boolean(k.raw.idwiki);
      const hasImage = Boolean(k.raw.image);
      const known = category !== "lainnya";
      const score = (hasWiki ? 4 : 0) + (k.raw.heritage ? 3 : 0) + (hasImage ? 2 : 0) + (known ? 1 : 0) + (k.raw.province ? 1 : 0);
      const passes = hasWiki || k.raw.heritage || (hasImage && known);
      return { ...k, category, score, passes, province: canonicalProvince(k.raw.province) };
    })
    .sort((a, b) => b.score - a.score || a.place.year - b.place.year || a.name.localeCompare(b.name));
  const perProvince = new Map<string, number>();
  const perProvCat = new Map<string, number>();
  const chosen: typeof scored = [];
  let belowQuality = 0;
  let overCap = 0;
  for (const c of scored) {
    if (!c.passes) {
      belowQuality++;
      continue;
    }
    const pk = c.province || "(provinsi tidak diketahui)";
    const ck = `${pk}|${c.category}`;
    if ((perProvince.get(pk) ?? 0) >= MAX_PER_PROVINCE || (perProvCat.get(ck) ?? 0) >= MAX_PER_PROVINCE_CATEGORY || chosen.length >= MAX_TOTAL) {
      overCap++;
      continue;
    }
    perProvince.set(pk, (perProvince.get(pk) ?? 0) + 1);
    perProvCat.set(ck, (perProvCat.get(ck) ?? 0) + 1);
    chosen.push(c);
  }
  console.log(`Gerbang kualitas: ${belowQuality} di bawah standar, ${overCap} melebihi batas provinsi/kategori. Terpilih: ${chosen.length}`);
  (stats as Record<string, number>).belowQuality = belowQuality;
  (stats as Record<string, number>).overCap = overCap;

  console.log("Mengambil ringkasan idwiki...");
  const traces: Trace[] = [];
  let withSummary = 0;
  let i = 0;
  for (const { raw, name, place, category, province: canonical } of chosen) {
    i++;
    const wikipedia = raw.idwiki ?? null;
    const extract = wikipedia ? await idwikiSummary(wikipedia) : null;
    if (extract) withSummary++;
    const province = canonical || raw.province || "";
    traces.push({
      id: `wd-${raw.qid}`,
      name,
      nameEn: raw.nameEn && raw.nameEn !== name ? raw.nameEn : null,
      year: place.year,
      yearPrecision: place.precision,
      yearLabel: place.label,
      kind: place.kind,
      coords: { lat: +raw.lat.toFixed(5), lng: +raw.lng.toFixed(5) },
      province,
      category,
      heritage: raw.heritage,
      image: raw.image ? decodeURIComponent(raw.image.split("/Special:FilePath/")[1] ?? raw.image) : null,
      wikidata: `https://www.wikidata.org/wiki/${raw.qid}`,
      wikipedia,
      summary: extract ?? template(name, province, place),
      summarySource: extract ? "wikipedia-id" : "templat",
      status: "perlu-cek",
    });
    if (i % 50 === 0) console.log(`  ${i}/${chosen.length}`);
  }
  traces.sort((a, b) => a.year - b.year || a.name.localeCompare(b.name));

  fs.writeFileSync(path.join(ROOT, "data", "wikidata-heritage.json"), JSON.stringify(traces, null, 1) + "\n");
  writeTracesLite(ROOT);
  writeReports(traces, stats, withSummary);
}

const PROVINCES = [
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau", "Jambi", "Sumatera Selatan", "Bangka Belitung", "Bengkulu", "Lampung",
  "Banten", "DKI Jakarta", "Jawa Barat", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur", "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur",
  "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara",
  "Sulawesi Utara", "Gorontalo", "Sulawesi Tengah", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tenggara",
  "Maluku", "Maluku Utara", "Papua", "Papua Barat", "Papua Barat Daya", "Papua Selatan", "Papua Tengah", "Papua Pegunungan",
];

const normProv = (s: string) => {
  const n = s
    .toLowerCase()
    .replace(/^provinsi\s+/, "")
    .replace(/daerah khusus ibukota jakarta|daerah khusus ibu kota jakarta/, "dki jakarta")
    .replace(/daerah istimewa yogyakarta|special region of yogyakarta/, "di yogyakarta")
    .replace(/sumatra/, "sumatera")
    .replace(/kepulauan bangka belitung/, "bangka belitung")
    .trim();
  if (n === "jakarta") return "dki jakarta";
  if (n === "yogyakarta") return "di yogyakarta";
  return n;
};

/** Nama provinsi baku (38 provinsi) dari label Wikidata, atau string kosong bila tidak dikenal. */
function canonicalProvince(label: string | undefined): string {
  if (!label) return "";
  return PROVINCES.find((p) => normProv(p) === normProv(label)) ?? label;
}

function writeReports(traces: Trace[], stats: { tanpaNama: number; tanpaTahun: number; duplikat: number }, withSummary: number): void {
  const byProv = new Map<string, number>();
  const byCat = new Map<string, number>();
  const byKind = new Map<string, number>();
  const byPrec = new Map<string, number>();
  for (const t of traces) {
    const p = t.province || "(provinsi tidak diketahui)";
    byProv.set(p, (byProv.get(p) ?? 0) + 1);
    byCat.set(t.category, (byCat.get(t.category) ?? 0) + 1);
    byKind.set(t.kind, (byKind.get(t.kind) ?? 0) + 1);
    byPrec.set(t.yearPrecision, (byPrec.get(t.yearPrecision) ?? 0) + 1);
  }
  const empty = PROVINCES.filter((p) => !byProv.has(p));
  const withImage = traces.filter((t) => t.image).length;

  const md: string[] = [];
  md.push("# WIKIDATA IMPORT", "");
  md.push("Dihasilkan oleh `pnpm wikidata` (scripts/import-wikidata.ts). Sumber data: Wikidata (CC0). Ringkasan: Wikipedia bahasa Indonesia (CC BY-SA), kalimat pertama saja, atau templat netral. Semua entri berstatus `perlu-cek`.", "");
  md.push(`Total jejak: **${traces.length}** | dengan ringkasan idwiki: ${withSummary} | templat netral: ${traces.length - withSummary} | dengan gambar P18: ${withImage}`, "");
  const st = stats as Record<string, number>;
  md.push(`Disaring: tanpa nama ${st.tanpaNama}, tanpa tahun valid ${st.tanpaTahun} (tahun di bawah ${MIN_VALID_YEAR} dianggap salah data), duplikat situs kurasi ${st.duplikat}, bukan situs budaya (kawasan alam atau kota) ${st.bukanSitus ?? 0}, di bawah standar kualitas ${st.belowQuality ?? 0}, melebihi batas keseimbangan ${st.overCap ?? 0}.`, "");
  md.push(`Standar: punya artikel idwiki, atau status warisan, atau foto dengan kategori jelas. Keseimbangan: maksimal ${MAX_PER_PROVINCE} jejak per provinsi, ${MAX_PER_PROVINCE_CATEGORY} per kategori dalam provinsi, ${MAX_TOTAL} total, dipilih menurut skor (artikel 4, status warisan 3, foto 2, kategori jelas 1, provinsi diketahui 1).`, "");
  const table = (title: string, m: Map<string, number>) => {
    md.push(`## ${title}`, "", "| nilai | jumlah |", "|---|---|");
    for (const [k, v] of [...m.entries()].sort((a, b) => b[1] - a[1])) md.push(`| ${k} | ${v} |`);
    md.push("");
  };
  table("Per provinsi", byProv);
  table("Per kategori", byCat);
  table("Per jenis tahun", byKind);
  table("Per presisi tahun", byPrec);
  md.push("## Provinsi tanpa jejak", "", empty.length ? empty.join(", ") : "(semua provinsi punya jejak)", "");
  fs.writeFileSync(path.join(ROOT, "docs", "WIKIDATA_IMPORT.md"), md.join("\n"));

  // bagian otomatis di ASSET_GAPS.md
  const gapsFile = path.join(ROOT, "docs", "ASSET_GAPS.md");
  const begin = "<!-- wikidata:begin -->";
  const end = "<!-- wikidata:end -->";
  const block = [
    begin,
    "## Cakupan jejak Wikidata (otomatis)",
    "",
    `Jejak tingkat 3 berjumlah ${traces.length}. Provinsi tanpa jejak sama sekali, yang membutuhkan kurasi manual dari BPK wilayah dan Registrasi Nasional Cagar Budaya: ${empty.length ? empty.join(", ") : "tidak ada"}.`,
    "",
    `Provinsi dengan kurang dari 5 jejak: ${[...byProv.entries()].filter(([, v]) => v < 5).map(([k, v]) => `${k} (${v})`).join(", ") || "tidak ada"}.`,
    end,
  ].join("\n");
  let gaps = fs.existsSync(gapsFile) ? fs.readFileSync(gapsFile, "utf8") : "# Kekosongan Aset\n";
  if (gaps.includes(begin)) gaps = gaps.replace(new RegExp(`${begin}[\\s\\S]*?${end}`), block);
  else gaps = `${gaps.trimEnd()}\n\n${block}\n`;
  fs.writeFileSync(gapsFile, gaps);

  console.log(`\nTotal ${traces.length} jejak. Provinsi kosong: ${empty.length ? empty.join(", ") : "tidak ada"}`);
  console.log("Per kategori:", Object.fromEntries(byCat));
  console.log("Laporan: docs/WIKIDATA_IMPORT.md dan data/wikidata-heritage.json");
}

if (process.argv[1] && /import-wikidata/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
