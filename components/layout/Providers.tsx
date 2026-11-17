"use client";

import { useEffect } from "react";
import { useSetapakStore } from "@/lib/store";
import { SmoothScrollProvider } from "./SmoothScrollProvider";

/** Memuat progres tersimpan setelah hidrasi dan menyelaraskan atribut <html>. */
export function Providers({ children }: { children: React.ReactNode }) {
  const lang = useSetapakStore((s) => s.lang);

  useEffect(() => {
    void useSetapakStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return <SmoothScrollProvider>{children}</SmoothScrollProvider>;
}
