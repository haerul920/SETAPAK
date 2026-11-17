"use client";

import { useEffect, useRef, type RefObject } from "react";
import { isMotionReduced, scrollStore } from "./store";

export interface MotionOptions {
  /** posisi lintasan objek (px) */
  y: number;
  /** pengali parallax 0,9 sampai 1,1 (1 = tanpa parallax) */
  speed?: number;
  /** ambang progres yang memicu callback sekali per arah (misal stempel mendarat di 0,5) */
  thresholds?: number[];
  onCross?: (threshold: number, forward: boolean) => void;
  /** dipanggil saat progres berubah (untuk teks seperti angka kedalaman) */
  onProgress?: (p: number) => void;
  /** rentang progres khusus (batang durasi): progres 0 di y0, 1 di y1 */
  range?: [number, number];
}

/**
 * Menulis variabel CSS per frame ke elemen objek, tanpa render React:
 *   --p    progres masuk 0..1 (terikat guliran, scrub)
 *   --pm   sin(pi * p), puncak di tengah (perancah muncul lalu hilang)

 * serta transform parallax + kemiringan mengikuti kecepatan gulir (maks 3 derajat) langsung ke
 * elemen .obj-move,
 * dan data-live="1|0" untuk menjeda animasi idle saat objek jauh dari layar.
 * Mode tanpa animasi: p = 1 (keadaan akhir), tanpa parallax dan kemiringan.
 */
export function useObjectMotion<T extends HTMLElement>(ref: RefObject<T | null>, opts: MotionOptions): void {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    let lastP = -1;
    let tilt = 0;
    let live = "";
    let raf = 0;
    let lastTf = "";
    let moverEl: HTMLElement | null = null;
    const apply = () => {
      const el = ref.current;
      if (!el) return;
      const o = optsRef.current;
      const { y, viewport, velocity } = scrollStore.getState();
      const reduced = isMotionReduced();
      let p: number;
      if (o.range) p = (y - o.range[0]) / Math.max(1, o.range[1] - o.range[0]);
      else p = (y - (o.y - viewport * 0.55)) / (viewport * 0.45);
      p = reduced ? 1 : Math.min(1, Math.max(0, p));
      if (Math.abs(p - lastP) > 0.002) {
        if (o.thresholds && o.onCross && lastP >= 0) {
          for (const th of o.thresholds) {
            if (lastP < th && p >= th) o.onCross(th, true);
            else if (lastP >= th && p < th) o.onCross(th, false);
          }
        }
        el.style.setProperty("--p", p.toFixed(3));
        el.style.setProperty("--pm", Math.sin(Math.PI * p).toFixed(3));
        lastP = p;
        o.onProgress?.(p);
      }
      if (!reduced) {
        // parallax dan kemiringan ditulis langsung sebagai transform elemen .obj-move (bukan variabel
        // CSS) supaya tidak memicu hitung ulang style seluruh isi objek setiap frame
        const par = (y - o.y) * ((o.speed ?? 1) - 1);
        const target = Math.max(-3, Math.min(3, velocity / 900));
        tilt += (target - tilt) * 0.12;
        if (Math.abs(tilt) < 0.01) tilt = 0;
        const mover = (moverEl ??= el.querySelector<HTMLElement>(".obj-move"));
        if (mover && Math.abs(y - o.y) < viewport * 1.5) {
          const tf = `translate3d(0, ${par.toFixed(1)}px, 0) rotate(${tilt.toFixed(2)}deg)`;
          if (tf !== lastTf) {
            mover.style.transform = tf;
            lastTf = tf;
          }
        }
        // terus meluruh ke tegak meski guliran berhenti
        if (tilt !== 0 && !raf)
          raf = requestAnimationFrame(() => {
            raf = 0;
            apply();
          });
      }
      const isLive = Math.abs(y - o.y) < viewport * 1.2 ? "1" : "0";
      if (isLive !== live) {
        el.dataset.live = isLive;
        live = isLive;
      }
    };
    apply();
    const unsub = scrollStore.subscribe(apply);
    return () => {
      unsub();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref]);
}
