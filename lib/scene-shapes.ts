/**
 * Siluet pemandangan bertingkat (docs/BACKGROUND.md, lapisan 2). Setiap masa punya tiga bidang
 * (jauh, tengah, dekat), masing-masing satu path SVG di kotak 1600 x 900 yang dapat disusun
 * berulang secara mulus (garis punggung memakai gelombang berperiode tepat 1600). Bentuk generik,
 * bukan replika bangunan tertentu.
 */
import type { SceneEra } from "./background";

export const TILE_W = 1600;
export const TILE_H = 900;

export interface ScenePlanes {
  far: string;
  mid: string;
  near: string;
}

/* ---- utilitas ---- */

const f = (n: number): string => (Math.round(n * 10) / 10).toString();

/** Pembangkit acak mulberry32, deterministik per seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Pt = [number, number];

function poly(pts: Pt[]): string {
  return `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L")}Z`;
}

function rect(x: number, y: number, w: number, h: number): string {
  return poly([
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ]);
}

function circle(cx: number, cy: number, r: number): string {
  return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
}

function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;
}

/** Garis punggung periodik: jumlah gelombang berfrekuensi bulat, sehingga y(0) = y(1600). */
export function ridge(seed: number, base: number, amp: number, opts: { steps?: number; quantize?: number; octaves?: number[] } = {}): string {
  const r = rng(seed);
  const ks = opts.octaves ?? [1, 2, 3, 5, 8];
  const comps = ks.map((k, i) => ({ k, a: (1 / (i + 1.3)) * (0.6 + r() * 0.8), p: r() * Math.PI * 2 }));
  const norm = comps.reduce((s, c) => s + c.a, 0);
  const step = 20;
  const pts: Pt[] = [];
  for (let x = 0; x <= TILE_W; x += step) {
    let v = comps.reduce((s, c) => s + c.a * Math.sin((2 * Math.PI * c.k * x) / TILE_W + c.p), 0) / norm;
    v = 0.5 + 0.5 * v;
    if (opts.quantize) v = Math.round(v * opts.quantize) / opts.quantize;
    pts.push([x, base - amp * v]);
  }
  // titik awal dan akhir identik (periodik), lalu tutup ke dasar
  pts[pts.length - 1] = [TILE_W, pts[0][1]];
  return poly([[0, TILE_H], ...pts, [TILE_W, TILE_H]]);
}

/** Dasar rata dari y ke bawah. */
function ground(y: number): string {
  return rect(0, y, TILE_W, TILE_H - y);
}

/** Gunung berbentuk kerucut dengan bahu cekung dan kawah kecil. */
function cone(cx: number, baseY: number, w: number, h: number, notch = 14): string {
  return `M${f(cx - w / 2)} ${f(baseY)}Q${f(cx - w * 0.16)} ${f(baseY - h * 0.82)} ${f(cx - notch)} ${f(baseY - h)}L${f(cx + notch)} ${f(baseY - h)}Q${f(cx + w * 0.16)} ${f(baseY - h * 0.82)} ${f(cx + w / 2)} ${f(baseY)}Z`;
}

/** Tebing karst: pilar bulat menjulang. */
function karst(cx: number, baseY: number, w: number, h: number): string {
  const r = w / 2;
  return `M${f(cx - r)} ${f(baseY)}L${f(cx - r * 0.86)} ${f(baseY - h + r)}Q${f(cx - r * 0.86)} ${f(baseY - h)} ${f(cx)} ${f(baseY - h)}Q${f(cx + r * 0.86)} ${f(baseY - h)} ${f(cx + r * 0.86)} ${f(baseY - h + r)}L${f(cx + r)} ${f(baseY)}Z`;
}

/** Stalaktit menggantung dari tepi atas. */
function stalactite(cx: number, w: number, h: number): string {
  return poly([
    [cx - w / 2, 0],
    [cx + w / 2, 0],
    [cx + w * 0.12, h * 0.8],
    [cx, h],
    [cx - w * 0.12, h * 0.78],
  ]);
}

