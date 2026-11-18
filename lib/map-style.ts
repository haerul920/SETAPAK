import type { StyleSpecification } from "maplibre-gl";

/** Bingkai awal Nusantara untuk semua peta SETAPAK (Peta Waktu dan kuis). */
export const NUSANTARA_BOUNDS: [[number, number], [number, number]] = [
  [94.5, -11.5],
  [141.5, 6.5],
];

/**
 * Gaya peta dasar: tile OpenStreetMap (atribusi wajib tampil) yang disaturasi rendah dan digelapkan,
 * rona digeser hangat supaya senada dengan SETAPAK.
 */
export function osmStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      },
    },
    layers: [{ id: "osm", type: "raster", source: "osm", paint: { "raster-saturation": -0.6, "raster-brightness-max": 0.5, "raster-brightness-min": 0.02, "raster-contrast": 0.15, "raster-hue-rotate": 18 } }],
  };
}
