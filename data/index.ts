/** Titik masuk data SETAPAK. Gunakan modul ini di seluruh aplikasi. */
import { events as coreEvents, sites as coreSites, sources as coreSources, eras } from "./timeline";
import type { Site, TimelineEvent, Source } from "./timeline";
import { extraEvents, extraSites, extraSources, coreSiteCategory, categoryLabels, eraForYear } from "./nusantara";
import type { Category } from "./nusantara";
import coordsOverride from "./coords-override.json";
import coordsManual from "./coords-manual.json";
export { kingdoms } from "./kingdoms";
export type { Kingdom } from "./kingdoms";
export { eras, categoryLabels, eraForYear };
export type { Category };
export type { Era, EraId, EventType, Hotspot, Site, Source, SourceKind, SourceStatus, TimelineEvent } from "./timeline";

export type SiteWithCategory = Site & { category: Category };

export const sources: Source[] = [...coreSources, ...extraSources];

/** Situs dengan koordinat kurasi asli (dipakai script pencocokan koordinat). */
export const sitesRaw: SiteWithCategory[] = [
  ...coreSites.map((s) => ({ ...s, category: coreSiteCategory[s.slug] })),
  ...extraSites,
];

/**
 * Koreksi koordinat dari pencocokan Wikidata/Wikipedia (data/coords-override.json, dihasilkan
 * scripts/match-coords.ts) dan keputusan manual berdasarkan sumber (data/coords-manual.json).
 * Keputusan manual menang atas hasil otomatis. Lihat docs/COORDS_CHECK.md.
 */
type CoordFix = { lat: number; lng: number };
const coordFix: Record<string, CoordFix> = {};
for (const [slug, v] of Object.entries(coordsOverride as Record<string, CoordFix>)) coordFix[slug] = { lat: v.lat, lng: v.lng };
for (const [slug, v] of Object.entries(coordsManual as Record<string, CoordFix | string>)) {
  if (typeof v === "object") coordFix[slug] = { lat: v.lat, lng: v.lng };
}

export const sites: SiteWithCategory[] = sitesRaw.map((s) => (coordFix[s.slug] ? { ...s, coords: { lat: coordFix[s.slug].lat, lng: coordFix[s.slug].lng } } : s));
export const events: TimelineEvent[] = [...coreEvents, ...extraEvents].map((e) => ({ ...e, era: eraForYear(e.sortKey) }));
export const sortedEvents = [...events].sort((a, b) => a.sortKey - b.sortKey);
export const siteBySlug = Object.fromEntries(sites.map((s) => [s.slug, s]));
export const sourceById = Object.fromEntries(sources.map((s) => [s.id, s]));
