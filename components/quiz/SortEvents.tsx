"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useState } from "react";
import { localizeEvent, localizeSite } from "@/lib/i18n";
import { imagesFor, srcFor } from "@/lib/media";
import { evaluate, quizEvent, quizSite, type OrderQ, type Result } from "@/lib/quiz";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { Feedback } from "./shared";

function Card({ id, index, total, locked, placedRight, onMove }: { id: string; index: number; total: number; locked: boolean; placedRight?: boolean; onMove: (dir: -1 | 1) => void }) {
  const { t, lang } = useCopy();
  const ev = quizEvent(id)!;
  const loc = localizeEvent(ev, lang);
  const site = ev.siteSlug ? quizSite(ev.siteSlug) : undefined;
  const photo = ev.siteSlug ? imagesFor(ev.siteSlug, ["hero", "gallery", "now"])[0] : undefined;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: locked });
  const right = locked && placedRight === true;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2.5 rounded-2xl border bg-[rgba(24,20,16,0.9)] p-2.5", isDragging ? "z-10 border-[var(--accent)] shadow-xl" : "border-current/20", locked && (right ? "border-verified bg-verified/10" : "border-check bg-check/10"))}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        disabled={locked}
        aria-label={t.quiz.orderHandle(loc.title)}
        className="inline-flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg opacity-70 hover:bg-current/10 hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5" aria-hidden />
      </button>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={srcFor(photo, 640)} alt="" className="h-12 w-16 shrink-0 rounded object-cover" draggable={false} />
      ) : (
        <span className="h-12 w-16 shrink-0 rounded bg-current/10" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        {locked && <p className="font-mono text-[11px] text-[var(--accent)]">{loc.dateLabel}</p>}
        <p className="text-sm font-medium leading-snug">{loc.title}</p>
        {site && <p className="truncate text-[11px] opacity-70">{localizeSite(site, lang).name}</p>}
      </div>
      {!locked && (
        <div className="flex shrink-0 flex-col">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label={t.quiz.orderMoveUp(loc.title)} className="rounded p-1 hover:bg-current/10 disabled:opacity-25">
            <ArrowUp className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} aria-label={t.quiz.orderMoveDown(loc.title)} className="rounded p-1 hover:bg-current/10 disabled:opacity-25">
            <ArrowDown className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * Urutkan Waktu (docs/KUIS.md, mode 2): 4 sampai 6 kartu peristiwa disusun kronologis dengan seret
 * dan lepas (dnd-kit, termasuk keyboard) atau tombol naik dan turun. Setelah dikunci, urutan benar
 * dan tahun tiap peristiwa diperlihatkan.
 */
export function SortEvents({ q, onResult, result }: { q: OrderQ; onResult: (order: string[], r: Result) => void; result: Result | null }) {
  const { t } = useCopy();
  const [order, setOrder] = useState<string[]>(q.items);
  const locked = result !== null;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const shown = locked ? q.answer : order;

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    setOrder((o) => arrayMove(o, o.indexOf(String(e.active.id)), o.indexOf(String(e.over!.id))));
  };
  const move = (id: string, dir: -1 | 1) =>
    setOrder((o) => {
      const i = o.indexOf(id);
      const j = i + dir;
      return j < 0 || j >= o.length ? o : arrayMove(o, i, j);
    });

  return (
    <div className="space-y-4">
      <p className="text-sm opacity-90">{t.quiz.prompts.order}</p>
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest opacity-60">
        <span>↑ {t.quiz.orderOldest}</span>
        <span>{t.quiz.orderNewest} ↓</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={shown} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2" aria-label={t.quiz.prompts.order}>
            {shown.map((id, i) => (
              <Card key={id} id={id} index={i} total={shown.length} locked={locked} placedRight={locked ? order[i] === id : undefined} onMove={(d) => move(id, d)} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {!locked ? (
        <button type="button" onClick={() => onResult(order, evaluate(q, order))} className="rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-[#0d0b09]">
          {t.quiz.lock}
        </button>
      ) : (
        <Feedback result={result} extra={<p className="opacity-90">{order.filter((id, i) => id === q.answer[i]).length} / {q.answer.length}</p>} />
      )}
    </div>
  );
}
