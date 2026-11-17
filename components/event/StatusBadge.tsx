"use client";

import { AlertTriangle, BadgeCheck, Scale } from "lucide-react";
import type { SourceStatus } from "@/data";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: SourceStatus; className?: string }) {
  const { t } = useCopy();
  const cfg = {
    terverifikasi: { label: t.event.statusVerified, cls: "border-verified/50 text-verified", Icon: BadgeCheck },
    diperdebatkan: { label: t.event.statusDebated, cls: "border-debated/50 text-debated", Icon: Scale },
    "perlu-cek": { label: t.event.statusCheck, cls: "border-check/60 text-check", Icon: AlertTriangle },
  }[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider", cfg.cls, className)}>
      <cfg.Icon className="h-3.5 w-3.5" aria-hidden />
      {cfg.label}
    </span>
  );
}
