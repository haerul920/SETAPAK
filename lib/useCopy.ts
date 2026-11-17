"use client";

import { copy } from "./copy";
import { useSetapakStore } from "./store";

export function useCopy() {
  const lang = useSetapakStore((s) => s.lang);
  return { lang, t: copy(lang) };
}
