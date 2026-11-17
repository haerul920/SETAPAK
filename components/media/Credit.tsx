"use client";

import { Info, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { MediaEntry } from "@/lib/media";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";

interface CreditProps {
  media: MediaEntry;
  variant?: "corner" | "inline";
  align?: "left" | "right";
  className?: string;
}

/** Kredit aset: teks singkat selalu terlihat + tombol "i" untuk detail lisensi. */
export function Credit({ media, variant = "corner", align = "right", className }: CreditProps) {
  const { t } = useCopy();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const author = media.author.length > 38 ? `${media.author.slice(0, 36)}…` : media.author;

  return (
    <div
      ref={ref}
      className={cn(
        variant === "corner" && "absolute bottom-2 z-10 max-w-[calc(100%-1rem)]",
        variant === "corner" && (align === "right" ? "right-2" : "left-2"),
        variant === "inline" && "relative mt-2",
        className
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${t.media.credit}: ${media.author}, ${media.license}`}
        className={cn(
          "flex min-h-[28px] items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] leading-none text-sand-100/90 transition-colors",
          variant === "corner" ? "bg-ink-950/70 hover:bg-ink-950/90" : "bg-ink-800/80 hover:bg-ink-700",
          "focus-visible:outline-2 focus-visible:outline-gold-400"
        )}
      >
        <Info className="h-3.5 w-3.5 shrink-0 text-gold-400" aria-hidden />
        <span className="truncate">
          {author} · {media.license}
        </span>
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t.media.credit}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute bottom-full z-30 mb-2 w-[min(320px,80vw)] rounded-xl border border-sand-500/25 bg-ink-900 p-3.5 text-left text-xs leading-relaxed text-sand-300 shadow-2xl",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gold-400">{t.media.credit}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.close}
              className="-m-1 rounded p-1 text-sand-300 hover:text-sand-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          <p className="break-words text-sand-100">{media.title.replace(/^File:/, "")}</p>
          <p className="mt-1">
            {t.credits.author}: {media.author}
          </p>
          <p>
            {t.media.license}:{" "}
            <a href={media.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-gold-400 underline underline-offset-2">
              {media.license}
            </a>
            {media.year ? ` · ${media.year}` : ""}
          </p>
          <a
            href={media.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-block text-gold-400 underline underline-offset-2"
          >
            {t.media.source}: Wikimedia Commons
          </a>
        </div>
      )}
    </div>
  );
}

/** Kredit teks non-interaktif, untuk foto di dalam tautan (tombol tidak boleh bersarang di dalam tautan). */
export function CreditText({ media, className }: { media: MediaEntry; className?: string }) {
  const author = media.author.length > 34 ? `${media.author.slice(0, 32)}…` : media.author;
  return (
    <span className={cn("block truncate font-mono text-[10px] text-sand-300/90", className)} title={`${media.author} · ${media.license} · Wikimedia Commons`}>
      © {author} · {media.license}
    </span>
  );
}
