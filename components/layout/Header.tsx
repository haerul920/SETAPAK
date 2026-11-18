"use client";

import { Footprints, Pause, Play, Puzzle, Volume2, VolumeX, Zap, ZapOff } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useQuizStore } from "@/lib/quiz-store";
import { cn } from "@/lib/utils";
import { audios } from "@/lib/media";
import { useSetapakStore } from "@/lib/store";
import { iconButtonClass } from "@/lib/ui";
import { useCopy } from "@/lib/useCopy";

const NAV = [
  { href: "/", key: "scroll" },
  { href: "/peta", key: "peta" },
  { href: "/kuis", key: "kuis" },
] as const;

/** Header minimal: logo kecil, tiga tautan utama, suara, bahasa ID/EN, dan mode tanpa animasi. */
export function Header() {
  const { t, lang } = useCopy();
  const setLang = useSetapakStore((s) => s.setLang);
  const noMotion = useSetapakStore((s) => s.noMotion);
  const setNoMotion = useSetapakStore((s) => s.setNoMotion);
  const pathname = usePathname();
  const challenges = useQuizStore((s) => s.scrollChallenges);
  const setChallenges = useQuizStore((s) => s.setScrollChallenges);
  useEffect(() => {
    void useQuizStore.persist.rehydrate();
  }, []);
  const autoPlay = useSetapakStore((s) => s.autoPlay);
  const setAutoPlay = useSetapakStore((s) => s.setAutoPlay);
  const sound = useSetapakStore((s) => s.sound);
  const setSound = useSetapakStore((s) => s.setSound);

  return (
    <header className="header-ink pointer-events-none fixed inset-x-0 top-0 z-50">
      <a
        href={pathname === "/" ? "#lintasan" : "#main-content"}
        className="pointer-events-auto sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:text-[#0d0b09]"
      >
        {t.skip}
      </a>
      <div className="flex h-14 items-center justify-between px-3 md:px-5">
        <Link href="/" className="pointer-events-auto flex items-center gap-2 rounded-lg py-2 pr-2 max-[420px]:hidden" aria-label={`${t.brand}, ${t.nav.home}`}>
          <Footprints className="h-5 w-5 text-[var(--accent)]" aria-hidden />
          <span className="hidden font-display text-base font-semibold tracking-wide sm:inline">{t.brand}</span>
        </Link>
        <nav aria-label={t.nav.main} className="pointer-events-auto ml-1 mr-auto flex items-center gap-0.5 md:ml-3">
          {NAV.map((n) => {
            const current = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={current ? "page" : undefined}
                aria-label={n.key === "peta" ? t.nav.peta : undefined}
                className={cn("whitespace-nowrap rounded-full px-2 py-1.5 text-[12px] font-medium transition-colors min-[400px]:px-2.5 min-[400px]:text-[13px] md:px-3.5 md:text-sm", current ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "opacity-80 hover:opacity-100")}
              >
                {n.key === "peta" ? (
                  <>
                    <span className="max-[400px]:hidden">{t.nav.peta}</span>
                    <span className="hidden max-[400px]:inline" aria-hidden>
                      {t.nav.petaShort}
                    </span>
                  </>
                ) : (
                  t.nav[n.key]
                )}
              </Link>
            );
          })}
        </nav>
        <div className="pointer-events-auto flex items-center gap-0.5">
          {pathname === "/" && (
            <button
              type="button"
              onClick={() => setAutoPlay(!autoPlay)}
              className={iconButtonClass(cn("max-[400px]:w-8", autoPlay && "text-[var(--accent)]"))}
              aria-pressed={autoPlay}
              aria-label={autoPlay ? t.header.autoPause : t.header.autoPlay}
              title={autoPlay ? t.header.autoPause : t.header.autoPlay}
              data-autoplay-toggle
            >
              {autoPlay ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />}
            </button>
          )}
          {pathname === "/" && (
            <button
              type="button"
              onClick={() => setChallenges(!challenges)}
              className={iconButtonClass(cn("max-[400px]:w-8 max-[339px]:hidden", challenges && "text-[var(--accent)]"))}
              aria-pressed={challenges}
              aria-label={t.quiz.scroll.toggle}
              title={t.quiz.scroll.toggle}
              data-challenge-toggle
            >
              <Puzzle className="h-5 w-5" aria-hidden />
            </button>
          )}
          {audios.length > 0 && (
            <button
              type="button"
              onClick={() => setSound(!sound)}
              className={iconButtonClass("max-[400px]:w-8")}
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
            aria-label={`${lang.toUpperCase()}, ${t.header.lang}: ${lang === "id" ? "Bahasa Indonesia" : "English"}`}
          >
            {lang === "id" ? "ID" : "EN"}
          </button>
          <button
            type="button"
            onClick={() => setNoMotion(!noMotion)}
            className={iconButtonClass(cn("max-[400px]:w-8", noMotion && "text-[var(--accent)]"))}
            aria-pressed={noMotion}
            aria-label={t.header.motion}
            title={t.header.motion}
          >
            {noMotion ? <ZapOff className="h-5 w-5" aria-hidden /> : <Zap className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
    </header>
  );
}
