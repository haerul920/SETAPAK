"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Flame, Flag, Hammer, Microscope, Search, Sparkles, Stamp, TreePine, Wrench, Mountain } from "lucide-react";
import { TRACE_ICON } from "@/components/scroll/TraceStones";
import type { Category, EventType } from "@/data";

/** Warna kategori pin. Palet bawaan senada SETAPAK; palet bantuan warna memakai Okabe-Ito. */
export const CATEGORY_COLOR: Record<Category, string> = {
  prasejarah: "#c9a26b",
  "seni-cadas": "#d9785b",
  prasasti: "#9b8fd9",
  candi: "#e7b75f",
  islam: "#5fbf9a",
  keraton: "#d46a9a",
  benteng: "#7fa8d9",
  kolonial: "#b8a98a",
  kemerdekaan: "#e0524f",
  lanskap: "#7fc66f",
};

export const CATEGORY_COLOR_CVD: Record<Category, string> = {
  prasejarah: "#E69F00",
  "seni-cadas": "#D55E00",
  prasasti: "#CC79A7",
  candi: "#F0E442",
  islam: "#009E73",
  keraton: "#8B4FA3",
  benteng: "#56B4E9",
  kolonial: "#999999",
  kemerdekaan: "#B0302A",
  lanskap: "#0072B2",
};

/** Bentuk pin per kategori, supaya kategori tetap terbedakan tanpa warna (bantuan warna). */
export type PinShape = "circle" | "square" | "diamond" | "triangle" | "hexagon" | "pentagon" | "star" | "cross" | "octagon" | "drop";

export const CATEGORY_SHAPE: Record<Category, PinShape> = {
  prasejarah: "circle",
  "seni-cadas": "drop",
  prasasti: "square",
  candi: "triangle",
  islam: "hexagon",
  keraton: "star",
  benteng: "pentagon",
  kolonial: "diamond",
  kemerdekaan: "cross",
  lanskap: "octagon",
};

export const SHAPE_CLIP: Record<PinShape, string> = {
  circle: "circle(50% at 50% 50%)",
  square: "inset(8% round 14%)",
  diamond: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
  triangle: "polygon(50% 4%, 98% 92%, 2% 92%)",
  hexagon: "polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0 50%)",
  pentagon: "polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%)",
  star: "polygon(50% 0, 62% 36%, 100% 38%, 70% 60%, 80% 100%, 50% 76%, 20% 100%, 30% 60%, 0 38%, 38% 36%)",
  cross: "polygon(35% 0, 65% 0, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0 65%, 0 35%, 35% 35%)",
  octagon: "polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)",
  drop: "polygon(50% 0, 88% 52%, 78% 88%, 50% 100%, 22% 88%, 12% 52%)",
};

export const EVENT_ICON: Record<EventType, LucideIcon> = {
  dibangun: Hammer,
  digunakan: Flame,
  ditinggalkan: TreePine,
  terkubur: Mountain,
  ditemukan: Search,
  diteliti: Microscope,
  dipugar: Wrench,
  rusak: AlertTriangle,
  ditetapkan: Stamp,
  revitalisasi: Sparkles,
  peristiwa: Flag,
};

export function categoryColor(cat: Category, cvd: boolean): string {
  return (cvd ? CATEGORY_COLOR_CVD : CATEGORY_COLOR)[cat];
}

/** Isi pin: bentuk berwarna kategori dengan ikon kecil di tengah. */
export function PinGlyph({ category, size, cvd, dim }: { category: Category; size: number; cvd: boolean; dim?: boolean }) {
  const Icon = TRACE_ICON[category] ?? TRACE_ICON.lainnya;
  const shape = CATEGORY_SHAPE[category];
  const color = dim ? "#8a8a86" : categoryColor(category, cvd);
  const outline = shape !== "circle";
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} aria-hidden>
      {/* alas gelap sedikit lebih besar sebagai garis tepi agar pin terbaca di atas peta */}
      <span className="absolute inset-0" style={{ background: "rgba(13,11,9,0.88)", clipPath: SHAPE_CLIP[shape] }} />
      <span className="absolute" style={{ inset: 2.5, background: color, clipPath: SHAPE_CLIP[shape], opacity: dim ? 0.7 : 1 }} />
      <Icon className="relative text-[#0d0b09]" style={{ width: size * (outline ? 0.4 : 0.5), height: size * (outline ? 0.4 : 0.5) }} strokeWidth={2.2} />
    </span>
  );
}
