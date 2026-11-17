"use client";

import { memo } from "react";
import type { EventType } from "@/data";

/**
 * Lapisan efek per tipe peristiwa (docs/OBJECTS.md, tabel animasi masuk). Semua gerak membaca
 * variabel CSS --p / --pm yang ditulis useObjectMotion, dan hanya memakai transform, opacity, atau
 * clip-path. Kelas .fx-* didefinisikan di globals.css.
 */
export const TypeEffect = memo(function TypeEffect({ type, depth }: { type: EventType; depth?: string | number }) {
  switch (type) {
    case "dibangun":
      return (
        <div className="fx-layer" aria-hidden>
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="fx-stone" style={{ left: `${12 + i * 12}%`, ["--d" as string]: `${50 + (i % 3) * 30}px`, ["--r" as string]: `${(i % 2 ? 1 : -1) * (40 + i * 9)}deg` }} />
          ))}
          <span className="fx-dust" />
        </div>
      );
    case "digunakan":
      return (
        <div className="fx-layer" aria-hidden>
          <span className="fx-glow" />
          {[0, 1, 2].map((i) => (
            <span key={i} className="fx-smoke" style={{ left: `${38 + i * 10}%`, animationDelay: `${i * 1.6}s` }} />
          ))}
          {[0, 1].map((i) => (
            <svg key={i} className="fx-walker" viewBox="0 0 10 22" style={{ animationDelay: `${-i * 9}s` }}>
              <circle cx="5" cy="3.2" r="2.6" fill="currentColor" />
              <path d="M5 6 L5 14 M5 9 L1.5 12 M5 9 L8.5 12 M5 14 L2.5 21 M5 14 L7.5 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            </svg>
          ))}
        </div>
      );
    case "ditinggalkan":
      return (
        <div className="fx-layer" aria-hidden>
          <span className="fx-desat" />
          <svg className="fx-vines" viewBox="0 0 300 220" preserveAspectRatio="none">
            <path d="M10 220 C20 170 4 140 30 110 C50 88 40 60 60 40" stroke="#4f7a3a" strokeWidth="3" fill="none" />
            <path d="M290 220 C276 180 296 150 268 120 C246 98 262 76 240 52" stroke="#4f7a3a" strokeWidth="3" fill="none" />
            <path d="M150 220 C140 196 166 180 150 160" stroke="#4f7a3a" strokeWidth="2.4" fill="none" />
            {[[30, 110], [60, 40], [268, 120], [240, 52], [16, 160], [284, 170], [150, 160]].map(([x, y], i) => (
              <ellipse key={i} cx={x} cy={y} rx="7" ry="4" transform={`rotate(${i * 40} ${x} ${y})`} fill="#6f9a4a" />
            ))}
          </svg>
        </div>
      );
    case "terkubur":
      return (
        <div className="fx-layer" aria-hidden>
          <span className="fx-ash-cover" />
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} className="fx-ash" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${-(i * 0.43) % 3}s` }} />
          ))}
          {depth !== undefined && <DepthReadout depth={depth} />}
        </div>
      );
    case "ditemukan":
      return (
        <div className="fx-layer" aria-hidden>
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="fx-sparkle" style={{ left: `${20 + ((i * 29) % 62)}%`, top: `${18 + ((i * 41) % 60)}%`, animationDelay: `${i * 0.3}s` }} />
          ))}
        </div>
      );
    case "diteliti":
      return (
        <div className="fx-layer" aria-hidden>
          <svg className="fx-grid" viewBox="0 0 300 220" preserveAspectRatio="none">
            {[75, 150, 225].map((x) => (
              <line key={x} x1={x} y1="0" x2={x} y2="220" stroke="#f3e9d2" strokeWidth="1.2" strokeDasharray="4 3" />
            ))}
            {[73, 146].map((y) => (
              <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#f3e9d2" strokeWidth="1.2" strokeDasharray="4 3" />
            ))}
            {["A1", "B1", "C1", "A2", "B2"].map((l, i) => (
              <text key={l} x={6 + (i % 3) * 75} y={14 + Math.floor(i / 3) * 73} fontSize="10" fontFamily="monospace" fill="#f3e9d2">
                {l}
              </text>
            ))}
          </svg>
          <span className="fx-note" />
        </div>
      );
    case "dipugar":
      return (
        <div className="fx-layer" aria-hidden>
          <svg className="fx-scaffold" viewBox="0 0 300 220" preserveAspectRatio="none">
            {[30, 90, 150, 210, 270].map((x) => (
              <line key={x} x1={x} y1="20" x2={x} y2="220" stroke="#c9a66b" strokeWidth="2.2" />
            ))}
            {[60, 120, 180].map((y) => (
              <line key={y} x1="20" y1={y} x2="280" y2={y} stroke="#c9a66b" strokeWidth="2" />
            ))}
            <line x1="30" y1="180" x2="90" y2="120" stroke="#c9a66b" strokeWidth="1.6" />
            <line x1="210" y1="120" x2="270" y2="60" stroke="#c9a66b" strokeWidth="1.6" />
          </svg>
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className="fx-lift" style={{ left: `${18 + i * 15}%`, bottom: `${10 + (i % 2) * 14}%`, ["--d" as string]: `${60 + i * 12}px`, ["--r" as string]: `${(i % 2 ? 1 : -1) * 22}deg` }} />
          ))}
        </div>
      );
    case "rusak":
      return (
        <div className="fx-layer" aria-hidden>
          <svg className="fx-cracks" viewBox="0 0 300 220" preserveAspectRatio="none">
            <path d="M150 0 L140 40 L160 70 L135 110 L150 150 L128 220" stroke="#111" strokeWidth="2.4" fill="none" />
            <path d="M140 40 L110 60 M160 70 L196 84 M135 110 L100 128" stroke="#111" strokeWidth="1.6" fill="none" />
          </svg>
          {[0, 1, 2].map((i) => (
            <span key={i} className="fx-fall" style={{ left: `${36 + i * 13}%`, top: `${22 + i * 9}%`, ["--d" as string]: `${70 + i * 30}px` }} />
          ))}
        </div>
      );
    case "ditetapkan":
      return (
        <div className="fx-layer" aria-hidden>
          <svg className="fx-stamp" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#e7b75f" strokeWidth="5" />
            <circle cx="50" cy="50" r="34" fill="none" stroke="#e7b75f" strokeWidth="2" />
            <path d="M32 52 L45 64 L70 37" stroke="#e7b75f" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );
    case "revitalisasi":
      return (
        <div className="fx-layer" aria-hidden>
          <svg className="fx-blueprint" viewBox="0 0 300 220" preserveAspectRatio="none">
            <rect x="8" y="8" width="284" height="204" fill="none" stroke="#7fc4ff" strokeWidth="1.6" strokeDasharray="6 4" />
            <line x1="0" y1="30" x2="300" y2="30" stroke="#7fc4ff" strokeWidth="0.8" />
            <line x1="0" y1="190" x2="300" y2="190" stroke="#7fc4ff" strokeWidth="0.8" />
            <line x1="40" y1="0" x2="40" y2="220" stroke="#7fc4ff" strokeWidth="0.8" />
            <line x1="260" y1="0" x2="260" y2="220" stroke="#7fc4ff" strokeWidth="0.8" />
            <path d="M40 22 L260 22 M40 18 L40 26 M260 18 L260 26" stroke="#7fc4ff" strokeWidth="1" />
          </svg>
        </div>
      );
    default:
      return null;
  }
});

/** Angka kedalaman timbunan dari meta.depthMeters; teksnya diperbarui EventObject mengikuti progres. */
function DepthReadout({ depth }: { depth: string | number }) {
  return (
    <span className="fx-depth font-mono text-[11px]" data-depth={depth}>
      {typeof depth === "number" ? "0 m" : ""}
    </span>
  );
}
