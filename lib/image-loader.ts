/**
 * Loader next/image untuk aset SETAPAK yang sudah diproses oleh scripts/fetch-assets.ts.
 * src berupa basis tanpa ekstensi, misal "/media/borobudur/hero-1".
 */
const WIDTHS = [640, 1280, 1920];

export default function setapakLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  if (!src.startsWith("/media/")) return src;
  const w = WIDTHS.find((x) => x >= width) ?? 1920;
  return `${src}-${w}.webp`;
}
