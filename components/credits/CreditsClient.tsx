"use client";

import { ExternalLink, Music } from "lucide-react";
import Image from "next/image";
import { sites, sortedEvents } from "@/data";
import { traces } from "@/lib/traces";
import { localizeEvent, localizeSite } from "@/lib/i18n";
import { altFor, audios, images, type MediaEntry } from "@/lib/media";
import { useCopy } from "@/lib/useCopy";

const ROLE_LABEL: Record<string, { id: string; en: string }> = {
  hero: { id: "Foto utama", en: "Hero photo" },
  gallery: { id: "Galeri", en: "Gallery" },
  then: { id: "Arsip (Dulu)", en: "Archive (Then)" },
  now: { id: "Kini", en: "Today" },
  "hotspot-base": { id: "Dasar hotspot", en: "Hotspot base" },
  texture: { id: "Tekstur gua", en: "Cave texture" },
  audio: { id: "Audio latar", en: "Ambient audio" },
};

function Row({ m }: { m: MediaEntry }) {
  const { t, lang } = useCopy();
  return (
    <li className="flex gap-4 rounded-2xl border border-sand-500/20 bg-ink-900 p-3">
      {m.kind === "image" ? (
        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-ink-800">
          <Image src={m.src} alt={altFor(m, lang)} fill sizes="120px" className="object-cover" placeholder={m.blurDataURL ? "blur" : "empty"} blurDataURL={m.blurDataURL} />
        </div>
      ) : (
        <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg bg-ink-800">
          <Music className="h-6 w-6 text-gold-400" aria-hidden />
        </div>
      )}
      <div className="min-w-0 flex-1 text-sm">
        <p className="break-words font-semibold text-sand-100">{m.title.replace(/^File:/, "")}</p>
        <p className="text-sand-300">
          {t.credits.author}: {m.author}
        </p>
        <p className="text-sand-300">
          {t.media.license}:{" "}
          <a href={m.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-gold-400 underline underline-offset-2">
            {m.license}
          </a>
          {m.shareAlike ? " (SA)" : ""}
          {m.cutout ? ` · ${t.credits.cutout}` : ""}
          {m.year ? ` · ${m.year}` : ""}
        </p>
        <p className="mt-0.5 flex flex-wrap gap-x-3 font-mono text-[11px] text-sand-500">
          <span>
            {t.credits.used}: {ROLE_LABEL[m.role]?.[lang] ?? m.role}
          </span>
          <span>
            {t.credits.accessed}: {m.accessed}
          </span>
          <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-gold-400 hover:underline">
            Wikimedia Commons
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </p>
      </div>
    </li>
  );
}

export function CreditsClient() {
  const { t, lang } = useCopy();
  const groups = new Map<string, MediaEntry[]>();
  for (const m of [...images, ...audios]) groups.set(m.target, [...(groups.get(m.target) ?? []), m]);
  const label = (target: string) => {
    const s = sites.find((x) => x.slug === target);
    if (s) return localizeSite(s).name;
    const e = sortedEvents.find((x) => x.id === target);
    if (e) return localizeEvent(e).title;
    return "Umum";
  };
  const traceName = new Map(traces.map((x) => [x.id, x.name]));
  // foto jejak tingkat 3 (id "wd-Q...") dikumpulkan dalam satu bagian lipat supaya halaman tetap ringan
  const isTrace = (k: string) => k.startsWith("wd-");
  const traceKeys = [...groups.keys()].filter(isTrace).sort((a, b) => (traceName.get(a) ?? a).localeCompare(traceName.get(b) ?? b, "id"));
  const traceTotal = traceKeys.reduce((n, k) => n + groups.get(k)!.length, 0);
  const order = [...sites.map((s) => s.slug), ...[...groups.keys()].filter((k) => !isTrace(k) && !sites.some((s) => s.slug === k))];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-24 sm:px-6">
      <h1 className="font-display text-4xl text-sand-100 sm:text-5xl">{t.credits.title}</h1>
      <p className="mt-3 max-w-3xl text-lg text-sand-300">{t.credits.intro}</p>
      <ul className="mt-6 space-y-1.5 text-sm text-sand-300">
        <li>{t.credits.count(images.length + audios.length)}</li>
        <li>{t.credits.map}</li>
        <li>{t.credits.fonts}</li>
        <li>{t.credits.shareAlike}</li>
        <li>{t.media.illustrationNote}</li>
      </ul>
      {order
        .filter((k) => groups.has(k))
        .map((k) => (
          <section key={k} className="mt-10" aria-labelledby={`cr-${k}`}>
            <h2 id={`cr-${k}`} className="font-display text-2xl text-sand-100">
              {label(k)} <span className="font-mono text-sm text-sand-500">({groups.get(k)!.length})</span>
            </h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {groups.get(k)!.map((m) => (
                <Row key={m.id} m={m} />
              ))}
            </ul>
          </section>
        ))}
      {traceKeys.length > 0 && (
        <details className="mt-12 rounded-2xl border border-sand-500/20 bg-ink-900/60 p-4">
          <summary className="cursor-pointer font-display text-2xl text-sand-100">
            Jejak cagar budaya (Wikidata){" "}
            <span className="font-mono text-sm text-sand-500">({traceTotal})</span>
          </summary>
          <p className="mt-3 max-w-3xl text-sm text-sand-300">
            Foto utama jejak tingkat 3, diambil dari properti gambar tiap butir Wikidata di Wikimedia Commons. Setiap berkas dicantumkan dengan pembuat dan lisensinya.
          </p>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {traceKeys.flatMap((k) =>
              groups.get(k)!.map((m) => (
                <li key={m.id} className="list-none">
                  <p className="mb-1 px-1 font-mono text-[11px] uppercase tracking-wide text-sand-500">{traceName.get(k) ?? k}</p>
                  <ul>
                    <Row m={m} />
                  </ul>
                </li>
              ))
            )}
          </ul>
        </details>
      )}
    </div>
  );
}
