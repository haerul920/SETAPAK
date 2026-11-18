import type { TimelineEvent } from "@/data";

/**
 * Pemetaan peristiwa ke momen istimewa (docs/OBJECTS.md, Momen istimewa). Momen tetap berada di
 * posisi tahunnya; yang berubah hanya visual dan interaksinya.
 */
export type Special =
  | { kind: "cave"; texture: number }
  | { kind: "rise" }
  | { kind: "dig"; depth: number | string; label: string }
  | { kind: "volcano"; depth: number | string }
  | { kind: "scroll" }
  | { kind: "blast" }
  | { kind: "flood" }
  | { kind: "clock" }
  | { kind: "ashSweep" }
  | { kind: "quake" }
  | { kind: "steady" }
  | { kind: "drift" }
  | { kind: "closing" }
  | null;

const CAVE_TEXTURE: Record<string, number> = {
  "ev-karampuang-51200": 1,
  "ev-tedongnge-45500": 2,
  "ev-bulusipong-43900": 3,
};

/** Gempa Yogyakarta 1867 dan 2006: objek berguncang halus di tahunnya masing-masing. */
const QUAKE = new Set(["ev-tugu-1867", "ev-prambanan-2006", "ev-sewu-2006"]);

/** Peristiwa pemicu momen halaman (v4). Rentang y diambil dari posisi peristiwa-peristiwa ini. */
export const MOMENT_EVENTS = {
  tsunami: ["ev-tsunami-baiturrahman", "ev-tsunami-pltd"],
  spice: ["ev-victoria-1575", "ev-victoria-1605", "ev-oranje-1607", "ev-belgica-1611", "ev-banda-1621"],
  seq1945: ["ev-proklamasi-1945", "ev-prok-pegangsaan", "ev-yamato-1945", "ev-semarang-1945", "ev-surabaya-1945", "ev-siak-1945", "ev-gedungsate-1945"],
} as const;

export function specialFor(ev: TimelineEvent): Special {
  if (QUAKE.has(ev.id)) return { kind: "quake" };
  if (ev.id === "ev-tsunami-baiturrahman") return { kind: "steady" };
  if (ev.id === "ev-tsunami-pltd") return { kind: "drift" };
  if (CAVE_TEXTURE[ev.id]) return { kind: "cave", texture: CAVE_TEXTURE[ev.id] };
  if (ev.moment === "BorobudurBuild") return { kind: "rise" };
  if (ev.moment === "DigDown" && ev.meta?.depthMeters !== undefined) {
    if (ev.meta.reverse) return { kind: "dig", depth: ev.meta.depthMeters, label: String(ev.meta.label ?? "") };
    return { kind: "volcano", depth: ev.meta.depthMeters };
  }
  if (ev.id === "ev-bungaya-1667") return { kind: "scroll" };
  if (ev.id === "ev-sombaopu-ledakan") return { kind: "blast" };
  if (ev.id === "ev-sombaopu-jatuh") return { kind: "flood" };
  if (ev.moment === "Proclamation1945") return { kind: "clock" };
  if (ev.id === "ev-borobudur-2010") return { kind: "ashSweep" };
  if (ev.moment === "Constellation") return { kind: "closing" };
  return null;
}

/** Rentang tahun lapisan halaman (bukan objek tunggal) yang ikut momen istimewa. */
export const PAGE_MOMENTS = {
  cave: { from: -52_500, to: -40_500 },
  discovery: { from: 1805, to: 1826 },
} as const;