/** Candi bergaya generik: susunan trapesium dan puncak runcing. */
function stepped(cx: number, baseY: number, w: number, levels: number, levelH: number): string {
  let d = "";
  for (let i = 0; i < levels; i++) {
    const lw = w * (1 - i * (0.7 / levels));
    d += rect(cx - lw / 2, baseY - (i + 1) * levelH, lw, levelH + 1);
  }
  const tw = w * (1 - levels * (0.7 / levels));
  d += poly([
    [cx - tw / 2, baseY - levels * levelH],
    [cx + tw / 2, baseY - levels * levelH],
    [cx, baseY - levels * levelH - levelH * 2.6],
  ]);
  return d;
}

/** Atap tumpang bertingkat dengan tepi melebar. */
function tumpang(cx: number, baseY: number, w: number, tiers: number, tierH: number): string {
  let d = "";
  for (let i = 0; i < tiers; i++) {
    const tw = w * (1 - i * 0.26);
    const y = baseY - i * tierH;
    d += poly([
      [cx - tw / 2 - 18, y],
      [cx + tw / 2 + 18, y],
      [cx + tw * 0.34, y - tierH],
      [cx - tw * 0.34, y - tierH],
    ]);
  }
  const top = baseY - tiers * tierH;
  d += poly([
    [cx - 6, top],
    [cx + 6, top],
    [cx, top - tierH * 1.4],
  ]);
  d += rect(cx - w * 0.34, baseY, w * 0.68, 70);
  return d;
}

/** Gapura candi bentar: dua sisi bertangga dengan celah di tengah. */
function gapura(cx: number, baseY: number, w: number, h: number, gap: number): string {
  const side = (dir: 1 | -1): string => {
    const x0 = cx + dir * (gap / 2);
    const x1 = cx + dir * (gap / 2 + w);
    const at = (k: number): number => x1 - dir * w * k;
    return poly([
      [x0, baseY],
      [x1, baseY],
      [x1, baseY - h * 0.38],
      [at(0.16), baseY - h * 0.38],
      [at(0.16), baseY - h * 0.68],
      [at(0.4), baseY - h * 0.68],
      [at(0.4), baseY - h],
      [x0, baseY - h],
    ]);
  };
  return side(1) + side(-1);
}

/** Pohon beringin: batang besar, tajuk lebar, akar gantung. */
function banyan(cx: number, baseY: number, s: number): string {
  let d = poly([
    [cx - 26 * s, baseY],
    [cx - 14 * s, baseY - 120 * s],
    [cx + 14 * s, baseY - 120 * s],
    [cx + 26 * s, baseY],
  ]);
  d += ellipse(cx, baseY - 190 * s, 150 * s, 78 * s);
  d += ellipse(cx - 100 * s, baseY - 150 * s, 80 * s, 52 * s);
  d += ellipse(cx + 104 * s, baseY - 152 * s, 84 * s, 54 * s);
  for (const dx of [-90, -50, 40, 84]) d += rect(cx + dx * s, baseY - 140 * s, 4 * s, 112 * s);
  return d;
}

/** Pohon kelapa: batang melengkung dan pelepah. */
function palm(cx: number, baseY: number, h: number, lean: number): string {
  const topX = cx + lean;
  const topY = baseY - h;
  let d = `M${f(cx - 7)} ${f(baseY)}Q${f(cx + lean * 0.2)} ${f(baseY - h * 0.55)} ${f(topX - 4)} ${f(topY)}L${f(topX + 4)} ${f(topY)}Q${f(cx + lean * 0.3 + 6)} ${f(baseY - h * 0.5)} ${f(cx + 7)} ${f(baseY)}Z`;
  const fronds = 7;
  for (let i = 0; i < fronds; i++) {
    const a = Math.PI * (0.05 + (0.9 * i) / (fronds - 1));
    const len = 74 + (i % 2) * 14;
    const ex = topX - Math.cos(a) * len;
    const ey = topY - Math.sin(a) * len * 0.55 + 24;
    d += `M${f(topX)} ${f(topY)}Q${f((topX + ex) / 2)} ${f(topY - 30 - (i % 2) * 8)} ${f(ex)} ${f(ey)}Q${f((topX + ex) / 2)} ${f(topY - 18)} ${f(topX)} ${f(topY + 4)}Z`;
  }
  return d;
}

