import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 pt-24 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-gold-400">404</p>
      <h1 className="mt-2 font-display text-4xl text-sand-100">Jejak ini tidak ditemukan</h1>
      <p className="mt-3 max-w-md text-sand-300">Halaman yang kamu cari tidak ada. Kembali ke awal guliran waktu.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="inline-flex min-h-[48px] items-center rounded-full bg-gold-400 px-6 font-semibold text-ink-950">
          Beranda
        </Link>
      </div>
    </div>
  );
}
