"use client";

import Link from "next/link";
import { SourceList } from "@/components/event/SourceList";
import { events, sites, sources } from "@/data";
import { buttonClass } from "@/lib/ui";
import { useCopy } from "@/lib/useCopy";

const TEXT = {
  id: {
    intro:
      "SETAPAK (Situs Edukasi Tentang Aneka Peninggalan Kebudayaan) adalah satu guliran panjang menembus waktu: pengunjung mulai di 1,65 juta tahun lalu dan terus menggulir sampai tiba di 2026. Penghitung tahun berjalan mengikuti guliran, dan setiap peristiwa cagar budaya muncul tepat di tahunnya. Karya ini disiapkan untuk BUDAYA GO! 2026, kategori Inovasi Digital.",
    methodTitle: "Cara kami menyusun konten",
    method: [
      "Setiap fakta berasal dari satu berkas data yang dikurasi dari sumber resmi, ilmiah, dan media. Tidak ada tahun atau angka yang dikarang.",
      "Setiap peristiwa diberi status: terverifikasi, diperdebatkan (versi lain ditampilkan), atau perlu cek (sedang diverifikasi dengan Balai Pelestarian Kebudayaan).",
      "Foto dan gambar arsip diambil otomatis dari Wikimedia Commons, disaring lisensinya (Public Domain, CC0, CC BY, CC BY-SA), lalu diperiksa satu per satu. Kredit lengkap ada di halaman Kredit.",
      "Seni cadas Maros ditampilkan sebagai rekonstruksi artistik orisinal karena foto penelitiannya tidak berlisensi terbuka.",
    ],
    a11yTitle: "Aksesibilitas",
    a11y: "Semua interaksi bisa dipakai dengan mouse, sentuh, dan keyboard. Tombol mode tanpa animasi di pojok kanan atas mematikan gerak, dan preferensi sistem untuk mengurangi gerak selalu dihormati.",
    team: "Tim Institut Teknologi Bontomarannu, Universitas Hasanuddin, Makassar.",
    sources: "Daftar sumber lengkap",
    stats: (s: number, e: number) => [`${s} situs`, `${e} peristiwa`, "1,65 juta tahun"],
  },
  en: {
    intro:
      "SETAPAK (Educational Site on Indonesia's Cultural Heritage) is one long scroll through time: visitors start 1.65 million years ago and keep scrolling until they reach 2026. A year counter follows the scroll, and every heritage event appears exactly at its year. It was prepared for BUDAYA GO! 2026, Digital Innovation category.",
    methodTitle: "How we build the content",
    method: [
      "Every fact comes from a single data file curated from official, scholarly, and media sources. No year or number is invented.",
      "Each event carries a status: verified, debated (other versions shown), or needs check (being verified with the Cultural Preservation Office).",
      "Photos and archival images are fetched automatically from Wikimedia Commons, filtered by license (Public Domain, CC0, CC BY, CC BY-SA), then reviewed one by one. Full credits are on the Credits page.",
      "Maros rock art is shown as an original artistic reconstruction because research photos are not openly licensed.",
    ],
    a11yTitle: "Accessibility",
    a11y: "Every interaction works with mouse, touch, and keyboard. The reduced motion button in the top right corner turns animation off, and the system reduced-motion preference is always respected.",
    team: "Institut Teknologi Bontomarannu team, Universitas Hasanuddin, Makassar.",
    sources: "Full list of sources",
    stats: (s: number, e: number) => [`${s} sites`, `${e} events`, "1.65 million years"],
  },
};

export function AboutClient() {
  const { t, lang } = useCopy();
  const x = TEXT[lang];
  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-24 sm:px-6">
      <h1 className="font-display text-4xl text-sand-100 sm:text-5xl">{t.about.title}</h1>
      <p className="prose-narrative mt-4">{x.intro}</p>
      <ul className="mt-5 flex flex-wrap gap-2">
        {x.stats(sites.length, events.length).map((s) => (
          <li key={s} className="rounded-full border border-sand-500/30 px-3 py-1 font-mono text-xs text-sand-100">
            {s}
          </li>
        ))}
      </ul>
      <h2 className="mt-12 font-display text-3xl text-sand-100">{x.methodTitle}</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sand-300">
        {x.method.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <h2 className="mt-12 font-display text-3xl text-sand-100">{x.a11yTitle}</h2>
      <p className="mt-3 text-sand-300">{x.a11y}</p>
      <p className="mt-6 text-sand-300">{x.team}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/kredit" className={buttonClass("secondary", "md")}>
          {t.nav.credits}
        </Link>
        <Link href="/" className={buttonClass("primary", "md")}>
          {t.about.back}
        </Link>
      </div>
      <h2 className="mt-14 font-display text-3xl text-sand-100">
        {x.sources} <span className="font-mono text-base text-sand-500">({sources.length})</span>
      </h2>
      <SourceList ids={sources.map((s) => s.id)} className="mt-5 grid gap-2 space-y-0 md:grid-cols-2" />
    </div>
  );
}
