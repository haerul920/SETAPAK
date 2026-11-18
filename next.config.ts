import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // NEXT_DIST_DIR memungkinkan build verifikasi terpisah dari `next dev` yang sedang berjalan.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    deviceSizes: [640, 1280, 1920],
    imageSizes: [320, 480],
  },
  // Aset statis (foto, audio, worker peta) tidak berubah per tautan: simpan lama di cache peramban supaya
  // kunjungan berikutnya dan gulir bolak-balik tidak mengunduh atau memvalidasi ulang setiap gambar.
  async headers() {
    const longCache = [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }];
    return [
      { source: "/media/:path*", headers: longCache },
      { source: "/audio/:path*", headers: longCache },
      { source: "/vendor/:path*", headers: longCache },
    ];
  },
  // Minifier bundle server Next 15.5 menghasilkan "a[d] is not a function" saat prerender di proyek ini.
  // Bundle server tidak dikirim ke browser, jadi minifikasi hanya dimatikan di sisi server; bundle klien tetap diminifikasi.
  webpack: (config, { isServer }) => {
    // NO_MINIFY=1 hanya untuk profil kinerja (nama fungsi terbaca di jejak Chrome)
    if (isServer || process.env.NO_MINIFY) config.optimization.minimize = false;
    return config;
  },
};

export default nextConfig;
