"use client";

import { Footprints, Pause, Play, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { audios } from "@/lib/media";
import { useSetapakStore } from "@/lib/store";
import { iconButtonClass } from "@/lib/ui";
import { useCopy } from "@/lib/useCopy";

/** Header minimal: logo kecil, suara, bahasa ID/EN, dan mode tanpa animasi. Tanpa menu besar. */
export function Header() {
  const { t, lang } = useCopy();
  const setLang = useSetapakStore((s) => s.setLang);
  const noMotion = useSetapakStore((s) => s.noMotion);
  const setNoMotion = useSetapakStore((s) => s.setNoMotion);
  const sound = useSetapakStore((s) => s.sound);
  const setSound = useSetapakStore((s) => s.setSound);

  return (
    <header className="header-ink pointer-events-none fixed inset-x-0 top-0 z-50">
      <a
        href="#lintasan"
        className="pointer-events-auto sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:text-[#0d0b09]"
      >
        {t.skip}
      </a>
      <div className="flex h-14 items-center justify-between px-3 md:px-5">
        <Link href="/" className="pointer-events-auto flex items-center gap-2 rounded-lg py-2 pr-2" aria-label={`${t.brand}, ${t.nav.home}`}>
          <Footprints className="h-5 w-5 text-[var(--accent)]" aria-hidden />
          <span className="font-display text-base font-semibold tracking-wide">{t.brand}</span>
        </Link>
        <div className="pointer-events-auto flex items-center gap-0.5">
          {audios.length > 0 && (
            <button
              type="button"
              onClick={() => setSound(!sound)}
              className={iconButtonClass()}
              aria-pressed={sound}
              aria-label={sound ? t.header.soundOn : t.header.soundOff}
              title={sound ? t.header.soundOn : t.header.soundOff}
            >
              {sound ? <Volume2 className="h-5 w-5" aria-hidden /> : <VolumeX className="h-5 w-5" aria-hidden />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setLang(lang === "id" ? "en" : "id")}
            className={iconButtonClass("w-auto px-3 font-mono text-xs uppercase")}
            aria-label={`${t.header.lang}: ${lang === "id" ? "Bahasa Indonesia" : "English"}`}
          >
            {lang === "id" ? "ID" : "EN"}
          </button>
          <button
            type="button"
            onClick={() => setNoMotion(!noMotion)}
            className={iconButtonClass(noMotion ? "text-[var(--accent)]" : undefined)}
            aria-pressed={noMotion}
            aria-label={t.header.motion}
            title={t.header.motion}
          >
            {noMotion ? <Play className="h-5 w-5" aria-hidden /> : <Pause className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
    </header>
  );
}
