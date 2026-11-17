"use client";

import { ChevronDown, RotateCcw, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AmbientLayers } from "@/components/atmosphere/AmbientLayers";
import { Background } from "@/components/atmosphere/Background";
import { FilmGrain } from "@/components/background/FilmGrain";
import { ForegroundParticles } from "@/components/background/ForegroundParticles";
import { QualityGovernor } from "@/components/background/QualityGovernor";
import { SceneLayers } from "@/components/background/SceneLayers";
import { ShaderSky } from "@/components/background/ShaderSky";
import { DetailDrawer } from "@/components/detail/DetailDrawer";
import { TraceDrawer } from "@/components/detail/TraceDrawer";
import { FinalConstellation } from "@/components/moments/FinalConstellation";
import { CaveTorchLayer, DiscoveryRoute, SiegeShips } from "@/components/moments/PageMoments";
import { ClusterRow } from "@/components/objects/ClusterRow";
import { DurationBar } from "@/components/objects/DurationBar";
import { SiteThreads } from "@/components/objects/SiteThread";
import { sortedEvents } from "@/data";
import { buildLayout, clusterAtY, type TimelineLayout } from "@/lib/layout";
import { ANCHOR, goToEvent, goToStart, goToYear, setNavContext } from "@/lib/navigator";
import { scrollStore, useIsMobile, useSetapakStore } from "@/lib/store";
import { parseYearInput, pxToMeters } from "@/lib/time-scale";
import { audios } from "@/lib/media";
import { useCopy } from "@/lib/useCopy";
import { GapNote } from "./GapNote";
import { ScaleMarks } from "./ScaleMarks";
import { TraceStones } from "./TraceStones";
import { TimeRuler } from "./TimeRuler";
import { YearCounter } from "./YearCounter";

/** Radius virtualisasi: hanya yang berada dalam ±RADIUS layar dari garis acuan yang dirender. */
const RADIUS = 2.5;

/**
 * Guliran waktu utama (docs/SCROLL_ENGINE.md): layar pembuka, lintasan setinggi skala waktu,
 * dan layar penutup. Satu loop per frame membaca posisi gulir, menghitung tahun, lalu menulis ke
 * scrollStore. Komponen lain membaca store itu tanpa render ulang React.
 */
export function TimeScroller() {
  const mobile = useIsMobile();
  const layout = useMemo(() => (mobile === null ? null : buildLayout(sortedEvents, { mobile })), [mobile]);

  return (
    <>
      <Intro />
      {layout ? <Track key={layout.mobile ? "m" : "d"} layout={layout} /> : <div style={{ height: "300vh" }} aria-hidden />}
    </>
  );
}

function Intro() {
  const { t } = useCopy();
  const sound = useSetapakStore((s) => s.sound);
  const setSound = useSetapakStore((s) => s.setSound);
  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 text-center" aria-labelledby="intro-title">
      <h1 id="intro-title" className="font-display text-6xl font-semibold tracking-[0.08em] md:text-8xl">
        SETAPAK
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed opacity-85 md:text-xl">{t.intro.line}</p>
      {audios.length > 0 && (
        <button
          type="button"
          onClick={() => setSound(!sound)}
          aria-pressed={sound}
          className="mt-8 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-current/25 px-5 font-mono text-xs uppercase tracking-widest transition-colors hover:border-[var(--accent)]"
        >
          {sound ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
          {sound ? t.header.soundOn : t.header.soundOff}
        </button>
      )}
      <div className="scroll-cue mt-10 flex flex-col items-center gap-1 opacity-80" aria-hidden>
        <span className="font-mono text-[11px] uppercase tracking-[0.3em]">{t.intro.cue}</span>
        <ChevronDown className="h-6 w-6" />
      </div>
    </section>
  );
}

