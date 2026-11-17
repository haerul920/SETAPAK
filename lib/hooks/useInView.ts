"use client";

import { useEffect, useState, type RefObject } from "react";

/** true selama elemen berada di viewport (atau sekali saja jika once). */
export function useInView(ref: RefObject<Element | null>, opts: { rootMargin?: string; once?: boolean; threshold?: number } = {}): boolean {
  const { rootMargin = "0px", once = false, threshold = 0 } = opts;
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, once, threshold]);
  return inView;
}
