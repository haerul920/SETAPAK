"use client";

import { ExternalLink } from "lucide-react";
import { sources as allSources, type SourceKind } from "@/data";
import { useCopy } from "@/lib/useCopy";
import { cn, extractDomain } from "@/lib/utils";

const KIND_STYLE: Record<SourceKind, string> = {
  resmi: "border-verified/50 text-verified",
  ilmiah: "border-[#8fb3d9]/50 text-[#a9c6e6]",
  media: "border-sand-500/50 text-sand-300",
};

export function SourceList({ ids, className }: { ids: string[]; className?: string }) {
  const { t } = useCopy();
  const list = ids.map((id) => allSources.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => Boolean(s));
  if (!list.length) return null;
  return (
    <ul className={cn("space-y-2", className)}>
      {list.map((s) => (
        <li key={s.id}>
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-xl border border-sand-500/20 bg-ink-950/50 p-3 transition-colors hover:border-gold-400/50"
          >
            <span className={cn("mt-0.5 shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider", KIND_STYLE[s.kind])}>
              {t.source.kinds[s.kind]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm leading-snug text-sand-100 group-hover:text-gold-400">{s.title}</span>
              <span className="mt-0.5 block font-mono text-[11px] text-sand-500">{extractDomain(s.url)}</span>
            </span>
            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-sand-500" aria-hidden />
            <span className="sr-only">{t.source.open}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
