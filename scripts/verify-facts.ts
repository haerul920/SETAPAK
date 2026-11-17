/**
 * SETAPAK - Verifikasi fakta kurasi (docs/DATA_EXPANSION.md bagian A).
 *
 * Untuk setiap peristiwa:
 *   1. ambil teks tiap sumber (Wikipedia lewat REST API, sumber lain lewat HTML),
 *   2. periksa URL hidup (status 200, simpan URL akhir setelah redirect),
 *   3. periksa semua angka tahun di `dateLabel` muncul di teks sumber (abad dan "tahun lalu" ditangani),
 *   4. untuk tanggal lengkap, periksa nama bulan juga muncul (bahasa Indonesia atau Inggris).
 *
 * Hasil: docs/FACT_CHECK.md (tabel untuk peninjau manusia) dan data/fact-check.json (mesin).
 * Catatan tindak lanjut manusia/agen ada di data/fact-check-notes.json dan ikut dicetak ke tabel.
 *
 * Script ini TIDAK mengubah data dan TIDAK PERNAH menaikkan status ke `terverifikasi`.
 *
 * Pemakaian: pnpm facts [--refresh] [--only=ev-id,ev-id]
 */
import fs from "node:fs";
import path from "node:path";
import { kingdoms, sortedEvents, sourceById } from "../data/index";
import type { TimelineEvent } from "../data/index";
import { extractText, getDocumentProxy } from "unpdf";
import { cacheRead, cacheWrite, htmlToText, politeFetch, wikipediaRef } from "./lib/net";

const ROOT = process.cwd();
const REFRESH = process.argv.includes("--refresh");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1]?.split(",");

/* ------------------------------------------------------------------ */
/* Pengambilan teks sumber                                             */
/* ------------------------------------------------------------------ */

export type FetchState = "ok" | "dead" | "blocked" | "unreachable" | "nontext";

export interface SourceText {
  url: string;
  finalUrl: string;
  state: FetchState;
  httpStatus: number;
  text: string;
  note?: string;
}

const MAX_TEXT = 600_000;

