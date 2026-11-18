/**
 * Tata letak guliran waktu (docs/SCROLL_ENGINE.md bagian 2 dan 5).
 * Dihitung sekali per jenis layar (desktop/mobile), murni tanpa DOM, sehingga bisa diuji.
 */
import type { EraId, TimelineEvent } from "@/data";
import { seedOf } from "./hash";
import { densityBins, layoutTraces, traces, type TraceLayout } from "./traces";
import {
  createTimeScale,
  END_YEAR,
  SEGMENTS,
  tickYears,
  type Hold,
  type Segment,
  type TimeScale,
} from "./time-scale";

export interface LayoutOptions {
  mobile: boolean;
  /** tinggi layar acuan (px) untuk bentangan kosong */
  viewport?: number;
}

export interface Bar {
  y0: number;
  y1: number;
  lane: number;
}

export interface PlacedEvent {
  event: TimelineEvent;
  /** pusat horizontal sebagai pecahan lebar area konten (0..1) */
  x: number;
  /** selisih tinggi dari puncak klaster (px) */
  dy: number;
  bar: Bar | null;
}

export interface Cluster {
  id: string;
  index: number;
  year: number;
  lastYear: number;
  y: number;
  height: number;
  events: PlacedEvent[];
}

export type GapNoteKind = "remaining" | "distance" | "screen";

export interface GapNote {
  id: string;
  y: number;
  kind: GapNoteKind;
  /** klaster tujuan tombol "Lompat ke jejak berikutnya" */
  nextClusterId: string;
  nextYear: number;
}

export interface Tick {
  year: number;
  y: number;
  major: boolean;
}

/** Tinggi keterangan pada garis batas segmen (cukup untuk satu baris huruf kecil). */
const LABEL_CLEARANCE = 22;

/**
 * Posisi label di sekitar y yang tidak menimpa klaster mana pun: bila y jatuh di dalam sebuah klaster,
 * label digeser tepat di atas atau di bawahnya (yang terdekat dan bebas dari klaster lain).
 */
export function clearLabelY(y: number, clusters: readonly { y: number; height: number }[]): number {
  const hit = (v: number) => clusters.find((c) => v + LABEL_CLEARANCE > c.y && v - LABEL_CLEARANCE < c.y + c.height);
  if (!hit(y)) return y;
  const cands: number[] = [];
  for (const c of clusters) {
    if (!(y + LABEL_CLEARANCE > c.y && y - LABEL_CLEARANCE < c.y + c.height)) continue;
    cands.push(c.y - LABEL_CLEARANCE - 4, c.y + c.height + LABEL_CLEARANCE + 4);
  }
  const free = cands.filter((v) => !hit(v)).sort((a, b) => Math.abs(a - y) - Math.abs(b - y));
  return free[0] ?? y;
}

export interface SegmentMark {
  segment: Segment;
  /** posisi garis batas segmen */
  y: number;
  /** posisi label: sama dengan y kecuali bila y jatuh di dalam sebuah klaster */
  labelY: number;
}

export interface TimelineLayout {
  mobile: boolean;
  scale: TimeScale;
  clusters: Cluster[];
  notes: GapNote[];
  ticks: Tick[];
  segmentMarks: SegmentMark[];
  bars: { event: TimelineEvent; bar: Bar }[];
  laneCount: number;
  total: number;
  objectHeight: number;
  /** batu jejak dan gelembung tingkat 3 (Wikidata) */
  traces: TraceLayout;
  /** histogram kepadatan peristiwa dan jejak untuk penggaris (DENSITY_BINS kotak) */
  density: number[];
  /** y peristiwa (puncak objek) untuk deep link */
  eventY: Map<string, number>;
  clusterOfEvent: Map<string, Cluster>;
}

export { seedOf };

export const OBJECT_HEIGHT = { desktop: 320, mobile: 420 } as const;
export const MAX_PER_CLUSTER = 3;
export const STAGGER = 40;
export const DENSITY_BINS = 140;
export const CLUSTER_GAP = 120;
export const MIN_BAR_PX = 120;
const VIEWPORT = { desktop: 900, mobile: 760 } as const;


const SLOTS: Record<number, number[]> = {
  1: [0.2, 0.5, 0.78],
  2: [0.27, 0.72],
  3: [0.18, 0.5, 0.8],
};
const STAGGER_PATTERN = [0, STAGGER, STAGGER / 2.5];

function clusterHeight(n: number, mobile: boolean): number {
  const h = mobile ? OBJECT_HEIGHT.mobile : OBJECT_HEIGHT.desktop;
  if (mobile) return n * h;
  return h + (n > 1 ? STAGGER : 0);
}

