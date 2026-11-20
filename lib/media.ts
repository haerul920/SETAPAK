import rawMedia from "@/data/media.json";
import type { TimelineEvent } from "@/data";
import type { Language } from "./i18n";

export type MediaRole = "hero" | "gallery" | "then" | "now" | "hotspot-base" | "texture" | "audio";

export interface MediaEntry {
  id: string;
  target: string;
  role: MediaRole;
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
  /** WebP berlatar transparan (scripts/cutout.py), bila lolos pemeriksaan visual */
  cutout?: string;
  /** ukuran yang tersedia; bawaan 640, 1280, 1920 (foto jejak tingkat 3 hanya 640 dan 1280) */
  sizes?: number[];
}

export const media: MediaEntry[] = rawMedia as MediaEntry[];
export const images: MediaEntry[] = media.filter((m) => m.kind === "image");
export const audios: MediaEntry[] = media.filter((m) => m.kind === "audio");

export const MEDIA_WIDTHS = [640, 1280, 1920] as const;

export function mediaById(id: string): MediaEntry | undefined {
  return media.find((m) => m.id === id);
}

export function imagesFor(target: string, roles?: MediaRole[]): MediaEntry[] {
  return images.filter((m) => m.target === target && (!roles || roles.includes(m.role)));
}

/** Semua foto situs untuk galeri (urutan: hero, now, gallery, then, texture). */
export function galleryFor(siteSlug: string): MediaEntry[] {
  const order: MediaRole[] = ["hero", "now", "gallery", "then", "texture", "hotspot-base"];
  return order.flatMap((r) => imagesFor(siteSlug, [r]));
}

/** Pasangan foto arsip dan masa kini untuk slider Dulu dan Kini. */
export function thenNowPair(siteSlug: string): { then: MediaEntry; now: MediaEntry } | null {
  const now = imagesFor(siteSlug, ["now"])[0];
  const then = imagesFor(siteSlug, ["then"])[0];
  if (!then || !now) return null;
  return { then, now };
}

/** Foto berlatar transparan pertama untuk situs (objek bangunan). */
export function cutoutFor(siteSlug: string): MediaEntry | undefined {
  return images.find((m) => m.target === siteSlug && m.cutout);
}

/**
 * Visual utama objek peristiwa. Urutan: aset khusus peristiwa, foto arsip untuk peristiwa
 * 1700 sampai 1944 bertipe ditemukan/diteliti/dipugar, cutout situs, lalu bergiliran di galeri
 * situs supaya kemunculan situs yang sama tidak memakai foto yang sama berulang.
 */
export function visualForEvent(event: TimelineEvent, indexInSite: number): { media: MediaEntry; mode: "cutout" | "archive" | "photo" } | null {
  const own = images.find((m) => m.target === event.id);
  if (own) return { media: own, mode: own.role === "then" ? "archive" : "photo" };
  if (!event.siteSlug) return null;
  const archival = event.sortKey >= 1700 && event.sortKey < 1945 ? imagesFor(event.siteSlug, ["then"]) : [];
  if (archival.length && ["ditemukan", "dipugar", "diteliti"].includes(event.type)) {
    return { media: archival[indexInSite % archival.length], mode: "archive" };
  }
  const cut = cutoutFor(event.siteSlug);
  if (cut && indexInSite % 2 === 0) return { media: cut, mode: "cutout" };
  const pool = [...imagesFor(event.siteSlug, ["hero"]), ...imagesFor(event.siteSlug, ["gallery"]), ...imagesFor(event.siteSlug, ["now"])];
  if (!pool.length) return cut ? { media: cut, mode: "cutout" } : null;
  return { media: pool[indexInSite % pool.length], mode: "photo" };
}

export function widthsOf(m: MediaEntry): readonly number[] {
  return m.sizes ?? MEDIA_WIDTHS;
}

export function srcFor(m: MediaEntry, width: number, ext: "webp" | "avif" = "webp"): string {
  const list = widthsOf(m);
  const w = list.find((s) => s >= width) ?? list[list.length - 1];
  return `${m.src}-${w}.${ext}`;
}

export function srcSetFor(m: MediaEntry, ext: "webp" | "avif"): string {
  return widthsOf(m)
    .filter((w) => w <= Math.max(640, m.width) || w === 640)
    .map((w) => `${m.src}-${w}.${ext} ${Math.min(w, m.width)}w`)
    .join(", ");
}

export function altFor(m: MediaEntry, _lang?: Language): string {
  return m.alt;
}

export function shortCredit(m: MediaEntry): string {
  const author = m.author.length > 48 ? `${m.author.slice(0, 46)}…` : m.author;
  return `${author} · ${m.license} · Wikimedia Commons`;
}
