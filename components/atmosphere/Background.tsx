"use client";

import { useEffect, useMemo, useRef } from "react";
import { createStore } from "zustand/vanilla";
import { createAtmosphere, LIGHT_THRESHOLD, MID_RANGE } from "@/lib/atmosphere";
import type { TimelineLayout } from "@/lib/layout";
import { scrollStore } from "@/lib/store";

/** Warna latar saat ini, untuk elemen lain yang harus menyatu dengan latar (scrim penghitung). */
export const atmosphereStore = createStore<{ top: string; bottom: string }>(() => ({ top: "#0b0806", bottom: "#17110b" }));

const HYSTERESIS = 0.02;

/**
 * Latar kontinu: gradien atas-bawah yang berubah halus mengikuti tahun (bukan per bab).
 * Hanya ditulis ulang saat warna hasil kuantisasi berubah, sehingga tidak melukis ulang per frame.
 * Juga menyetel html[data-tone] (teks terang/gelap) dan html[data-plate] (alas keterangan di
 * latar abu-abu tengah) agar keterangan tetap terbaca.
 */
export function Background({ layout }: { layout: TimelineLayout }) {
  const el = useRef<HTMLDivElement>(null);
  const at = useMemo(() => createAtmosphere(layout.scale), [layout]);

  useEffect(() => {
    const root = document.documentElement;
    let lastKey = "";
    let tone: "dark" | "light" = "dark";
    let plate = "off";
    let lastPaint = 0;
    const apply = () => {
      const { y, velocity } = scrollStore.getState();
      const now = performance.now();
      // saat menggulir cepat, lukis ulang latar paling sering 10 kali per detik (perubahan warnanya
      // per frame sangat kecil); saat pelan atau berhenti, langsung diperbarui
      if (Math.abs(velocity) > 1500 && now - lastPaint < 100) return;
      const a = at(y);
      const key = a.top + a.bottom;
      if (key !== lastKey && el.current) {
        lastPaint = now;
        el.current.style.background = `linear-gradient(180deg, ${a.top} 0%, ${a.bottom} 100%)`;
        atmosphereStore.setState({ top: a.top, bottom: a.bottom });
        // variabel --bg-* TIDAK ditulis ke elemen akar (memaksa hitung ulang gaya seluruh dokumen);
        // elemen yang memakainya berlangganan atmosphereStore lewat usePaletteVars
        lastKey = key;
      }
      const nextTone = tone === "dark" ? (a.luminance > LIGHT_THRESHOLD + HYSTERESIS ? "light" : "dark") : a.luminance < LIGHT_THRESHOLD - HYSTERESIS ? "dark" : "light";
      if (nextTone !== tone) {
        tone = nextTone;
        root.dataset.tone = tone;
      }
      const nextPlate = a.luminance > MID_RANGE[0] && a.luminance < MID_RANGE[1] ? "on" : "off";
      if (nextPlate !== plate) {
        plate = nextPlate;
        root.dataset.plate = plate;
      }
    };
    apply();
    const unsub = scrollStore.subscribe(apply);
    return () => {
      unsub();
      delete root.dataset.tone;
      delete root.dataset.plate;
    };
  }, [at]);

  return <div ref={el} className="pointer-events-none fixed inset-0 -z-20" aria-hidden style={{ background: "linear-gradient(180deg, #0b0806, #17110b)" }} />;
}

/**
 * Menyalin warna latar saat ini ke variabel --bg-top dan --bg-bottom pada satu elemen saja. Variabel di
 * elemen akar akan memaksa hitung ulang gaya seluruh dokumen pada tiap perubahan warna.
 */
export function usePaletteVars<T extends HTMLElement>(ref: React.RefObject<T | null>): void {
  useEffect(() => {
    const write = () => {
      const el = ref.current;
      if (!el) return;
      const { top, bottom } = atmosphereStore.getState();
      el.style.setProperty("--bg-top", top);
      el.style.setProperty("--bg-bottom", bottom);
    };
    write();
    return atmosphereStore.subscribe(write);
  }, [ref]);
}
