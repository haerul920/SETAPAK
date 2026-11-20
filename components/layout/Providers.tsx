"use client";

import { useEffect } from "react";
import { useSetapakStore } from "@/lib/store";
import { SmoothScrollProvider } from "./SmoothScrollProvider";

/** Memuat progres tersimpan setelah hidrasi dan menyelaraskan atribut <html>. */
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void useSetapakStore.persist.rehydrate();
    document.documentElement.lang = "id";
  }, []);

  return <SmoothScrollProvider>{children}</SmoothScrollProvider>;
}
