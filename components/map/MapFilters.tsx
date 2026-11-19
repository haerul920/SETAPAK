"use client";

import { PanelLeftClose } from "lucide-react";
import { categoryLabels, type Category, type EventType, type SourceStatus } from "@/data";
import { EVENT_TYPES, ISLANDS, STATUSES, type Island } from "@/lib/peta-data";
import { usePetaPrefs, usePetaStore, type TextSize } from "@/lib/peta-store";
import { useCopy } from "@/lib/useCopy";
import { categoryColor, CATEGORY_SHAPE, SHAPE_CLIP } from "./pins";

const CATS = Object.keys(categoryLabels) as Category[];

function toggle<T>(list: readonly T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Group({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="border-b border-current/10 py-2">
      <summary className="cursor-pointer select-none font-mono text-[11px] uppercase tracking-widest opacity-80">{title}</summary>
      <div className="mt-2 space-y-1">{children}</div>
    </details>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-current/5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

/**
 * Panel kiri: filter kategori, tipe peristiwa, pulau, status sumber, dan Warisan Dunia UNESCO,
 * lapisan peta, serta opsi aksesibilitas (bantuan warna dan ukuran teks).
 */
export function MapFilters({ onClose }: { onClose?: () => void } = {}) {
  const { t, lang } = useCopy();
  const filters = usePetaStore((s) => s.filters);
  const setFilters = usePetaStore((s) => s.setFilters);
  const resetFilters = usePetaStore((s) => s.resetFilters);
  const showAll = usePetaStore((s) => s.showAll);
  const setShowAll = usePetaStore((s) => s.setShowAll);
  const layers = usePetaStore((s) => s.layers);
  const setLayer = usePetaStore((s) => s.setLayer);
  const colorblind = usePetaPrefs((s) => s.colorblind);
  const setColorblind = usePetaPrefs((s) => s.setColorblind);
  const textSize = usePetaPrefs((s) => s.textSize);
  const setTextSize = usePetaPrefs((s) => s.setTextSize);
  const statusLabel: Record<SourceStatus, string> = { terverifikasi: t.event.statusVerified, diperdebatkan: t.event.statusDebated, "perlu-cek": t.event.statusCheck };

  return (
    <div className="space-y-1 px-3 pb-6 pt-2" data-peta-filters>
      <div className="flex items-center justify-between gap-2 pb-1">
        <h2 className="font-display text-base font-semibold">{t.peta.filters}</h2>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={resetFilters} className="rounded-full border border-current/25 px-2.5 py-1 text-xs hover:border-[var(--accent)]">
            {t.peta.resetFilters}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t.close}
              title={t.close}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-current/20 hover:border-[var(--accent)] hover:bg-current/10 transition-colors"
            >
              <PanelLeftClose className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
      <p className="text-[11px] opacity-70">{t.peta.filtersHint}</p>

      <Group title={t.peta.categories}>
        {CATS.map((c) => (
          <Check key={c} checked={filters.categories.includes(c)} onChange={() => setFilters({ ...filters, categories: toggle(filters.categories, c) })}>
            <span className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 shrink-0" style={{ background: categoryColor(c, colorblind), clipPath: SHAPE_CLIP[CATEGORY_SHAPE[c]] }} aria-hidden />
              <span className="truncate">{categoryLabels[c][lang]}</span>
            </span>
          </Check>
        ))}
      </Group>
      <Group title={t.peta.types} open={false}>
        {EVENT_TYPES.map((v: EventType) => (
          <Check key={v} checked={filters.types.includes(v)} onChange={() => setFilters({ ...filters, types: toggle(filters.types, v) })}>
            {t.event.types[v]}
          </Check>
        ))}
      </Group>
      <Group title={t.peta.islands} open={false}>
        {ISLANDS.map((v: Island) => (
          <Check key={v} checked={filters.islands.includes(v)} onChange={() => setFilters({ ...filters, islands: toggle(filters.islands, v) })}>
            {v}
          </Check>
        ))}
      </Group>
      <Group title={t.peta.statuses} open={false}>
        {STATUSES.map((v) => (
          <Check key={v} checked={filters.statuses.includes(v)} onChange={() => setFilters({ ...filters, statuses: toggle(filters.statuses, v) })}>
            {statusLabel[v]}
          </Check>
        ))}
      </Group>
      <div className="space-y-1 border-b border-current/10 py-2">
        <Check checked={filters.unescoOnly} onChange={(v) => setFilters({ ...filters, unescoOnly: v })}>
          {t.peta.unescoOnly}
        </Check>
        <Check checked={showAll} onChange={setShowAll}>
          {t.peta.showAll}
        </Check>
      </div>

      <Group title={t.peta.layers}>
        <Check checked={layers.pins} onChange={(v) => setLayer("pins", v)}>
          {t.peta.layerPins}
        </Check>
        <Check checked={layers.labels} onChange={(v) => setLayer("labels", v)}>
          {t.peta.layerLabels}
        </Check>
        <Check checked={layers.traces} onChange={(v) => setLayer("traces", v)}>
          {t.peta.layerTraces}
        </Check>
        <Check checked={layers.route} onChange={(v) => setLayer("route", v)}>
          {t.peta.layerRoute}
        </Check>
      </Group>

      <Group title={t.peta.settings} open={false}>
        <Check checked={colorblind} onChange={setColorblind}>
          {t.peta.colorblind}
        </Check>
        <div className="px-1 pt-1">
          <p className="mb-1 text-xs opacity-80">{t.peta.textSize}</p>
          <div className="flex overflow-hidden rounded-full border border-current/25 text-xs" role="radiogroup" aria-label={t.peta.textSize}>
            {(["sm", "md", "lg"] as TextSize[]).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={textSize === s} onClick={() => setTextSize(s)} className={textSize === s ? "flex-1 bg-[var(--accent)] px-2 py-1.5 text-[#0d0b09]" : "flex-1 px-2 py-1.5 opacity-80 hover:opacity-100"}>
                {t.peta.textSizes[s]}
              </button>
            ))}
          </div>
        </div>
      </Group>
    </div>
  );
}
