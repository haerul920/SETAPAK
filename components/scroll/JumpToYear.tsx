"use client";

import { CornerDownLeft } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { goToYear } from "@/lib/navigator";
import { parseYearInput } from "@/lib/time-scale";
import { useCopy } from "@/lib/useCopy";

/** Input "Pergi ke tahun..." di bawah penghitung. */
export function JumpToYear({ onClose }: { onClose: () => void }) {
  const { t } = useCopy();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLFormElement>(null);
  const hintId = useId();

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [onClose]);

  return (
    <form
      ref={box}
      onSubmit={(e) => {
        e.preventDefault();
        const year = parseYearInput(value);
        if (year === null) {
          setError(true);
          return;
        }
        goToYear(year);
        onClose();
      }}
      className="panel-surface absolute top-full z-50 mt-2 w-[min(340px,88vw)] rounded-2xl p-3 shadow-2xl"
    >
      <label className="block font-mono text-[11px] uppercase tracking-widest text-[var(--accent)]" htmlFor={`${hintId}-in`}>
        {t.scroll.goTo}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          ref={input}
          id={`${hintId}-in`}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          inputMode="text"
          autoComplete="off"
          aria-describedby={hintId}
          aria-invalid={error}
          aria-label={t.scroll.goToLabel}
          className="min-h-[44px] flex-1 rounded-xl border border-current/20 bg-transparent px-3 font-mono text-base outline-none focus:border-[var(--accent)]"
          placeholder="1945"
        />
        <button type="submit" className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-[var(--accent)] px-3 font-semibold text-[#0d0b09]">
          <CornerDownLeft className="h-4 w-4" aria-hidden />
          {t.scroll.goToSubmit}
        </button>
      </div>
      <p id={hintId} className="mt-2 text-xs opacity-70" role={error ? "alert" : undefined}>
        {error ? t.scroll.goToInvalid : t.scroll.goToHint}
      </p>
    </form>
  );
}