/** Bilah daun atau pakis. */
function blade(x: number, baseY: number, h: number, bend: number, wid = 10): string {
  return `M${f(x)} ${f(baseY)}Q${f(x + bend * 0.4)} ${f(baseY - h * 0.55)} ${f(x + bend)} ${f(baseY - h)}Q${f(x + bend * 0.7 + wid)} ${f(baseY - h * 0.5)} ${f(x + wid)} ${f(baseY)}Z`;
}

/** Perahu pinisi: lambung, tiang, dan layar segitiga. */
function pinisi(cx: number, baseY: number, s: number): string {
  let d = poly([
    [cx - 120 * s, baseY - 22 * s],
    [cx + 130 * s, baseY - 22 * s],
    [cx + 96 * s, baseY + 8 * s],
    [cx - 92 * s, baseY + 8 * s],
  ]);
  d += rect(cx - 8 * s, baseY - 150 * s, 5 * s, 130 * s);
  d += rect(cx + 52 * s, baseY - 120 * s, 4 * s, 100 * s);
  d += poly([
    [cx - 4 * s, baseY - 148 * s],
    [cx - 4 * s, baseY - 30 * s],
    [cx - 96 * s, baseY - 30 * s],
  ]);
  d += poly([
    [cx + 6 * s, baseY - 140 * s],
    [cx + 6 * s, baseY - 30 * s],
    [cx + 50 * s, baseY - 30 * s],
  ]);
  d += poly([
    [cx + 58 * s, baseY - 118 * s],
    [cx + 58 * s, baseY - 30 * s],
    [cx + 112 * s, baseY - 30 * s],
  ]);
  return d;
}

/** Rumah kolonial beratap pelana dan cerobong. */
function house(x: number, baseY: number, w: number, h: number, chimney: boolean): string {
  let d = rect(x, baseY - h, w, h + 1);
  d += poly([
    [x - 10, baseY - h],
    [x + w + 10, baseY - h],
    [x + w / 2, baseY - h - w * 0.28],
  ]);
  if (chimney) d += rect(x + w * 0.7, baseY - h - w * 0.36, 14, w * 0.3);
  return d;
}

/** Cerobong tambang tinggi. */
function stack(x: number, baseY: number, h: number): string {
  return poly([
    [x - 12, baseY],
    [x - 7, baseY - h],
    [x + 7, baseY - h],
    [x + 12, baseY],
  ]);
}

/** Pagar besi: tiang tegak dan palang atas. */
function fence(x0: number, x1: number, baseY: number, h: number): string {
  let d = rect(x0, baseY - h * 0.82, x1 - x0, 5) + rect(x0, baseY - h * 0.3, x1 - x0, 4);
  for (let x = x0; x <= x1; x += 26) d += poly([[x, baseY], [x + 5, baseY], [x + 5, baseY - h], [x + 2.5, baseY - h - 9], [x, baseY - h]]);
  return d;
}

/** Tiang lampu jalan. */
function lamp(x: number, baseY: number, h: number): string {
  return rect(x, baseY - h, 6, h) + poly([[x - 14, baseY - h], [x + 20, baseY - h], [x + 14, baseY - h - 26], [x - 8, baseY - h - 26]]) + rect(x - 4, baseY - h - 34, 14, 8);
}

/** Kawat listrik yang menggantung antara dua titik. */
function wire(x0: number, y0: number, x1: number, y1: number, sag: number): string {
  const n = 14;
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + sag * 4 * t * (1 - t);
    top.push([x, y]);
    bot.push([x, y + 3]);
  }
  return poly([...top, ...bot.reverse()]);
}

/** Blok gedung tahun 1940-an dengan menara air dan antena. */
function skyline(seed: number, baseY: number, from: number, to: number): string {
  const r = rng(seed);
  let d = "";
  let x = from;
  while (x < to - 60) {
    const w = 60 + r() * 80;
    const h = 90 + r() * 190;
    d += rect(x, baseY - h, w, h + 1);
    if (r() > 0.7) d += rect(x + w / 2 - 2, baseY - h - 40, 4, 40);
    if (r() > 0.82) d += rect(x + 10, baseY - h - 30, w - 20, 30) + poly([[x + 8, baseY - h - 30], [x + w - 8, baseY - h - 30], [x + w / 2, baseY - h - 56]]);
    x += w + 6 + r() * 14;
  }
  return d;
}

