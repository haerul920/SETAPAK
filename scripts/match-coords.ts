/**
 * SETAPAK - Pencocokan koordinat situs dengan Wikidata P625 (docs/DATA_EXPANSION.md bagian A.5).
 *
 * Untuk setiap situs: cari entitas Wikidata berdasarkan nama (id dan en), ambil kandidat yang punya
 * koordinat dan berada di Indonesia, lalu pilih yang terdekat dengan koordinat kurasi.
 *   - selisih <= 2 km          : koordinat kurasi dipertahankan
 *   - 2 km < selisih <= 30 km  : dipakai koordinat Wikidata (ditulis ke data/coords-override.json)
 *   - kandidat yang cocok bila tanda lintang/bujur dibalik: HANYA dilaporkan ("kemungkinan-salah-tanda"),
 *     tidak ditimpa otomatis, karena entitas Wikidata sendiri kadang bertanda salah (contoh: Pagaruyung)
 *   - tanpa kandidat Wikidata atau terlalu jauh: dicoba koordinat halaman Wikipedia yang dikutip
 *     peristiwa situs itu (prop=coordinates), dengan aturan jarak yang sama
 *   - selisih > 30 km / tak ada kandidat: tidak diubah, dicatat untuk pemeriksaan manual
 *     (nama sama bisa berarti tempat lain, misalnya banyak desa bernama Ngandong)
 * Wikidata CC0. Hasil: data/coords-override.json dan docs/COORDS_CHECK.md.
 *
 * Pemakaian: pnpm coords [--refresh]
 */
import fs from "node:fs";
import path from "node:path";
import { sortedEvents, sourceById, sitesRaw as sites } from "../data/index";
import { similarNames } from "./lib/names";
import { cacheRead, cacheWrite, politeFetch, wikipediaRef } from "./lib/net";

const ROOT = process.cwd();
const REFRESH = process.argv.includes("--refresh");
const API = "https://www.wikidata.org/w/api.php";
const INDONESIA = "Q252";
const MAX_OVERRIDE_KM = 30;
const KEEP_KM = 2;

