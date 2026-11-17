"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCopy } from "@/lib/useCopy";

/** Kaki halaman hanya untuk /kredit dan /tentang; guliran utama berakhir di layar penutupnya sendiri. */
export function Footer() {
  const { t } = useCopy();
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <footer className="border-t border-sand-500/15 px-4 py-10 text-sm text-sand-300 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-2">
          <p className="font-display text-lg text-sand-100">
            {t.brand} <span className="text-sand-300">· {t.brandLong}</span>
          </p>
          <p>{t.footer.made}</p>
          <p>{t.footer.credits}</p>
        </div>
        <nav aria-label="Footer" className="flex gap-6">
          <Link href="/" className="py-1 hover:text-gold-400">
            {t.nav.home}
          </Link>
          <Link href="/kredit" className="py-1 hover:text-gold-400">
            {t.nav.credits}
          </Link>
          <Link href="/tentang" className="py-1 hover:text-gold-400">
            {t.nav.about}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
