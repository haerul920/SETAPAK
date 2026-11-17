/**
 * Menyalin worker MapLibre GL (BSD-3-Clause) ke public/vendor agar bisa dimuat dengan
 * maplibregl.setWorkerUrl. MapLibre 6 mencari worker relatif terhadap berkas modulnya, yang tidak
 * ada di dalam bundel Next.js. Dijalankan otomatis sebelum `pnpm dev` dan `pnpm build`.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkgDir = path.dirname(require.resolve("maplibre-gl/package.json"));
const src = path.join(pkgDir, "dist", "maplibre-gl-worker.mjs");
const outDir = path.join(process.cwd(), "public", "vendor");
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(src, path.join(outDir, "maplibre-gl-worker.mjs"));
console.log("maplibre-gl-worker.mjs disalin ke public/vendor");
