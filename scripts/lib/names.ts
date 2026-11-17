/**
 * Kemiripan nama tempat, dipakai bersama oleh scripts/import-wikidata.ts (dedup terhadap situs
 * kurasi) dan scripts/match-coords.ts (menolak entitas Wikidata yang hanya kebetulan dekat).
 * Kata umum (candi, masjid, gedung, ...) diabaikan supaya yang dibandingkan adalah nama khasnya.
 */
const STOP = new Set([
  "candi", "situs", "masjid", "istana", "benteng", "museum", "gedung", "kawasan", "cagar", "budaya", "nasional",
  "the", "of", "temple", "mosque", "fort", "palace", "kompleks", "makam", "prasasti", "inscription",
]);

export const nameTokens = (s: string): Set<string> =>
  new Set(
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\([^)]*\)/g, " ")
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !STOP.has(t))
  );

/** Sedikitnya 75% token nama yang lebih pendek ada di nama lainnya. */
export function similarNames(a: string, b: string): boolean {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.size || !tb.size) return false;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared > 0 && shared / Math.min(ta.size, tb.size) >= 0.75;
}
