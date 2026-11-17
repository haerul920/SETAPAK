import { cn } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

/** Kelas tombol konsisten dengan docs/VISUAL.md: utama emas pekat, sekunder garis tipis, tinggi minimal 48 px. */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,border-color,color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 disabled:pointer-events-none disabled:opacity-50 select-none",
    variant === "primary" && "bg-gold-400 text-ink-950 hover:bg-[#f0c877] active:scale-[0.98]",
    variant === "secondary" && "border border-sand-300/35 text-sand-100 hover:border-gold-400 hover:text-gold-400",
    variant === "ghost" && "text-sand-300 hover:bg-ink-800 hover:text-sand-100",
    size === "sm" && "min-h-[40px] px-4 text-sm",
    size === "md" && "min-h-[48px] px-5 text-[15px]",
    size === "lg" && "min-h-[56px] px-7 text-base",
    extra
  );
}

export function iconButtonClass(extra?: string): string {
  return cn(
    "inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-current/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
    extra
  );
}