/** Gedung modern dengan mahkota bertingkat. */
function tower(x: number, baseY: number, w: number, h: number, crown: boolean): string {
  let d = rect(x, baseY - h, w, h + 1);
  if (crown) d += rect(x + w * 0.18, baseY - h - 28, w * 0.64, 28) + rect(x + w * 0.4, baseY - h - 56, w * 0.2, 28);
  return d;
}

/** Tugu menjulang generik (bukan replika monumen tertentu). */
function obelisk(cx: number, baseY: number, w: number, h: number): string {
  return rect(cx - w * 1.6, baseY - 18, w * 3.2, 18) + poly([[cx - w / 2, baseY - 18], [cx + w / 2, baseY - 18], [cx + w * 0.2, baseY - h], [cx - w * 0.2, baseY - h]]) + poly([[cx - w * 0.2, baseY - h], [cx + w * 0.2, baseY - h], [cx, baseY - h - w * 1.2]]);
}

/** Bendera sederhana di tiang. */
function flag(x: number, baseY: number, h: number, w: number): string {
  const top = baseY - h;
  return (
    rect(x, top, 5, h) +
    `M${f(x + 5)} ${f(top + 4)}C${f(x + w * 0.3)} ${f(top - 6)} ${f(x + w * 0.6)} ${f(top + 14)} ${f(x + w)} ${f(top + 4)}L${f(x + w)} ${f(top + 36)}C${f(x + w * 0.6)} ${f(top + 46)} ${f(x + w * 0.3)} ${f(top + 26)} ${f(x + 5)} ${f(top + 36)}Z`
  );
}

/** Bunga: kelopak lingkaran dan tangkai. */
function flower(x: number, baseY: number, h: number, r: number): string {
  let d = rect(x - 2, baseY - h, 4, h);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    d += circle(x + Math.cos(a) * r, baseY - h + Math.sin(a) * r, r * 0.8);
  }
  return d + circle(x, baseY - h, r * 0.7);
}

/* ---- rakitan per masa ---- */

function scatter<T>(seed: number, n: number, from: number, to: number, make: (x: number, r: () => number) => T): T[] {
  const r = rng(seed);
  const out: T[] = [];
  const span = (to - from) / n;
  for (let i = 0; i < n; i++) out.push(make(from + span * (i + 0.2 + r() * 0.6), r));
  return out;
}

