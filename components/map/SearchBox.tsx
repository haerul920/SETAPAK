"use client";

import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { localizeEvent, localizeSite } from "@/lib/i18n";
import { eventsBySite, rangeAround, search, type SearchHit } from "@/lib/peta-data";
import { usePetaStore } from "@/lib/peta-store";
import { normalizeRange } from "@/lib/peta-time";
import { useCopy } from "@/lib/useCopy";
import { siteBySlug } from "@/data";

/**
 * Pencarian situs atau peristiwa dengan fuzzy search (Fuse.js). Memilih hasil langsung terbang ke
 * pin dan menyetel rentang waktu supaya situsnya tampil.
 */
export function SearchBox() {
  const { t, lang } = useCopy();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  const hits = useMemo(() => search(q), [q]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  const pick = (h: SearchHit) => {
    const s = usePetaStore.getState();
    if (h.kind === "site") {
      const evs = eventsBySite.get(h.site.slug) ?? [];
      const a = evs[0];
      const b = evs[evs.length - 1];
      if (a && b) {
        const first = rangeAround(a);
        const last = rangeAround(b);
        s.setPoint(false);
        s.setRange(normalizeRange({ from: Math.min(first.from, s.range.from), to: Math.max(last.to, s.range.to) }));
      }
      s.select(h.site.slug);
      s.flyTo(h.site.coords.lat, h.site.coords.lng, 8);
    } else {
      const site = h.event.siteSlug ? siteBySlug[h.event.siteSlug] : undefined;
      s.setPoint(false);
      s.setRange(rangeAround(h.event));
      s.select(h.event.siteSlug, h.event.id);
      if (site) s.flyTo(site.coords.lat, site.coords.lng, 8);
    }
    setOpen(false);
    setQ("");
    s.setSheet("none");
  };

  return (
    <div ref={box} className="relative" role="search">
      <label className="sr-only" htmlFor={`${id}-q`}>
        {t.peta.search}
      </label>
      <div className="flex items-center gap-2 rounded-full border border-current/25 bg-[var(--surface)] px-3 py-1.5">
        <Search className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
        <input
          id={`${id}-q`}
          type="search"
          value={q}
          placeholder={t.peta.searchPlaceholder}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(hits.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && hits[active]) {
              e.preventDefault();
              pick(hits[active]);
            } else if (e.key === "Escape") setOpen(false);
          }}
          role="combobox"
          aria-expanded={open && q.length >= 2}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={hits[active] ? `${id}-o${active}` : undefined}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-60"
          data-peta-search
        />
      </div>
      {open && q.trim().length >= 2 && (
        <ul id={`${id}-list`} role="listbox" className="panel-surface absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-2xl p-1 shadow-xl" data-lenis-prevent>
          {hits.length === 0 && <li className="px-3 py-2 text-sm opacity-70">{t.peta.searchNone}</li>}
          {hits.map((h, i) => {
            const label = h.kind === "site" ? localizeSite(h.site, lang).name : localizeEvent(h.event, lang).title;
            const sub = h.kind === "site" ? h.site.location : `${localizeEvent(h.event, lang).dateLabel}${h.event.siteSlug && siteBySlug[h.event.siteSlug] ? ` · ${localizeSite(siteBySlug[h.event.siteSlug], lang).name}` : ""}`;
            return (
              <li key={`${h.kind}-${label}-${i}`} id={`${id}-o${i}`} role="option" aria-selected={i === active}>
                <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => pick(h)} className={i === active ? "w-full rounded-xl bg-current/10 px-3 py-2 text-left" : "w-full rounded-xl px-3 py-2 text-left hover:bg-current/5"}>
                  <span className="block text-sm">{label}</span>
                  <span className="block font-mono text-[11px] opacity-70">{sub}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
