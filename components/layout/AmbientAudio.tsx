"use client";

import { Volume2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sortedEvents, type EraId } from "@/data";
import { eraAtYear } from "@/lib/layout";
import { audios, type MediaEntry } from "@/lib/media";
import { scrollStore, useSetapakStore } from "@/lib/store";
import { useCopy } from "@/lib/useCopy";

const FADE_MS = 1800;

/** Track suasana per masa (docs/ATMOSPHERE.md). Hanya aset berlisensi terbuka dari data/media.json. */
const TRACK_BY_ERA: Record<EraId, string[]> = {
  prasejarah: ["audio-nature", "audio-cave"],
  "seni-cadas": ["audio-cave"],
  klasik: ["audio-gamelan"],
  majapahit: ["audio-gamelan"],
  maritim: ["audio-ocean", "audio-nature"],
  kolonial: ["audio-nature"],
  kemerdekaan: ["audio-gamelan"],
  modern: ["audio-morning", "audio-nature"],
};

function trackFor(era: EraId): MediaEntry | undefined {
  for (const key of TRACK_BY_ERA[era]) {
    const found = audios.filter((a) => a.id.startsWith(key));
    if (found.length) return found[era === "kemerdekaan" ? found.length - 1 : 0];
  }
  return audios[0];
}

/** Default mati. Saat dinyalakan, volume naik perlahan; berganti track dengan cross-fade mengikuti tahun. */
export function AmbientAudio() {
  const { t } = useCopy();
  const pathname = usePathname();
  const sound = useSetapakStore((s) => s.sound);
  const volume = useSetapakStore((s) => s.volume);
  const setVolume = useSetapakStore((s) => s.setVolume);
  const [era, setEra] = useState<EraId>(() => eraAtYear(sortedEvents, scrollStore.getState().year));
  const current = useRef<HTMLAudioElement | null>(null);
  const currentSrc = useRef<string | null>(null);
  const volRef = useRef(volume);

  useEffect(() => scrollStore.subscribe((s) => setEra(eraAtYear(sortedEvents, s.year))), []);

  const track = audios.length ? trackFor(era) : undefined;
  const wanted = sound && track && pathname === "/" ? track.src : null;

  useEffect(() => {
    volRef.current = volume;
    if (current.current) current.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (wanted === currentSrc.current) return;
    const fade = (el: HTMLAudioElement, from: number, to: number, done?: () => void) => {
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / FADE_MS);
        el.volume = Math.max(0, Math.min(1, from + (to - from) * p));
        if (p < 1) requestAnimationFrame(step);
        else done?.();
      };
      requestAnimationFrame(step);
    };
    const old = current.current;
    if (old) {
      fade(old, old.volume, 0, () => {
        old.pause();
        old.src = "";
      });
    }
    current.current = null;
    currentSrc.current = wanted;
    if (!wanted) return;
    const el = new Audio(wanted);
    el.loop = true;
    el.volume = 0;
    el.preload = "auto";
    current.current = el;
    el.play()
      .then(() => fade(el, 0, volRef.current))
      .catch(() => {
        /* autoplay ditolak: tunggu interaksi berikutnya */
      });
  }, [wanted]);

  useEffect(
    () => () => {
      current.current?.pause();
    },
    []
  );

  if (!wanted || !track) return null;

  return (
    <div className="panel-surface fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full px-3 py-2 shadow-xl">
      <Volume2 className="h-4 w-4 text-[var(--accent)]" aria-hidden />
      <label className="sr-only" htmlFor="ambient-volume">
        {t.header.soundOn}
      </label>
      <input
        id="ambient-volume"
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        className="h-1 w-24 accent-[#e7b75f]"
      />
      <a
        href={track.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden max-w-[180px] truncate font-mono text-[10px] opacity-75 hover:text-[var(--accent)] sm:block"
        title={`${track.author} · ${track.license}`}
      >
        {track.author} · {track.license}
      </a>
    </div>
  );
}