function Track({ layout }: { layout: TimelineLayout }) {
  const { t } = useCopy();
  const track = useRef<HTMLDivElement>(null);
  const [bucket, setBucket] = useState(0);
  const [viewport, setViewport] = useState(900);
  const setActiveCluster = useSetapakStore((s) => s.setActiveCluster);

  // Loop per frame
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    setNavContext({ layout, track: el });
    let top = el.getBoundingClientRect().top + window.scrollY;
    let vh = window.innerHeight;
    setViewport(vh);
    const onResize = () => {
      top = el.getBoundingClientRect().top + window.scrollY;
      vh = window.innerHeight;
      setViewport(vh);
      lastSy = -1;
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    let lastSy = -1;
    let lastT = performance.now();
    let vel = 0;
    let lastBucket = -1;
    const tick = (now: number) => {
      const sy = window.scrollY;
      const dt = Math.max(1, now - lastT);
      const inst = lastSy < 0 ? 0 : ((sy - lastSy) / dt) * 1000;
      vel = vel * 0.82 + inst * 0.18;
      lastT = now;
      if (sy !== lastSy || Math.abs(vel) > 2) {
        lastSy = sy;
        const y = Math.min(layout.total, Math.max(0, sy + vh * ANCHOR - top));
        scrollStore.setState({ y, year: layout.scale.yToYear(y), velocity: Math.abs(vel) > 2 ? vel : 0, total: layout.total, viewport: vh });
        setActiveCluster(clusterAtY(layout, y)?.id ?? null);
        const b = Math.floor(y / vh);
        if (b !== lastBucket) {
          lastBucket = b;
          setBucket(b);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Deep link: /?tahun=1945 atau /#ev-borobudur-1814 (setelah tinggi lintasan terpasang)
    const params = new URLSearchParams(window.location.search);
    const yearParam = params.get("tahun") ?? params.get("year");
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    const deep = requestAnimationFrame(() => {
      top = el.getBoundingClientRect().top + window.scrollY;
      const year = yearParam ? parseYearInput(yearParam) : null;
      if (year !== null) goToYear(year, { immediate: true });
      else if (hash.startsWith("ev-")) goToEvent(hash, { immediate: true });
    });

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(deep);
      window.removeEventListener("resize", onResize);
      setNavContext(null);
    };
  }, [layout, setActiveCluster]);

  const center = (bucket + 0.5) * viewport;
  const lo = center - viewport * RADIUS;
  const hi = center + viewport * RADIUS;
  const visibleClusters = layout.clusters.filter((c) => c.y + c.height >= lo && c.y - layout.objectHeight <= hi);
  const visibleBars = layout.bars.filter((b) => b.bar.y1 >= lo && b.bar.y0 <= hi);
  const visibleNotes = layout.notes.filter((n) => n.y >= lo && n.y <= hi);

  return (
    <>
      <Background layout={layout} />
      <ShaderSky layout={layout} />
      <SceneLayers layout={layout} />
      <AmbientLayers layout={layout} />
      <ForegroundParticles />
      <FilmGrain />
      <QualityGovernor />
      <CaveTorchLayer layout={layout} />
      <SiegeShips layout={layout} />
      <DiscoveryRoute layout={layout} />
      <DetailDrawer />
      <TraceDrawer />
      <YearCounter layout={layout} />
      <TimeRuler layout={layout} />
      <div ref={track} className="pointer-events-none relative" style={{ height: layout.total }} id="lintasan">
        <ScaleMarks layout={layout} viewport={viewport} />
        <TraceStones layout={layout} lo={Math.max(0, lo)} hi={Math.min(layout.total, hi)} />
        {visibleBars.map(({ event, bar }) => (
          <DurationBar key={event.id} event={event} bar={bar} />
        ))}
        <div className="absolute inset-y-0 left-10 right-16 md:left-24 md:right-40">
          <SiteThreads layout={layout} lo={Math.max(0, lo)} hi={Math.min(layout.total, hi)} />
          {visibleClusters.map((c) => (
            <ClusterRow key={c.id} cluster={c} objectHeight={layout.objectHeight} />
          ))}
        </div>
        {visibleNotes.map((n) => (
          <GapNote key={n.id} note={n} layout={layout} viewport={viewport} />
        ))}
      </div>
      <section className="relative flex min-h-[100svh] flex-col items-center justify-center gap-6 px-4 pb-24 pt-[30vh] text-center md:px-24" aria-labelledby="outro-title">
        <h2 id="outro-title" className="font-display text-4xl font-semibold md:text-6xl">
          {t.outro.arrived}
        </h2>
        <p className="font-mono text-sm opacity-80">{t.outro.distance(t.scroll.meters(pxToMeters(layout.total + viewport)))}</p>
        <FinalConstellation />
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={goToStart}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[var(--accent)] px-6 font-semibold text-[#0d0b09]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            {t.outro.back}
          </button>
          <Link href="/kredit" className="inline-flex min-h-[48px] items-center rounded-full border border-current/30 px-6">
            {t.outro.credits}
          </Link>
          <Link href="/tentang" className="inline-flex min-h-[48px] items-center rounded-full border border-current/30 px-6">
            {t.outro.about}
          </Link>
        </div>
      </section>
    </>
  );
}
