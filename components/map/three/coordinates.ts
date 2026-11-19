/**
 * Koordinat dan proyeksi Web Mercator untuk Dunia 3D Nusantara SETAPAK.
 * Mengubah koordinat WGS84 [lat, lng] menjadi koordinat Three.js (Y-up, -Z utara).
 */

export const OSM_BASE_ZOOM = 5;
export const OSM_TILE_X_START = 24;
export const OSM_TILE_X_COUNT = 5; // tiles 24..28 (lng 90°E .. 146.25°E)
export const OSM_TILE_Y_START = 15;
export const OSM_TILE_Y_COUNT = 3; // tiles 15..17 (lat 11.18°N .. -21.94°S)
export const OSM_WORLD_UNITS_PER_TILE = 12; // total map = 60 x 36 unit dunia

export const OSM_MAP_WIDTH = OSM_TILE_X_COUNT * OSM_WORLD_UNITS_PER_TILE; // 60
export const OSM_MAP_DEPTH = OSM_TILE_Y_COUNT * OSM_WORLD_UNITS_PER_TILE; // 36

// Ambang batas LOD (Level of Detail) antara titik pemancar (dot) dan model 3D arsitektur
export const LOD_ZOOM_DISTANCE_THRESHOLD = 23.5;
export const LOD_REGION_RADIUS_THRESHOLD = 9.5;

export interface WorldPoint {
  x: number;
  z: number;
}

export function lonToTileX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

export function latToTileY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

/**
 * Memproyeksikan WGS84 [lat, lng] Web Mercator ke koordinat Three.js.
 * Y-up, -Z mengarah ke Utara, X mengarah ke Timur.
 */
export function geoToWorld(lat: number, lon: number): WorldPoint {
  const xTile = lonToTileX(lon, OSM_BASE_ZOOM);
  const yTile = latToTileY(lat, OSM_BASE_ZOOM);
  const x = (xTile - (OSM_TILE_X_START + OSM_TILE_X_COUNT / 2)) * OSM_WORLD_UNITS_PER_TILE;
  const z = (yTile - (OSM_TILE_Y_START + OSM_TILE_Y_COUNT / 2)) * OSM_WORLD_UNITS_PER_TILE;
  return { x, z };
}

/**
 * Mengubah koordinat Three.js (x, z) kembali ke WGS84 [lat, lon].
 */
export function worldToGeo(x: number, z: number): { lat: number; lon: number } {
  const n = Math.pow(2, OSM_BASE_ZOOM);
  const xTile = x / OSM_WORLD_UNITS_PER_TILE + (OSM_TILE_X_START + OSM_TILE_X_COUNT / 2);
  const yTile = z / OSM_WORLD_UNITS_PER_TILE + (OSM_TILE_Y_START + OSM_TILE_Y_COUNT / 2);
  const lon = (xTile / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * yTile) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lat, lon };
}

/**
 * Konversi perkiraan antara jarak kamera Three.js dan zoom level MapLibre
 */
export function cameraDistanceToZoom(distance: number): number {
  // distance ~ 48 -> zoom ~ 3.6
  // distance ~ 24 -> zoom ~ 5.5
  // distance ~ 10 -> zoom ~ 8
  // distance ~ 6.5 -> zoom ~ 11
  const d = Math.max(4, Math.min(65, distance));
  return Number((14 - Math.log2(d) * 1.8).toFixed(1));
}

export function zoomToCameraDistance(zoom: number): number {
  const z = Math.max(2, Math.min(14, zoom));
  return Math.max(6.5, Math.min(52, Math.pow(2, (14 - z) / 1.8)));
}