interface Candidate {
  id: string;
  label: string;
  description: string;
  lat: number;
  lng: number;
  indonesia: boolean;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const inIndonesiaBox = (lat: number, lng: number) => lat > -11.8 && lat < 6.5 && lng > 94 && lng < 141.5;

async function api<T>(params: Record<string, string>): Promise<T | null> {
  const qs = new URLSearchParams({ ...params, format: "json", origin: "*" });
  const url = `${API}?${qs.toString()}`;
  if (!REFRESH) {
    const cached = cacheRead<T>("wd-api", url);
    if (cached) return cached;
  }
  const r = await politeFetch(url, { gapMs: 250, accept: "application/json" });
  if (!r.ok) return null;
  const json = JSON.parse(r.body) as T;
  cacheWrite("wd-api", url, json);
  return json;
}

/** Variasi nama untuk pencarian: nama penuh, tanpa kurung, tanpa awalan jenis, dan sufiks bertahap. */
function nameVariants(name: string, nameEn?: string): string[] {
  const out: string[] = [];
  const add = (s?: string) => {
    const t = s?.trim();
    if (t && t.length > 2 && !out.includes(t)) out.push(t);
  };
  const clean = (x: string) => x.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  const prefix = /^(Kawasan Cagar Budaya Nasional|Kawasan Cagar Budaya|Kawasan|Situs Manusia Purba|Situs|Candi|Masjid|Istana|Benteng|Keraton|Kraton|Museum|Gedung|Rumah)\s+/i;
  add(clean(name));
  if (nameEn) add(clean(nameEn));
  add(clean(name).replace(prefix, ""));
  // sufiks bertahap: "Situs Manusia Purba Sangiran" -> "Manusia Purba Sangiran" -> "Purba Sangiran" -> "Sangiran"
  const words = clean(name).split(" ");
  for (let i = 1; i < words.length && out.length < 7; i++) {
    const tail = words.slice(i).join(" ");
    if (tail.length >= 5) add(tail);
  }
  return out.slice(0, 7);
}

async function candidatesFor(name: string, nameEn?: string): Promise<Candidate[]> {
  const ids = new Set<string>();
  for (const q of nameVariants(name, nameEn)) {
    for (const lang of ["id", "en"]) {
      const res = await api<{ search?: { id: string }[] }>({ action: "wbsearchentities", search: q, language: lang, uselang: lang, limit: "6", type: "item" });
      for (const s of res?.search ?? []) ids.add(s.id);
    }
  }
  const list = [...ids].slice(0, 40);
  const out: Candidate[] = [];
  for (let i = 0; i < list.length; i += 25) {
    const batch = list.slice(i, i + 25);
    const res = await api<{
      entities?: Record<
        string,
        {
          labels?: Record<string, { value: string }>;
          descriptions?: Record<string, { value: string }>;
          claims?: Record<string, { mainsnak?: { datavalue?: { value?: { latitude?: number; longitude?: number; id?: string } } } }[]>;
        }
      >;
    }>({ action: "wbgetentities", ids: batch.join("|"), props: "claims|labels|descriptions", languages: "id|en" });
    for (const [id, e] of Object.entries(res?.entities ?? {})) {
      const coord = e.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
      if (coord?.latitude === undefined || coord.longitude === undefined) continue;
      const country = e.claims?.P17?.[0]?.mainsnak?.datavalue?.value?.id;
      const indonesia = country === INDONESIA || (!country && inIndonesiaBox(coord.latitude, coord.longitude));
      out.push({
        id,
        label: e.labels?.id?.value ?? e.labels?.en?.value ?? id,
        description: e.descriptions?.id?.value ?? e.descriptions?.en?.value ?? "",
        lat: coord.latitude,
        lng: coord.longitude,
        indonesia,
      });
    }
  }
  return out.filter((c) => c.indonesia);
}


/** Koordinat halaman Wikipedia (en/id) yang dikutip oleh peristiwa suatu situs. */
async function wikipediaCandidates(slug: string): Promise<Candidate[]> {
  const pages = new Map<string, Set<string>>();
  for (const e of sortedEvents) {
    if (e.siteSlug !== slug) continue;
    for (const sid of e.sourceIds) {
      const ref = sourceById[sid] ? wikipediaRef(sourceById[sid].url) : null;
      if (!ref) continue;
      if (!pages.has(ref.lang)) pages.set(ref.lang, new Set());
      pages.get(ref.lang)!.add(decodeURIComponent(ref.title).replace(/_/g, " "));
    }
  }
  const out: Candidate[] = [];
  type WpRes = { query?: { pages?: Record<string, { title: string; coordinates?: { lat: number; lon: number }[] }> } };
  for (const [lang, titles] of pages) {
    const qs = new URLSearchParams({ action: "query", prop: "coordinates", titles: [...titles].slice(0, 40).join("|"), redirects: "1", colimit: "max", format: "json", origin: "*" });
    const url = `https://${lang}.wikipedia.org/w/api.php?${qs.toString()}`;
    let res: WpRes | null = REFRESH ? null : cacheRead<WpRes>("wp-coords", url);
    if (!res) {
      const r = await politeFetch(url, { gapMs: 200, accept: "application/json" });
      if (!r.ok) continue;
      res = JSON.parse(r.body) as WpRes;
      cacheWrite("wp-coords", url, res);
    }
    for (const p of Object.values(res?.query?.pages ?? {})) {
      const c = p.coordinates?.[0];
      if (c) out.push({ id: `${lang}wiki`, label: `Wikipedia (${lang}): ${p.title}`, description: "", lat: c.lat, lng: c.lon, indonesia: true });
    }
  }
  return out;
}

/** Penggantian koordinat hanya sah bila nama entitas mirip nama situs (jarak dekat saja bisa kebetulan, mis. "Pemuda Merdeka"). */
function nameMatches(site: { name: string; nameEn?: string }, label: string): boolean {
  return similarNames(site.name, label) || Boolean(site.nameEn && similarNames(site.nameEn, label));
}

interface Row {
  slug: string;
  name: string;
  original: { lat: number; lng: number };
  result: "dipertahankan" | "diganti-wikidata" | "tidak-cocok" | "tanpa-kandidat" | "kemungkinan-salah-tanda";
  via?: "wikidata" | "wikipedia";
  distanceKm: number | null;
  wikidata?: string;
  label?: string;
  wd?: { lat: number; lng: number };
}

async function main(): Promise<void> {
  const rows: Row[] = [];
  const override: Record<string, { lat: number; lng: number; wikidata: string; label: string; distanceKm: number; original: { lat: number; lng: number }; via: string }> = {};
  let n = 0;
  for (const s of sites) {
    n++;
    const cands = await candidatesFor(s.name, s.nameEn);
    const ranked = cands.map((c) => ({ c, d: haversineKm(s.coords, c) })).sort((a, b) => a.d - b.d);
    const best = ranked[0];
    // kandidat yang cocok setelah tanda lintang/bujur dibalik: hanya dilaporkan
    const flips = [
      { lat: -s.coords.lat, lng: s.coords.lng },
      { lat: s.coords.lat, lng: -s.coords.lng },
    ];
    const signCand = cands.find((c) => flips.some((f) => haversineKm(f, c) <= KEEP_KM) && haversineKm(s.coords, c) > 100);
    let row: Row;
    if (!best) row = { slug: s.slug, name: s.name, original: s.coords, result: "tanpa-kandidat", distanceKm: null };
    else if (best.d <= KEEP_KM) row = { slug: s.slug, name: s.name, original: s.coords, result: "dipertahankan", distanceKm: best.d, wikidata: best.c.id, label: best.c.label, wd: best.c, via: "wikidata" };
    else if (best.d <= MAX_OVERRIDE_KM && nameMatches(s, best.c.label)) {
      row = { slug: s.slug, name: s.name, original: s.coords, result: "diganti-wikidata", distanceKm: best.d, wikidata: best.c.id, label: best.c.label, wd: best.c, via: "wikidata" };
      override[s.slug] = { lat: +best.c.lat.toFixed(5), lng: +best.c.lng.toFixed(5), wikidata: best.c.id, label: best.c.label, distanceKm: +best.d.toFixed(1), original: s.coords, via: "wikidata" };
    } else row = { slug: s.slug, name: s.name, original: s.coords, result: "tidak-cocok", distanceKm: best.d, wikidata: best.c.id, label: `${best.c.label} (${best.c.description || "tanpa deskripsi"})`, wd: best.c, via: "wikidata" };

    // jalur cadangan: koordinat halaman Wikipedia yang dikutip peristiwa situs ini
    if (row.result === "tanpa-kandidat" || row.result === "tidak-cocok") {
      const wp = await wikipediaCandidates(s.slug);
      const nearest = wp.map((c) => ({ c, d: haversineKm(s.coords, c) })).sort((a, b) => a.d - b.d)[0];
      if (nearest && nearest.d <= KEEP_KM) row = { slug: s.slug, name: s.name, original: s.coords, result: "dipertahankan", distanceKm: nearest.d, label: nearest.c.label, wd: nearest.c, via: "wikipedia" };
      else if (nearest && nearest.d <= MAX_OVERRIDE_KM && nameMatches(s, nearest.c.label.replace(/^Wikipedia \([a-z]+\): /, ""))) {
        row = { slug: s.slug, name: s.name, original: s.coords, result: "diganti-wikidata", distanceKm: nearest.d, label: nearest.c.label, wd: nearest.c, via: "wikipedia" };
        override[s.slug] = { lat: +nearest.c.lat.toFixed(5), lng: +nearest.c.lng.toFixed(5), wikidata: nearest.c.id, label: nearest.c.label, distanceKm: +nearest.d.toFixed(1), original: s.coords, via: "wikipedia" };
      } else if (nearest && row.result === "tanpa-kandidat") row = { slug: s.slug, name: s.name, original: s.coords, result: "tidak-cocok", distanceKm: nearest.d, label: `${nearest.c.label}`, wd: nearest.c, via: "wikipedia" };
    }
    if (signCand && (row.result === "tanpa-kandidat" || row.result === "tidak-cocok" || row.result === "diganti-wikidata")) {
      row = { slug: s.slug, name: s.name, original: s.coords, result: "kemungkinan-salah-tanda", distanceKm: haversineKm(s.coords, signCand), wikidata: signCand.id, label: `${signCand.label} (${signCand.description || "tanpa deskripsi"})`, wd: signCand, via: "wikidata" };
      delete override[s.slug];
    }
    rows.push(row);
    console.log(`[${n}/${sites.length}] ${s.slug}: ${row.result}${row.distanceKm !== null ? ` (${row.distanceKm.toFixed(1)} km, ${row.label})` : ""}`);
  }

  fs.writeFileSync(path.join(ROOT, "data", "coords-override.json"), JSON.stringify(override, null, 1) + "\n");

  const count = (r: Row["result"]) => rows.filter((x) => x.result === r).length;
  const md: string[] = [];
  md.push("# COORDS CHECK", "");
  md.push("Dihasilkan oleh `pnpm coords` (scripts/match-coords.ts). Koordinat kurasi dicocokkan dengan Wikidata P625 (CC0).", "");
  md.push("Aturan: selisih sampai 2 km dipertahankan; 2 sampai 30 km memakai koordinat Wikidata (disimpan di `data/coords-override.json`, diterapkan oleh `data/index.ts`); lebih dari 30 km, nama entitas tidak mirip nama situs, atau tanpa kandidat dibiarkan dan perlu diperiksa manual.", "");
  md.push(`Dipertahankan: ${count("dipertahankan")} | Diganti: ${count("diganti-wikidata")} | Tidak cocok: ${count("tidak-cocok")} | Kemungkinan salah tanda: ${count("kemungkinan-salah-tanda")} | Tanpa kandidat: ${count("tanpa-kandidat")}`, "");
  md.push("| situs | hasil | selisih (km) | entitas (via) | koordinat kurasi | koordinat sumber |", "|---|---|---|---|---|---|");
  for (const r of rows) {
    md.push(
      `| ${r.slug} | ${r.result} | ${r.distanceKm === null ? "-" : r.distanceKm.toFixed(1)} | ${r.wikidata && r.via === "wikidata" ? `[${r.wikidata}](https://www.wikidata.org/wiki/${r.wikidata}) ${r.label}` : r.label ?? "-"}${r.via ? ` (${r.via})` : ""} | ${r.original.lat.toFixed(4)}, ${r.original.lng.toFixed(4)} | ${r.wd ? `${r.wd.lat.toFixed(4)}, ${r.wd.lng.toFixed(4)}` : "-"} |`
    );
  }
  md.push("");
  const manualFile = path.join(ROOT, "data", "coords-manual.json");
  if (fs.existsSync(manualFile)) {
    const manual = JSON.parse(fs.readFileSync(manualFile, "utf8")) as Record<string, { lat: number; lng: number; source: string; reason: string } | string>;
    md.push("## Keputusan manual", "", "Ditetapkan setelah meninjau tabel di atas (data/coords-manual.json). Menang atas hasil otomatis.", "", "| situs | koordinat | sumber | alasan |", "|---|---|---|---|");
    for (const [slug, v] of Object.entries(manual)) if (typeof v === "object") md.push(`| ${slug} | ${v.lat}, ${v.lng} | ${v.source} | ${v.reason} |`);
    md.push("");
  }
  fs.writeFileSync(path.join(ROOT, "docs", "COORDS_CHECK.md"), md.join("\n"));
  console.log(`\nDipertahankan ${count("dipertahankan")}, diganti ${count("diganti-wikidata")}, tidak cocok ${count("tidak-cocok")}, kemungkinan salah tanda ${count("kemungkinan-salah-tanda")}, tanpa kandidat ${count("tanpa-kandidat")}. Lihat docs/COORDS_CHECK.md`);
}

if (process.argv[1] && /match-coords/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
