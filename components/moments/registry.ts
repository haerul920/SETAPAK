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
  | { kind: "closing" }
  | null;

const CAVE_TEXTURE: Record<string, number> = {
  "ev-karampuang-51200": 1,
  "ev-tedongnge-45500": 2,
  "ev-bulusipong-43900": 3,
};

export function specialFor(ev: TimelineEvent): Special {
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
