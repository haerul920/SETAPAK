import { sites, type Site } from "@/data";
import { hexToOklch, oklchToHex } from "./atmosphere";

/**
 * Warna benang per situs (docs/ATMOSPHERE.md). 13 situs inti memakai warna tetap dari v3 supaya
 * tampilan lama tidak berubah. Situs lain mendapat warna deterministik hasil pemilihan titik terjauh
 * di ruang OKLab, sehingga 77 warna sebisa mungkin berbeda satu sama lain dan tetap terbaca di latar
 * gelap maupun terang.
 */
const PINNED: Record<string, string> = {
  sangiran: "#c9a26b",
  "karst-maros-pangkep": "#d9653b",
  liyangan: "#8fbf5a",
  muarajambi: "#c2703d",
  borobudur: "#e7b75f",
  prambanan: "#9b8fe0",
  sambisari: "#5fb3a1",
  kimpulan: "#d488b4",
  trowulan: "#e0824f",
  "somba-opu": "#4fa3c8",
  "fort-rotterdam": "#7fa8e0",
  "istana-maimun": "#d6c24a",
  "rumah-maeda": "#e06363",
};

type Lab = [number, number, number];
const labOf = (hex: string): Lab => {
  const [L, C, H] = hexToOklch(hex);
  const h = (H * Math.PI) / 180;
  return [L, C * Math.cos(h), C * Math.sin(h)];
};
const distance = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Kandidat warna: grid rona x kecerahan x kroma, hanya yang berada di dalam gamut sRGB. */
function candidates(): { hex: string; lab: Lab }[] {
  const out: { hex: string; lab: Lab }[] = [];
  for (let hue = 0; hue < 360; hue += 6) {
    for (const L of [0.64, 0.7, 0.76, 0.82, 0.87]) {
      for (const C of [0.08, 0.12, 0.16]) {
        const hex = oklchToHex([L, C, hue]);
        const back = hexToOklch(hex);
        // tolak yang terpotong gamut (kroma hasil jauh lebih kecil dari yang diminta)
        if (Math.abs(back[1] - C) > 0.012) continue;
        out.push({ hex, lab: labOf(hex) });
      }
    }
  }
  return out;
}

/** Pemilihan titik terjauh (farthest point sampling): tiap situs baru mengambil kandidat yang paling jauh dari warna terpakai. */
function buildColors(slugs: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const used: Lab[] = [];
  for (const slug of slugs) {
    if (PINNED[slug]) {
      out[slug] = PINNED[slug];
      used.push(labOf(PINNED[slug]));
    }
  }
  const pool = candidates();
  const minDist = pool.map((c) => used.reduce((m, u) => Math.min(m, distance(c.lab, u)), Infinity));
  for (const slug of slugs) {
    if (out[slug]) continue;
    let bi = 0;
    for (let i = 1; i < pool.length; i++) if (minDist[i] > minDist[bi]) bi = i;
    out[slug] = pool[bi].hex;
    const chosen = pool[bi].lab;
    for (let i = 0; i < pool.length; i++) minDist[i] = Math.min(minDist[i], distance(pool[i].lab, chosen));
    minDist[bi] = -1;
  }
  return out;
}

export const SITE_COLORS: Record<string, string> = buildColors(sites.map((s) => s.slug));

export const NEUTRAL_COLOR = "#a8916c";

export function siteColor(slug: string | null | undefined): string {
  return (slug && SITE_COLORS[slug]) || NEUTRAL_COLOR;
}

const bySlug = new Map(sites.map((s) => [s.slug, s]));

export function siteBySlug(slug: string | null | undefined): Site | undefined {
  return slug ? bySlug.get(slug) : undefined;
}
