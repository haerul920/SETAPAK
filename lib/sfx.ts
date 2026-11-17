"use client";

import { useSetapakStore } from "./store";

/**
 * Efek suara pendek saat objek masuk (docs/OBJECTS.md bagian Suara), disintesis dengan Web Audio
 * API tanpa file (tidak ada aset pihak ketiga). Volume rendah, hanya jika suara dinyalakan.
 */
export type Sfx = "stone" | "stamp" | "shovel" | "wave" | "crack" | "shimmer" | "tick";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noise(ac: AudioContext, seconds: number): AudioBufferSourceNode {
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  return src;
}

function envelope(ac: AudioContext, peak: number, attack: number, release: number): GainNode {
  const g = ac.createGain();
  const t = ac.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  return g;
}

export function playSfx(kind: Sfx): void {
  const { sound, volume } = useSetapakStore.getState();
  if (!sound) return;
  const ac = audio();
  if (!ac) return;
  const v = 0.18 * volume;
  const out = ac.destination;
  const t = ac.currentTime;

  if (kind === "stone" || kind === "crack" || kind === "shovel") {
    const n = noise(ac, 0.4);
    const f = ac.createBiquadFilter();
    f.type = kind === "shovel" ? "bandpass" : "lowpass";
    f.frequency.value = kind === "stone" ? 600 : kind === "crack" ? 2400 : 1400;
    const g = envelope(ac, v, 0.005, kind === "shovel" ? 0.3 : 0.18);
    n.connect(f).connect(g).connect(out);
    n.start(t);
    n.stop(t + 0.45);
    return;
  }
  if (kind === "stamp" || kind === "tick") {
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(kind === "stamp" ? 140 : 1800, t);
    o.frequency.exponentialRampToValueAtTime(kind === "stamp" ? 50 : 1200, t + 0.12);
    const g = envelope(ac, kind === "stamp" ? v * 1.4 : v * 0.35, 0.003, kind === "stamp" ? 0.22 : 0.04);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.3);
    return;
  }
  if (kind === "wave") {
    const n = noise(ac, 1.6);
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(300, t);
    f.frequency.linearRampToValueAtTime(900, t + 0.8);
    f.frequency.linearRampToValueAtTime(250, t + 1.5);
    const g = envelope(ac, v * 0.8, 0.6, 0.9);
    n.connect(f).connect(g).connect(out);
    n.start(t);
    n.stop(t + 1.6);
    return;
  }
  // shimmer: tiga nada tinggi pendek
  [1320, 1760, 2093].forEach((freq, i) => {
    const o = ac.createOscillator();
    o.type = "triangle";
    o.frequency.value = freq;
    const g = ac.createGain();
    const s = t + i * 0.07;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(v * 0.25, s + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.35);
    o.connect(g).connect(out);
    o.start(s);
    o.stop(s + 0.4);
  });
}