export function scenePlanes(era: SceneEra): ScenePlanes {
  const B = TILE_H;
  switch (era) {
    case "purba":
      return {
        far: ridge(11, B - 330, 120),
        mid: ridge(12, B - 210, 150, { quantize: 5, octaves: [1, 2, 4] }) + rect(0, B - 80, TILE_W, 80),
        near: ground(B - 70) + scatter(13, 12, 40, 1560, (x, r) => ellipse(x, B - 70, 20 + r() * 40, 10 + r() * 16)).join("") + scatter(14, 6, 80, 1500, (x, r) => blade(x, B - 66, 60 + r() * 50, (r() - 0.5) * 60, 8)).join(""),
      };
    case "seni-cadas":
      return {
        far: ground(B - 120) + scatter(21, 7, 90, 1500, (x, r) => karst(x, B - 120, 120 + r() * 80, 260 + r() * 190)).join(""),
        mid: ridge(22, B - 150, 90, { octaves: [1, 3, 6] }) + rect(0, 0, 150, B) + rect(TILE_W - 150, 0, 150, B) + `M150 0L${TILE_W - 150} 0L${TILE_W - 150} 130Q${TILE_W / 2} 30 150 130Z`,
        near: scatter(23, 12, 40, 1560, (x, r) => stalactite(x, 40 + r() * 60, 70 + r() * 130)).join("") + ground(B - 40) + scatter(24, 5, 100, 1500, (x, r) => poly([[x - 26, B - 40], [x + 26, B - 40], [x + 6, B - 40 - 50 - r() * 50], [x - 6, B - 40 - 36 - r() * 30]])).join(""),
      };
    case "senyap":
      return {
        far: ground(B - 160) + cone(420, B - 160, 560, 240, 22) + cone(1180, B - 160, 620, 280, 26),
        mid: ground(B - 110) + scatter(31, 16, 20, 1580, (x, r) => circle(x, B - 120 - r() * 40, 60 + r() * 50)).join(""),
        near: ground(B - 60) + scatter(32, 14, 20, 1580, (x, r) => blade(x, B - 56, 110 + r() * 120, (r() - 0.5) * 110, 12)).join("") + scatter(33, 6, 60, 1540, (x, r) => ellipse(x, B - 56, 60 + r() * 50, 22 + r() * 24)).join(""),
      };
    case "klasik":
      return {
        far: ground(B - 200) + cone(300, B - 200, 520, 260, 18) + cone(820, B - 200, 600, 330, 22) + cone(1340, B - 200, 480, 230, 16),
        mid: ridge(42, B - 170, 40, { octaves: [2, 4] }) + stepped(430, B - 150, 150, 5, 34) + stepped(1090, B - 150, 190, 6, 36) + rect(0, B - 150, TILE_W, 150) + ridge(43, B - 130, 28, { quantize: 3, octaves: [3, 6] }),
        near: ground(B - 60) + palm(220, B - 60, 360, 30) + palm(700, B - 60, 300, -26) + palm(1330, B - 60, 400, 34) + scatter(44, 7, 80, 1520, (x, r) => ellipse(x, B - 60, 34 + r() * 40, 18 + r() * 14)).join(""),
      };
    case "majapahit":
      return {
        far: ridge(51, B - 300, 140, { octaves: [1, 2, 3] }),
        mid: ground(B - 120) + tumpang(420, B - 120, 260, 4, 46) + gapura(1080, B - 120, 150, 190, 90) + tumpang(1420, B - 120, 170, 3, 38),
        near: ground(B - 50) + banyan(260, B - 50, 1.2) + banyan(1100, B - 50, 1.5),
      };
    case "maritim":
      return {
        far: rect(0, B - 250, TILE_W, 250) + ellipse(260, B - 250, 190, 30) + ellipse(1130, B - 250, 240, 40),
        mid: rect(0, B - 140, TILE_W, 140) + pinisi(420, B - 140, 1.2) + pinisi(1120, B - 140, 0.9),
        near: ridge(52, B - 70, 46, { octaves: [4, 6, 9] }) + rect(0, B - 40, TILE_W, 40) + scatter(53, 4, 140, 1460, (x) => poly([[x, B - 70], [x + 6, B - 70], [x + 3 + 60, B - 380], [x + 60, B - 380]])).join(""),
      };
    case "kolonial":
      return {
        far: ridge(61, B - 280, 110, { octaves: [1, 2, 3] }),
        mid: ground(B - 120) + scatter(62, 8, 40, 1500, (x, r) => house(x, B - 120, 100 + r() * 70, 70 + r() * 60, r() > 0.5)).join("") + stack(560, B - 120, 330) + stack(1260, B - 120, 290),
        near: ground(B - 40) + fence(0, TILE_W, B - 40, 90) + scatter(63, 4, 120, 1500, (x) => lamp(x, B - 40, 230)).join(""),
      };
    case "kemerdekaan":
      return {
        far: ridge(71, B - 260, 90, { octaves: [1, 3, 5] }),
        mid: ground(B - 130) + skyline(72, B - 130, 20, TILE_W - 20),
        near: ground(B - 40) + flag(330, B - 40, 360, 150) + wire(0, B - 340, 330, B - 346, 40) + wire(330, B - 346, 900, B - 360, 60) + wire(900, B - 360, TILE_W, B - 340, 40) + rect(880, B - 380, 8, 340),
      };
    case "kini":
    default:
      return {
        far: ridge(81, B - 300, 150, { octaves: [1, 2, 3] }) + cone(1180, B - 190, 540, 300, 20),
        mid: ground(B - 120) + tower(200, B - 120, 110, 260, true) + tower(340, B - 120, 90, 180, false) + obelisk(760, B - 120, 28, 420) + tower(1020, B - 120, 120, 300, true) + tower(1180, B - 120, 80, 200, false) + tower(1300, B - 120, 100, 240, true),
        near: ground(B - 40) + scatter(82, 16, 20, 1580, (x, r) => blade(x, B - 36, 90 + r() * 120, (r() - 0.5) * 90, 11)).join("") + scatter(83, 6, 60, 1540, (x, r) => flower(x, B - 36, 60 + r() * 90, 11 + r() * 5)).join(""),
      };
  }
}
