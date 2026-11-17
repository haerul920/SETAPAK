"use client";

import { useId, useState } from "react";
import { altFor, srcFor, type MediaEntry } from "@/lib/media";
import { useCopy } from "@/lib/useCopy";

/** Slider Dulu dan Kini: foto arsip di atas foto masa kini, garis pembanding bisa digeser. */
export function BeforeAfter({ then, now }: { then: MediaEntry; now: MediaEntry }) {
  const { t, lang } = useCopy();
  const [pos, setPos] = useState(50);
  const id = useId();
  return (
    <figure className="space-y-2">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={srcFor(now, 1280)} alt={altFor(now, lang)} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={srcFor(then, 1280)}
          alt={altFor(then, lang)}
          className="absolute inset-0 h-full w-full object-cover sepia-[0.3]"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90 shadow" style={{ left: `${pos}%` }} aria-hidden>
          <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white font-mono text-xs text-black shadow-lg">⇆</span>
        </div>
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[10px] uppercase text-white">
          {t.media.archive} {then.year ?? ""}
        </span>
        <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 font-mono text-[10px] uppercase text-white">
          {t.media.now} {now.year ?? ""}
        </span>
        <label htmlFor={id} className="sr-only">
          {t.event.thenNow}
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      <figcaption className="font-mono text-[10px] opacity-70">
        {then.author} · {then.license} / {now.author} · {now.license}
      </figcaption>
    </figure>
  );
}
