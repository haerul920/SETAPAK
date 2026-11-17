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
  // Minifier bundle server Next 15.5 menghasilkan "a[d] is not a function" saat prerender di proyek ini.
  // Bundle server tidak dikirim ke browser, jadi minifikasi hanya dimatikan di sisi server; bundle klien tetap diminifikasi.
  webpack: (config, { isServer }) => {
    if (isServer) config.optimization.minimize = false;
    return config;
  },
};

export default nextConfig;
