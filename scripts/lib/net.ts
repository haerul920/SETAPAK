/**
 * Alat jaringan bersama untuk script data (verify-facts, import-wikidata).
 * Sopan terhadap server: User-Agent deskriptif, jeda antar permintaan, coba ulang saat 429 atau 5xx,
 * dan cache lokal di scripts/.cache sehingga menjalankan ulang tidak mengunduh ulang.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const UA = "SETAPAK/1.0 (platform edukasi cagar budaya, BUDAYA GO! 2026; https://setapak.budayago.id)";
export const CACHE_ROOT = path.join(process.cwd(), "scripts", ".cache");

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const lastCall = new Map<string, number>();

/** Jeda minimum per host agar tidak membebani server. */
async function throttle(url: string, minGapMs: number): Promise<void> {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return;
  }
  const wait = (lastCall.get(host) ?? 0) + minGapMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall.set(host, Date.now());
}

export interface FetchResult {
  ok: boolean;
  status: number;
  finalUrl: string;
  contentType: string;
  body: string;
  /** isi biner untuk PDF (hanya bila opts.pdf = true) */
  pdf?: Uint8Array;
  error?: string;
}

export async function politeFetch(
  url: string,
  opts: { gapMs?: number; accept?: string; retries?: number; timeoutMs?: number; pdf?: boolean } = {}
): Promise<FetchResult> {
  const retries = opts.retries ?? 3;
  let last: FetchResult = { ok: false, status: 0, finalUrl: url, contentType: "", body: "", error: "belum dicoba" };
  for (let attempt = 0; attempt <= retries; attempt++) {
    await throttle(url, opts.gapMs ?? 250);
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": UA, "Api-User-Agent": UA, Accept: opts.accept ?? "text/html,application/json;q=0.9,*/*;q=0.5" },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
      });
      const contentType = res.headers.get("content-type") ?? "";
      const isText = /text|json|xml|html/i.test(contentType) || contentType === "";
      const isPdf = Boolean(opts.pdf) && res.ok && /pdf/i.test(contentType);
      const body = isText ? await res.text() : "";
      const pdf = isPdf ? new Uint8Array(await res.arrayBuffer()) : undefined;
      last = { ok: res.ok, status: res.status, finalUrl: res.url || url, contentType, body, pdf };
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get("retry-after")) || 3 * (attempt + 1);
        await sleep(retryAfter * 1000);
        continue;
      }
      return last;
    } catch (e) {
      last = { ok: false, status: 0, finalUrl: url, contentType: "", body: "", error: (e as Error).message };
      await sleep(1500 * (attempt + 1));
    }
  }
  return last;
}

/** Cache berkas JSON per kunci (URL atau kueri). */
export function cacheRead<T>(bucket: string, key: string): T | null {
  const file = cachePath(bucket, key);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

export function cacheWrite(bucket: string, key: string, value: unknown): void {
  const file = cachePath(bucket, key);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
}

function cachePath(bucket: string, key: string): string {
  const h = crypto.createHash("sha1").update(key).digest("hex").slice(0, 20);
  return path.join(CACHE_ROOT, bucket, `${h}.json`);
}

/* ------------------------------------------------------------------ */
/* HTML ke teks polos                                                  */
/* ------------------------------------------------------------------ */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "-",
  mdash: "-",
  hellip: "...",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
};

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|tr|h[1-6]|section|table|ul|ol|br)\s*>/gi, ". ")
    .replace(/<br\s*\/?>/gi, ". ")
    // tag dengan atribut bertanda kutip (atribut data-mw Wikipedia memuat ">" di dalam nilainya)
    .replace(/<\/?[a-zA-Z][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .replace(/\[\s*\d+\s*\]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/(\. ){2,}/g, ". ")
    .trim();
}

/** Judul halaman Wikipedia dari URL, atau null bila bukan URL Wikipedia. */
export function wikipediaRef(url: string): { lang: string; title: string } | null {
  const m = url.match(/^https?:\/\/([a-z-]+)\.wikipedia\.org\/wiki\/([^#?]+)/i);
  return m ? { lang: m[1].toLowerCase(), title: m[2] } : null;
}
