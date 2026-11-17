/**
 * Jejak tingkat 3 (docs/SCROLL_ENGINE.md bagian 7): situs cagar budaya otomatis dari Wikidata,
 * ditampilkan sebagai "batu jejak" kecil di jalur tepi kiri dan kanan layar. Tidak ikut algoritma
 * klaster tingkat 2. Semua bertanda "perlu dicek" karena belum diperiksa manusia.
 *
 * Tata letak di sini murni (tanpa DOM) supaya bisa diuji:
 *  - jejak diurutkan menurut y;
 *  - bila lebih dari 6 jejak berada dalam 200 px, semuanya digabung menjadi satu gelembung "+N jejak";
 *  - sisanya masuk jalur kiri atau kanan; bila jalur penuh, jejak bergeser sedikit ke bawah.
 */
import lite from "@/data/wikidata-heritage-lite.json";
import type { SourceStatus } from "@/data";
import { seedOf } from "./hash";

export type TraceCategory =
  | "prasejarah"
  | "seni-cadas"
  | "prasasti"
  | "candi"
  | "islam"
  | "keraton"
  | "benteng"
  | "kolonial"
  | "kemerdekaan"
  | "lanskap"
  | "lainnya";

/** Bagian ringan yang dipakai tata letak, batu jejak, dan halaman kredit. */
export interface TraceLite {
  id: string;
  name: string;
  nameEn: string;
  year: number;
  yearLabel: string;
  category: TraceCategory;
}

/** Data lengkap (data/wikidata-heritage.json), dimuat saat laci detail dibuka. */
export interface Trace extends TraceLite {
  yearPrecision: string;
  kind: string;
  coords: { lat: number; lng: number };
  province: string;
  heritage: boolean;
  /** nama berkas Commons foto utama (P18), bila ada */
  image?: string;
  wikidata: string;
  wikipedia?: string;
  summary: string;
  summarySource: string;
  status: SourceStatus;
}

export const traces: readonly TraceLite[] = (lite as unknown as TraceLite[]).slice().sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
export const traceLiteById: ReadonlyMap<string, TraceLite> = new Map(traces.map((t) => [t.id, t]));

let fullCache: Map<string, Trace> | null = null;

/** Memuat data lengkap satu jejak (potongan JavaScript terpisah, hanya saat dibutuhkan). */
export async function loadTrace(id: string): Promise<Trace | undefined> {
  if (!fullCache) {
    const mod = await import("@/data/wikidata-heritage.json");
    fullCache = new Map((mod.default as unknown as Trace[]).map((t) => [t.id, t]));
  }
  return fullCache.get(id);
}

export const TRACE_LABEL: Record<TraceCategory, { id: string; en: string }> = {
  prasejarah: { id: "Prasejarah", en: "Prehistory" },
  "seni-cadas": { id: "Seni cadas", en: "Rock art" },
  prasasti: { id: "Prasasti", en: "Inscription" },
  candi: { id: "Candi", en: "Temple" },
  islam: { id: "Islam", en: "Islamic heritage" },
  keraton: { id: "Keraton", en: "Palace" },
  benteng: { id: "Benteng", en: "Fort" },
  kolonial: { id: "Kolonial", en: "Colonial" },
  kemerdekaan: { id: "Kemerdekaan", en: "Independence" },
  lanskap: { id: "Lanskap", en: "Landscape" },
  lainnya: { id: "Cagar budaya", en: "Heritage site" },
};

/* ------------------------------------------------------------------ */
/* Tata letak                                                          */
/* ------------------------------------------------------------------ */

export type StoneSide = "left" | "right";

export interface TraceDims {
  /** tinggi satu batu jejak (px) */
  size: number;
  /** jarak antarbatu pada satu jalur (px) */
  gap: number;
}

export const TRACE_DIMS = { desktop: { size: 28, gap: 6 }, mobile: { size: 12, gap: 4 } } as const satisfies Record<string, TraceDims>;
/** Garis tengah gelembung "+N jejak" (px). */
export const BUBBLE_SIZE = { desktop: 36, mobile: 26 } as const;
/** Jendela penggabungan: lebih dari 6 jejak dalam 200 px menjadi gelembung. */
export const BUBBLE_WINDOW = 200;
export const BUBBLE_MIN = 7;

export interface StonePlacement {
  trace: TraceLite;
  /** pusat vertikal (px di lintasan) */
  y: number;
  side: StoneSide;
}

export interface BubblePlacement {
  id: string;
  y: number;
  side: StoneSide;
  traces: TraceLite[];
}

export interface TraceLayout {
  stones: StonePlacement[];
  bubbles: BubblePlacement[];
}

export function layoutTraces(items: readonly TraceLite[], yearToY: (year: number) => number, mobile: boolean): TraceLayout {
  const dims = mobile ? TRACE_DIMS.mobile : TRACE_DIMS.desktop;
  const bubbleSize = mobile ? BUBBLE_SIZE.mobile : BUBBLE_SIZE.desktop;
  const sides: StoneSide[] = mobile ? ["right"] : ["left", "right"];
  const sorted = items.map((trace) => ({ trace, y: yearToY(trace.year) })).sort((a, b) => a.y - b.y || a.trace.id.localeCompare(b.trace.id));

  // y terendah yang masih bebas pada tiap jalur (tepi atas slot berikutnya)
  const free: Record<StoneSide, number> = { left: -Infinity, right: -Infinity };
  const take = (y: number, preferred: StoneSide, size: number): { side: StoneSide; y: number } => {
    const order = [preferred, ...sides.filter((s) => s !== preferred)].filter((s) => sides.includes(s));
    const top = y - size / 2;
    for (const s of order) {
      if (top >= free[s]) {
        free[s] = top + size + dims.gap;
        return { side: s, y };
      }
    }
    // semua jalur penuh: geser ke bawah ke slot bebas paling awal
    const s = order.reduce((best, cand) => (free[cand] < free[best] ? cand : best), order[0]);
    const placedTop = free[s];
    free[s] = placedTop + size + dims.gap;
    return { side: s, y: placedTop + size / 2 };
  };

  const stones: StonePlacement[] = [];
  const bubbles: BubblePlacement[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && sorted[j].y - sorted[i].y <= BUBBLE_WINDOW) j++;
    const preferred: StoneSide = sides[seedOf(sorted[i].trace.id) % sides.length];
    if (j - i >= BUBBLE_MIN) {
      const group = sorted.slice(i, j);
      const meanY = group.reduce((a, g) => a + g.y, 0) / group.length;
      const at = take(meanY, preferred, bubbleSize);
      bubbles.push({ id: `bub-${group[0].trace.id}`, y: at.y, side: at.side, traces: group.map((g) => g.trace) });
      i = j;
    } else {
      const at = take(sorted[i].y, preferred, dims.size);
      stones.push({ trace: sorted[i].trace, y: at.y, side: at.side });
      i++;
    }
  }
  return { stones, bubbles };
}

/** Nama pendek untuk label batu jejak. */
export function shortName(name: string, max = 26): string {
  const n = name.trim();
  return n.length <= max ? n : `${n.slice(0, max - 1).trimEnd()}…`;
}

/** Histogram kepadatan untuk penggaris: jumlah peristiwa (bobot 2) dan jejak per kotak y. */
export function densityBins(ys: readonly { y: number; weight: number }[], total: number, bins: number): number[] {
  const out = new Array<number>(bins).fill(0);
  for (const p of ys) {
    const k = Math.min(bins - 1, Math.max(0, Math.floor((p.y / Math.max(1, total)) * bins)));
    out[k] += p.weight;
  }
  return out;
}