async function fetchSourceText(url: string): Promise<SourceText> {
  if (!REFRESH) {
    const cached = cacheRead<SourceText>("facts", url);
    if (cached) return cached;
  }
  const wiki = wikipediaRef(url);
  let result: SourceText;
  if (wiki) {
    const api = `https://${wiki.lang}.wikipedia.org/api/rest_v1/page/html/${wiki.title}`;
    const r = await politeFetch(api, { gapMs: 200, accept: "text/html" });
    const canonical = r.finalUrl.replace(/^https?:\/\/([a-z-]+)\.wikipedia\.org\/api\/rest_v1\/page\/html\//, "https://$1.wikipedia.org/wiki/").replace(/\/\d+$/, "");
    result = {
      url,
      finalUrl: r.ok ? canonical : url,
      state: r.ok ? "ok" : r.status === 404 || r.status === 410 ? "dead" : "unreachable",
      httpStatus: r.status,
      text: r.ok ? htmlToText(r.body).slice(0, MAX_TEXT) : "",
      note: r.error,
    };
  } else {
    const r = await politeFetch(url, { gapMs: 600, retries: 1, pdf: true });
    let state: FetchState;
    let pdfText = "";
    if (r.pdf) {
      try {
        const doc = await getDocumentProxy(r.pdf);
        const { text } = await extractText(doc, { mergePages: true });
        pdfText = (Array.isArray(text) ? text.join(" ") : text)
          .replace(/\s+/g, " ")
          // salah baca OCR umum: angka 1 terbaca huruf I atau l dan terpisah spasi ("I 936")
          .replace(/(?<![A-Za-z0-9])[Il] ?(\d{3})(?!\d)/g, "1$1")
          .trim();
      } catch {
        pdfText = "";
      }
    }
    if (r.pdf) state = pdfText.length > 200 ? "ok" : "nontext";
    else if (r.ok && /octet-stream|image\//i.test(r.contentType)) state = "nontext";
    else if (r.ok) state = "ok";
    else if (r.status === 404 || r.status === 410) state = "dead";
    else if ([401, 403, 429, 451, 999].includes(r.status)) state = "blocked";
    else state = "unreachable";
    result = {
      url,
      finalUrl: r.finalUrl || url,
      state,
      httpStatus: r.status,
      text: state === "ok" ? (pdfText || htmlToText(r.body)).slice(0, MAX_TEXT) : "",
      note: r.error ?? (pdfText ? "PDF" : undefined),
    };
  }
  cacheWrite("facts", url, result);
  return result;
}

/* ------------------------------------------------------------------ */
/* Pencocokan dateLabel dengan teks                                    */
/* ------------------------------------------------------------------ */

const MONTHS_ID = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
const MONTHS_EN = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

export type Match = "cocok" | "cocok-tahun-saja" | "cocok-abad" | "tidak-ditemukan" | "label-tanpa-angka";

export interface LabelSpec {
  kind: "years" | "century" | "ago" | "none";
  years: number[];
  /** awal dasawarsa untuk label berbentuk "1970-an" */
  decadeYears: number[];
  centuries: number[];
  agoNumbers: { value: number; unit: "ribu" | "juta" }[];
  months: number[];
  decade: boolean;
}

export function parseLabel(label: string): LabelSpec {
  const cleaned = label.replace(/\(\s*\d+\s*H\s*\)/g, " ").replace(/\(diperdebatkan\)/gi, " ");
  const lower = cleaned.toLowerCase();
  const months: number[] = [];
  MONTHS_ID.forEach((m, i) => {
    if (new RegExp(`\\b${m}\\b`, "i").test(lower)) months.push(i);
  });
  const spec: LabelSpec = { kind: "none", years: [], decadeYears: [], centuries: [], agoNumbers: [], months, decade: /\d{4}-an/.test(lower) };

  if (/tahun lalu/.test(lower)) {
    spec.kind = "ago";
    const juta = /juta/.test(lower);
    for (const m of cleaned.matchAll(/(\d{1,3}(?:\.\d{3})+|\d+(?:,\d+)?)/g)) {
      const raw = m[1];
      const value = juta ? Number(raw.replace(",", ".")) : Number(raw.replace(/\./g, ""));
      if (Number.isFinite(value)) spec.agoNumbers.push({ value, unit: juta ? "juta" : "ribu" });
    }
    return spec;
  }
  if (/abad ke-/.test(lower)) {
    spec.kind = "century";
    const m = lower.match(/abad ke-(\d+)(?:\s*-\s*(\d+))?/);
    if (m) {
      spec.centuries.push(Number(m[1]));
      if (m[2]) spec.centuries.push(Number(m[2]));
    }
    return spec;
  }
  // "1970-an" berarti dasawarsa: cukup ada tahun mana pun di dalam 1970 sampai 1979
  for (const m of cleaned.matchAll(/(?<![\d.,])(\d{3,4})(-an)?(?![\d.,]\d)/g)) (m[2] ? spec.decadeYears : spec.years).push(Number(m[1]));
  if (spec.years.length || spec.decadeYears.length) spec.kind = "years";
  return spec;
}

const ROMAN: [number, string][] = [[10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
function toRoman(n: number): string {
  let out = "";
  for (const [v, r] of ROMAN) {
    while (n >= v) {
      out += r;
      n -= v;
    }
  }
  return out;
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10 > 3 ? 0 : n % 10]}`;
}

const hasWord = (text: string, token: string) => new RegExp(`(?<![\\d])${token}(?![\\d])`).test(text);

function agoPresent(text: string, n: { value: number; unit: "ribu" | "juta" }): boolean {
  if (n.unit === "juta") {
    const v = String(n.value);
    const dot = v.replace(",", ".");
    const comma = v.replace(".", ",");
    return new RegExp(`${dot.replace(".", "[.,]")}\\s*(million|juta|mya|ma\\b)`, "i").test(text) || text.includes(`${comma} juta`) || text.includes(`${Math.round(n.value * 1_000_000)}`) || text.includes(`${Math.round(n.value * 1000)},000`);
  }
  const v = n.value;
  const grouped = v.toLocaleString("en-US");
  const dotted = v.toLocaleString("de-DE");
  const spaced = grouped.replace(/,/g, " ");
  const kilo = (v / 1000).toFixed(1).replace(/\.0$/, "");
  return (
    text.includes(grouped) ||
    text.includes(dotted) ||
    text.includes(spaced) ||
    hasWord(text, String(v)) ||
    new RegExp(`(?<![\\d.])${kilo.replace(".", "[.,]")}\\s*(ka\\b|kya\\b|thousand|ribu)`, "i").test(text)
  );
}

export function matchLabel(spec: LabelSpec, textRaw: string): { match: Match; token?: string } {
  const text = textRaw.toLowerCase();
  if (spec.kind === "none") return { match: "label-tanpa-angka" };

  if (spec.kind === "ago") {
    const found = spec.agoNumbers.filter((n) => agoPresent(text, n));
    if (found.length === spec.agoNumbers.length && found.length) return { match: "cocok", token: String(found[0].value) };
    return { match: "tidak-ditemukan" };
  }

  if (spec.kind === "century") {
    const inText = spec.centuries.filter(
      (c) => new RegExp(`\\b${ordinal(c)}[ -]century\\b`).test(text) || new RegExp(`abad ke[- ]${c}\\b`).test(text) || new RegExp(`\\babad (?:ke[- ])?${toRoman(c)}\\b`).test(text) || new RegExp(`\\b${c}(?:th|st|nd|rd)\\s*-\\s*century`).test(text)
    );
    if (inText.length) return { match: "cocok", token: ordinal(inText[0]) };
    // tahun di dalam rentang abad yang disebut
    const lo = (Math.min(...spec.centuries) - 1) * 100 + 1;
    const hi = Math.max(...spec.centuries) * 100;
    for (let y = lo; y <= hi; y++) {
      if (hasWord(text, String(y))) return { match: "cocok-abad", token: String(y) };
    }
    return { match: "tidak-ditemukan" };
  }

  // tahun
  const missing = spec.years.filter((y) => !hasWord(text, String(y)));
  if (missing.length) return { match: "tidak-ditemukan", token: String(missing[0]) };
  let decadeToken: string | undefined;
  for (const d of spec.decadeYears) {
    let hit: number | undefined;
    for (let y = d; y < d + 10; y++) if (hasWord(text, String(y))) hit = hit ?? y;
    if (hit === undefined) return { match: "tidak-ditemukan", token: `${d}-an` };
    decadeToken ??= String(hit);
  }
  if (!spec.years.length && decadeToken) return { match: "cocok", token: decadeToken };
  // dengan tanggal: bulan juga harus muncul
  if (spec.months.length) {
    const okMonth = spec.months.every((m) => new RegExp(`\\b(${MONTHS_ID[m]}|${MONTHS_EN[m]})\\b`, "i").test(text));
    if (!okMonth) return { match: "cocok-tahun-saja", token: String(spec.years[0]) };
  }
  return { match: "cocok", token: String(spec.years[0]) };
}

/** Kalimat yang memuat token, dipotong maksimal 25 kata di sekitar token. */
export function quoteAround(text: string, token: string | undefined): string {
  if (!token) return "";
  const idx = text.indexOf(token);
  if (idx < 0) {
    const lower = text.toLowerCase().indexOf(token.toLowerCase());
    if (lower < 0) return "";
    return quoteAt(text, lower, token.length);
  }
  return quoteAt(text, idx, token.length);
}

function quoteAt(text: string, idx: number, len: number): string {
  const start = Math.max(text.lastIndexOf(". ", idx) + 2, idx - 400, 0);
  const endDot = text.indexOf(". ", idx + len);
  const end = endDot < 0 ? Math.min(text.length, idx + 400) : Math.min(endDot + 1, idx + 400);
  const words = text.slice(start, end).split(/\s+/).filter(Boolean);
  const pos = words.findIndex((w) => text.slice(idx, idx + len) && w.includes(text.slice(idx, idx + len)));
  if (words.length <= 25) return words.join(" ");
  const from = Math.max(0, Math.min((pos < 0 ? 0 : pos) - 10, words.length - 25));
  return (from > 0 ? "... " : "") + words.slice(from, from + 25).join(" ") + (from + 25 < words.length ? " ..." : "");
}

/* ------------------------------------------------------------------ */
/* Hasil per peristiwa                                                 */
/* ------------------------------------------------------------------ */

export type Verdict = "cocok" | "cocok-sebagian" | "tahun-tidak-ditemukan" | "url-mati" | "tidak-dapat-diperiksa" | "label-tanpa-angka";

export interface SourceFinding {
  sourceId: string;
  url: string;
  finalUrl: string;
  state: FetchState;
  httpStatus: number;
  match: Match | null;
  token?: string;
  quote: string;
}

export interface EventFinding {
  id: string;
  dateLabel: string;
  status: string;
  verdict: Verdict;
  sources: SourceFinding[];
  /** kutipan dari sumber terbaik (untuk peninjau manusia) */
  quote: string;
  quoteUrl: string;
}

const MATCH_RANK: Record<Match, number> = { cocok: 0, "cocok-abad": 1, "cocok-tahun-saja": 2, "label-tanpa-angka": 3, "tidak-ditemukan": 4 };

function verdictOf(ev: TimelineEvent, findings: SourceFinding[], spec: LabelSpec): Verdict {
  if (spec.kind === "none") return "label-tanpa-angka";
  const matches = findings.filter((f) => f.match).map((f) => f.match as Match);
  if (matches.includes("cocok")) return "cocok";
  if (matches.includes("cocok-abad") || matches.includes("cocok-tahun-saja")) return "cocok-sebagian";
  if (matches.includes("tidak-ditemukan")) return "tahun-tidak-ditemukan";
  if (findings.length && findings.every((f) => f.state === "dead")) return "url-mati";
  if (findings.some((f) => f.state === "dead") && !findings.some((f) => f.state === "ok")) return "url-mati";
  return "tidak-dapat-diperiksa";
}

export interface KingdomFinding {
  id: string;
  name: string;
  start: number;
  end: number;
  url: string;
  finalUrl: string;
  state: FetchState;
  httpStatus: number;
  startFound: boolean | null;
  endFound: boolean | null;
}

/* ------------------------------------------------------------------ */
/* Laporan                                                             */
/* ------------------------------------------------------------------ */

interface Note {
  id: string;
  action: string;
  note: string;
}

const VERDICT_LABEL: Record<Verdict, string> = {
  cocok: "cocok",
  "cocok-sebagian": "cocok sebagian (abad atau tahun saja)",
  "tahun-tidak-ditemukan": "tahun tidak ditemukan",
  "url-mati": "URL mati",
  "tidak-dapat-diperiksa": "tidak dapat diperiksa otomatis",
  "label-tanpa-angka": "label tanpa angka",
};

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

function writeReport(findings: EventFinding[], notes: Note[], kingdomFindings: KingdomFinding[]): void {
  const counts: Record<string, number> = {};
  for (const f of findings) counts[f.verdict] = (counts[f.verdict] ?? 0) + 1;
  const byStatus: Record<string, number> = {};
  for (const f of findings) byStatus[f.status] = (byStatus[f.status] ?? 0) + 1;
  const noteBy = new Map<string, Note[]>();
  for (const n of notes) noteBy.set(n.id, [...(noteBy.get(n.id) ?? []), n]);
  // Peristiwa bermasalah tanpa catatan eksplisit mendapat tindak lanjut baku: pemeriksaan oleh manusia.
  const defaultNote = (f: EventFinding): Note | null => {
    if (f.verdict === "tidak-dapat-diperiksa") return { id: f.id, action: "manual", note: "sumber resmi memblokir pemeriksaan otomatis atau tidak terjangkau (UNESCO, kemdikbud, PDF, DOI); perlu dicek manusia, status tidak diubah" };
    if (f.verdict === "cocok-sebagian") return { id: f.id, action: "manual", note: "abad cocok tetapi tahun atau bulan persisnya tidak ditemukan di teks sumber; periksa ke sumber resmi" };
    return null;
  };
  const actions: Record<string, number> = {};
  for (const n of notes) actions[n.action] = (actions[n.action] ?? 0) + 1;
  for (const f of findings) if (f.verdict !== "cocok" && !noteBy.has(f.id) && defaultNote(f)) actions.manual = (actions.manual ?? 0) + 1;

  const lines: string[] = [];
  lines.push("# FACT CHECK");
  lines.push("");
  lines.push("Dihasilkan oleh `pnpm facts` (scripts/verify-facts.ts). Jangan disunting tangan: catatan tindak lanjut ditulis di `data/fact-check-notes.json` lalu script dijalankan ulang.");
  lines.push("");
  lines.push("Script mencocokkan angka tahun, abad, dan bulan di `dateLabel` dengan teks sumber. Hasil `cocok` berarti tahunnya ditemukan di sumber; BUKAN berarti status naik ke `terverifikasi`. Kenaikan status adalah wewenang tim manusia setelah memeriksa sumber resmi (Registrasi Nasional Cagar Budaya, BPK, UNESCO).");
  lines.push("");
  lines.push("## Ringkasan");
  lines.push("");
  lines.push(`Total peristiwa diperiksa: ${findings.length}`);
  lines.push("");
  lines.push("| Hasil otomatis | Jumlah |");
  lines.push("|---|---|");
  for (const k of Object.keys(VERDICT_LABEL) as Verdict[]) lines.push(`| ${VERDICT_LABEL[k]} | ${counts[k] ?? 0} |`);
  lines.push("");
  lines.push("| Status data saat ini | Jumlah |");
  lines.push("|---|---|");
  for (const [k, v] of Object.entries(byStatus)) lines.push(`| ${k} | ${v} |`);
  lines.push("");
  if (notes.length) {
    lines.push("| Tindak lanjut | Jumlah |");
    lines.push("|---|---|");
    for (const [k, v] of Object.entries(actions)) lines.push(`| ${k} | ${v} |`);
    lines.push("");
  }
  lines.push("## Perlu perhatian");
  lines.push("");
  const attention = findings.filter((f) => f.verdict !== "cocok");
  lines.push("| id | label tanggal | hasil otomatis | tindak lanjut |");
  lines.push("|---|---|---|---|");
  for (const f of attention) {
    const own = noteBy.get(f.id) ?? (defaultNote(f) ? [defaultNote(f) as Note] : []);
    lines.push(`| ${f.id} | ${esc(f.dateLabel)} | ${VERDICT_LABEL[f.verdict]} | ${own.length ? own.map((n) => `**${n.action}**: ${esc(n.note)}`).join(" ") : "belum ditindaklanjuti"} |`);
  }
  lines.push("");
  if (notes.length) {
    lines.push("## Log perubahan dan tindak lanjut");
    lines.push("");
    lines.push("Semua koreksi data akibat verifikasi, termasuk yang kini sudah berstatus cocok. Isi peristiwa yang dihapus dikutip agar bisa dipulihkan dari git.");
    lines.push("");
    lines.push("| id | tindakan | catatan |");
    lines.push("|---|---|---|");
    for (const n of notes) lines.push(`| ${n.id} | ${n.action} | ${esc(n.note)} |`);
    lines.push("");
  }
  lines.push("## Semua peristiwa");
  lines.push("");
  lines.push("| id | label | URL sumber (akhir) | hasil | kutipan sumber (maks. 25 kata) |");
  lines.push("|---|---|---|---|---|");
  for (const f of findings) {
    lines.push(`| ${f.id} | ${esc(f.dateLabel)} | ${f.quoteUrl || "-"} | ${VERDICT_LABEL[f.verdict]} | ${esc(f.quote)} |`);
  }
  lines.push("");
  lines.push("## Pita kerajaan (semua rentang adalah perkiraan)");
  lines.push("");
  lines.push("Rentang di `data/kingdoms.ts` ditampilkan dengan label perkiraan dan tanpa batas wilayah. Tabel ini hanya memeriksa apakah URL sumbernya hidup dan apakah angka awal dan akhir muncul di teks sumber; angka yang tidak muncul tidak otomatis salah karena sumber sering memberi rentang berbeda.");
  lines.push("");
  lines.push("| id | rentang | URL sumber (akhir) | awal di sumber | akhir di sumber | status URL |");
  lines.push("|---|---|---|---|---|---|");
  const yn = (v: boolean | null) => (v === null ? "-" : v ? "ya" : "tidak");
  for (const k of kingdomFindings) lines.push(`| ${k.id} | ${k.start} sampai ${k.end} | ${k.finalUrl} | ${yn(k.startFound)} | ${yn(k.endFound)} | ${k.state} |`);
  lines.push("");
  fs.writeFileSync(path.join(ROOT, "docs", "FACT_CHECK.md"), lines.join("\n"));
}

/* ------------------------------------------------------------------ */
/* Utama                                                               */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  const events = sortedEvents.filter((e) => !ONLY || ONLY.includes(e.id));
  const urls = new Set<string>();
  for (const e of events) for (const id of e.sourceIds) if (sourceById[id]) urls.add(sourceById[id].url);
  console.log(`Mengambil ${urls.size} sumber untuk ${events.length} peristiwa...`);

  const texts = new Map<string, SourceText>();
  let i = 0;
  for (const url of urls) {
    i++;
    const t = await fetchSourceText(url);
    texts.set(url, t);
    if (i % 10 === 0 || t.state !== "ok") console.log(`  [${i}/${urls.size}] ${t.state}${t.httpStatus ? " " + t.httpStatus : ""} ${url.slice(0, 90)}`);
  }

  const kingdomFindings: KingdomFinding[] = [];
  if (!ONLY) {
    console.log(`Mengambil ${kingdoms.length} sumber pita kerajaan...`);
    for (const k of kingdoms) {
      const t = await fetchSourceText(k.source);
      const text = t.text.toLowerCase();
      const found = (year: number) => (t.state === "ok" ? new RegExp(`(?<![\\d.,])${year}(?![\\d])`).test(text) : null);
      kingdomFindings.push({ id: k.id, name: k.name, start: k.start, end: k.end, url: k.source, finalUrl: t.finalUrl, state: t.state, httpStatus: t.httpStatus, startFound: found(k.start), endFound: found(k.end) });
    }
  }

  const findings: EventFinding[] = [];
  for (const ev of events) {
    const spec = parseLabel(ev.dateLabel);
    const per: SourceFinding[] = [];
    for (const sid of ev.sourceIds) {
      const src = sourceById[sid];
      if (!src) continue;
      const t = texts.get(src.url)!;
      let match: Match | null = null;
      let token: string | undefined;
      let quote = "";
      if (t.state === "ok") {
        const m = matchLabel(spec, t.text);
        match = m.match;
        token = m.token;
        if (match !== "tidak-ditemukan" && match !== "label-tanpa-angka") quote = quoteAround(t.text, token);
      }
      per.push({ sourceId: sid, url: src.url, finalUrl: t.finalUrl, state: t.state, httpStatus: t.httpStatus, match, token, quote });
    }
    const verdict = verdictOf(ev, per, spec);
    const best = [...per].filter((p) => p.match).sort((a, b) => MATCH_RANK[a.match as Match] - MATCH_RANK[b.match as Match])[0];
    findings.push({
      id: ev.id,
      dateLabel: ev.dateLabel,
      status: ev.status,
      verdict,
      sources: per,
      quote: best?.quote ?? "",
      quoteUrl: best?.finalUrl ?? per[0]?.finalUrl ?? "",
    });
  }

  fs.writeFileSync(path.join(ROOT, "data", "fact-check.json"), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), findings, kingdoms: kingdomFindings }, null, 1) + "\n");
  const notesFile = path.join(ROOT, "data", "fact-check-notes.json");
  const notes: Note[] = fs.existsSync(notesFile) ? (JSON.parse(fs.readFileSync(notesFile, "utf8")) as { notes: Note[] }).notes : [];
  writeReport(findings, notes, kingdomFindings);

  const counts: Record<string, number> = {};
  for (const f of findings) counts[f.verdict] = (counts[f.verdict] ?? 0) + 1;
  console.log("\nHasil:", counts);
  const states: Record<string, number> = {};
  for (const t of texts.values()) states[t.state] = (states[t.state] ?? 0) + 1;
  console.log("Status sumber:", states);
  if (kingdomFindings.length) console.log("Pita kerajaan:", { urlOk: kingdomFindings.filter((k) => k.state === "ok").length, urlBermasalah: kingdomFindings.filter((k) => k.state !== "ok").map((k) => k.id) });
  console.log("Laporan: docs/FACT_CHECK.md dan data/fact-check.json");
}

if (process.argv[1] && /verify-facts/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
