"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { altFor, srcFor, type MediaEntry } from "@/lib/media";
import { useCopy } from "@/lib/useCopy";

/** Galeri foto berkredit (gulir horizontal, snap), setiap foto dengan pembuat dan lisensi. */
export function Gallery({ items }: { items: MediaEntry[] }) {
  const { t, lang } = useCopy();
  const strip = useRef<HTMLUListElement>(null);
  if (!items.length) return null;
  const scrollBy = (dir: number) => strip.current?.scrollBy({ left: dir * strip.current.clientWidth * 0.85, behavior: "smooth" });
  return (
    <div className="relative">
      <ul ref={strip} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]" aria-label={t.detail.gallery}>
        {items.map((m) => (
          <li key={m.id} className="w-[82%] shrink-0 snap-start">
            <figure>
              <div className="aspect-[4/3] overflow-hidden rounded-xl bg-black/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={srcFor(m, 1280)}
                  alt={altFor(m, lang)}
                  loading="lazy"
                  className={m.role === "then" ? "h-full w-full object-cover sepia-[0.3]" : "h-full w-full object-cover"}
                  style={{ objectPosition: m.focus }}
                />
              </div>
              <figcaption className="mt-1.5 space-y-0.5 text-xs">
                <span className="block opacity-85">{altFor(m, lang)}</span>
                <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="block font-mono text-[10px] opacity-70 hover:text-[var(--accent)]">
                  {m.author} · {m.license}
                  {m.year ? ` · ${m.year}` : ""} · Wikimedia Commons
                </a>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
      {items.length > 1 && (
        <div className="mt-1 flex justify-end gap-1">
          <button type="button" onClick={() => scrollBy(-1)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-current/25" aria-label={t.detail.prevPhoto}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" onClick={() => scrollBy(1)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-current/25" aria-label={t.detail.nextPhoto}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