export function buildLayout(events: readonly TimelineEvent[], opts: LayoutOptions): TimelineLayout {
  const mobile = opts.mobile;
  const objH = mobile ? OBJECT_HEIGHT.mobile : OBJECT_HEIGHT.desktop;
  const viewport = opts.viewport ?? (mobile ? VIEWPORT.mobile : VIEWPORT.desktop);
  const sorted = [...events].sort((a, b) => a.sortKey - b.sortKey);
  const baseScale = createTimeScale({ mobile });

  // 1. Klaster pada skala dasar (penggabungan bertahap): pasangan klaster bertetangga yang paling
  //    dekat digabung lebih dulu, selama rentangnya < tinggi objek dan isinya maksimal 3 objek.
  //    Dengan begitu 14 dan 24 Juni 1669 tetap satu klaster walau ada peristiwa 1666 di dekatnya.
  const ys = new Map(sorted.map((ev) => [ev.id, baseScale.yearToY(ev.sortKey)]));
  const yOf = (ev: TimelineEvent) => ys.get(ev.id) ?? 0;
  const groups: TimelineEvent[][] = sorted.map((ev) => [ev]);
  for (;;) {
    let best = -1;
    let bestGap = Infinity;
    for (let i = 0; i < groups.length - 1; i++) {
      const a = groups[i];
      const b = groups[i + 1];
      if (a.length + b.length > MAX_PER_CLUSTER) continue;
      if (yOf(b[b.length - 1]) - yOf(a[0]) >= objH) continue;
      // penutup 2026 selalu berdiri sendiri
      if ([...a, ...b].some((ev) => ev.moment === "Constellation")) continue;
      let gap = yOf(b[0]) - yOf(a[a.length - 1]);
      // utamakan peristiwa pada tahun kalender yang sama (misal tiga peristiwa 2009)
      const sameYear = [...a, ...b].every((ev) => Math.floor(ev.sortKey) === Math.floor(a[0].sortKey));
      if (sameYear) gap -= objH;
      if (gap < bestGap) {
        bestGap = gap;
        best = i;
      }
    }
    if (best < 0) break;
    groups.splice(best, 2, [...groups[best], ...groups[best + 1]]);
  }

  // 2. Tahanan: bila klaster berikutnya terlalu dekat, sisipkan ruang pada tahun akhir klaster.
  const holds: Hold[] = [];
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const next = groups[i + 1];
    const h = clusterHeight(g.length, mobile);
    const y0 = baseScale.yearToY(g[0].sortKey);
    const nextY = next ? baseScale.yearToY(next[0].sortKey) : baseScale.total + h + CLUSTER_GAP;
    const need = h + CLUSTER_GAP - (nextY - y0);
    // nilai px tahanan dinyatakan dalam px desktop karena createTimeScale mengalikan faktor mobile
    if (need > 0) holds.push({ year: g[g.length - 1].sortKey, px: need / baseScale.factor });
  }
  const scale = createTimeScale({ mobile, holds });

  // 3. Posisi klaster dan objek.
  const clusters: Cluster[] = [];
  const eventY = new Map<string, number>();
  const clusterOfEvent = new Map<string, Cluster>();
  let prevSingleSlot = -1;
  groups.forEach((g, index) => {
    const y = scale.yearToY(g[0].sortKey);
    const n = g.length;
    let xs: number[];
    if (n === 1) {
      const opts1 = SLOTS[1];
      let pick = seedOf(g[0].id) % opts1.length;
      if (pick === prevSingleSlot) pick = (pick + 1 + (seedOf(g[0].id + "x") % 2)) % opts1.length;
      prevSingleSlot = pick;
      xs = [mobile ? 0.5 : opts1[pick]];
    } else {
      prevSingleSlot = -1;
      xs = mobile ? g.map(() => 0.5) : SLOTS[n];
    }
    const cluster: Cluster = {
      id: `cl-${g[0].id}`,
      index,
      year: g[0].sortKey,
      lastYear: g[g.length - 1].sortKey,
      y,
      height: clusterHeight(n, mobile),
      events: g.map((event, i) => ({
        event,
        x: xs[i],
        dy: mobile ? i * objH : STAGGER_PATTERN[i] ?? 0,
        bar: null,
      })),
    };
    clusters.push(cluster);
    for (const pe of cluster.events) {
      eventY.set(pe.event.id, y + pe.dy);
      clusterOfEvent.set(pe.event.id, cluster);
    }
  });

  // 4. Batang durasi dan jalurnya (lane) di talang kiri.
  const bars: { event: TimelineEvent; bar: Bar }[] = [];
  const laneEnds: number[] = [];
  for (const c of clusters) {
    for (const pe of c.events) {
      const ev = pe.event;
      if (ev.endKey === undefined || ev.endKey <= ev.sortKey) continue;
      const y0 = scale.yearToY(ev.sortKey);
      const y1 = scale.yearToY(ev.endKey);
      if (y1 - y0 < MIN_BAR_PX) continue;
      let lane = laneEnds.findIndex((end) => end < y0 - 40);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(y1);
      } else laneEnds[lane] = y1;
      pe.bar = { y0, y1, lane };
      bars.push({ event: ev, bar: pe.bar });
    }
  }

  // 5. Bentangan kosong: celah > 1,5 layar diberi keterangan hitungan, satu per ~3 layar (maks 4).
  const notes: GapNote[] = [];
  const kinds: GapNoteKind[] = ["remaining", "distance", "screen"];
  let k = 0;
  for (let i = 0; i < clusters.length; i++) {
    const cur = clusters[i];
    const next = clusters[i + 1];
    if (!next) break;
    const from = cur.y + cur.height;
    const gap = next.y - from;
    if (gap <= viewport * 1.5) continue;
    const count = Math.min(4, Math.max(1, Math.floor(gap / (viewport * 3))));
    for (let j = 0; j < count; j++) {
      const y = from + (gap * (j + 0.5)) / count;
      notes.push({ id: `gap-${cur.id}-${j}`, y, kind: kinds[k++ % kinds.length], nextClusterId: next.id, nextYear: next.year });
    }
  }
  // celah sebelum klaster pertama (dari 1,65 juta tahun lalu)
  if (clusters[0] && clusters[0].y > viewport * 1.5) {
    notes.unshift({ id: "gap-start", y: clusters[0].y / 2, kind: "remaining", nextClusterId: clusters[0].id, nextYear: clusters[0].year });
  }

  // 6. Garis skala lokal: tanda tiap satuan bulat, label tiap tanda ke-5.
  const ticks: Tick[] = [];
  for (const s of SEGMENTS) {
    for (const yr of tickYears(s)) {
      const unit = yr < -10_000 ? END_YEAR - yr : yr < 1 ? 1 - yr : yr;
      ticks.push({ year: yr, y: scale.yearToY(yr), major: Math.round(unit / s.tick) % 5 === 0 });
    }
  }

  const segmentMarks: SegmentMark[] = SEGMENTS.slice(1).map((segment) => {
    const y = scale.yearToY(segment.from);
    return { segment, y, labelY: clearLabelY(y, clusters) };
  });

  // 7. Jejak tingkat 3 dan histogram kepadatan.
  const traceLayout = layoutTraces(traces, (yr) => scale.yearToY(yr), mobile);
  const points = [
    ...clusters.flatMap((c) => c.events.map((pe) => ({ y: c.y + pe.dy, weight: 3 }))),
    ...traces.map((t) => ({ y: scale.yearToY(t.year), weight: 1 })),
  ];
  const density = densityBins(points, scale.total, DENSITY_BINS);

  return {
    mobile,
    scale,
    traces: traceLayout,
    density,
    clusters,
    notes,
    ticks,
    segmentMarks,
    bars,
    laneCount: laneEnds.length,
    total: scale.total,
    objectHeight: objH,
    eventY,
    clusterOfEvent,
  };
}

/** Klaster yang sedang "aktif": garis acuan berada di dalam rentang tingginya. */
export function clusterAtY(layout: TimelineLayout, y: number): Cluster | null {
  let lo = 0;
  let hi = layout.clusters.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (layout.clusters[mid].y <= y) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (found < 0) return null;
  const c = layout.clusters[found];
  return y <= c.y + c.height ? c : null;
}

/** Klaster berikutnya setelah posisi y (untuk tombol lompat). */
export function nextClusterAfter(layout: TimelineLayout, y: number): Cluster | null {
  return layout.clusters.find((c) => c.y > y + 4) ?? null;
}

/** Suasana masa (label, bukan bab): era peristiwa terakhir yang sudah dilewati. */
export function eraAtYear(events: readonly TimelineEvent[], year: number): EraId {
  let era: EraId = events[0]?.era ?? "prasejarah";
  for (const ev of events) {
    if (ev.sortKey <= year) era = ev.era;
    else break;
  }
  return era;
}
