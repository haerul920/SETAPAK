import {
  type CulturalCategory,
  type CulturalNode,
  type CulturalPhase,
  HISTORICAL_ERAS,
  type HistoricalEra,
  MIGRATION_ROUTES,
  type MigrationRoute,
} from "./nusantaraData";

/**
 * Titik tengah kepulauan Nusantara pada Peta 3D Berbingkai:
 * Garis Lintang: -2.0° (dekat Khatulistiwa), Garis Bujur: 118.0°
 * Skala: 1.85 unit dunia Three.js per 1 derajat bujur
 */
export const MAP_CENTER_LON = 118.0;
export const MAP_CENTER_LAT = -2.0;
export const WORLD_UNITS_PER_LON_DEG = 1.85;

export type OsmZoomTier = 5 | 7 | 9 | 10 | 12 | 14 | 15 | 16;

export interface WorldPoint {
  x: number;
  z: number;
}

export interface DeclutteredNodePosition {
  id: string;
  clusterGroup: string;
  trueX: number;
  trueZ: number;
  centerX: number;
  centerZ: number;
  displayX: number;
  displayZ: number;
  offsetDistance: number;
  isDisplaced: boolean;
  angleRad: number;
  clusterSize: number;
}

export interface ZoomLodState {
  cameraDistance: number;
  osmTileZoom: OsmZoomTier;
  lodMode: "pulse-dot" | "3d-model";
  lodLabel: string;
  osmDetailDescription: string;
  focusRadiusWorld: number;
  isStreetLevel: boolean;
}

/**
 * Mengubah koordinat geografis (lat, lon) ke koordinat dunia Three.js (x, z)
 * menggunakan matematika Web Mercator sehingga ubin OpenStreetMap dari z=5 hingga z=16
 * tingkat jalanan selaras secara presisi.
 */
export function latLonToWorld(lat: number, lon: number): WorldPoint {
  const clampedLat = Math.max(-85, Math.min(85, lat));
  const x = (lon - MAP_CENTER_LON) * WORLD_UNITS_PER_LON_DEG;

  const latRad = (clampedLat * Math.PI) / 180;
  const centerLatRad = (MAP_CENTER_LAT * Math.PI) / 180;

  const mercY = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const centerMercY = Math.log(Math.tan(Math.PI / 4 + centerLatRad / 2));

  // Dalam sistem Three.js tangan kanan, Utara (+lat) adalah -Z, Selatan (-lat) adalah +Z
  const degEquivalentY = ((mercY - centerMercY) * 180) / Math.PI;
  const z = -degEquivalentY * WORLD_UNITS_PER_LON_DEG;

  return { x, z };
}

/**
 * Proyeksi balik dari koordinat dunia Three.js (x, z) ke (lat, lon).
 */
export function worldToLatLon(x: number, z: number): { lat: number; lon: number } {
  const lon = x / WORLD_UNITS_PER_LON_DEG + MAP_CENTER_LON;
  const centerLatRad = (MAP_CENTER_LAT * Math.PI) / 180;
  const centerMercY = Math.log(Math.tan(Math.PI / 4 + centerLatRad / 2));

  const degEquivalentY = -z / WORLD_UNITS_PER_LON_DEG;
  const mercY = centerMercY + (degEquivalentY * Math.PI) / 180;
  const latRad = 2 * Math.atan(Math.exp(mercY)) - Math.PI / 2;
  const lat = (latRad * 180) / Math.PI;

  return { lat, lon };
}

/**
 * Indeks ubin standar OpenStreetMap (Web Mercator)
 */
export function lonToTileX(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

export function latToTileY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
}

export function tileXToLon(tileX: number, zoom: number): number {
  return (tileX / Math.pow(2, zoom)) * 360 - 180;
}

export function tileYToLat(tileY: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * tileY) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/**
 * Menghitung batas persegi dunia Three.js untuk ubin OpenStreetMap (x, y, z).
 */
export function tileXYToWorldBounds(tileX: number, tileY: number, zoom: number) {
  const lonWest = tileXToLon(tileX, zoom);
  const lonEast = tileXToLon(tileX + 1, zoom);
  const latNorth = tileYToLat(tileY, zoom);
  const latSouth = tileYToLat(tileY + 1, zoom);

  const nw = latLonToWorld(latNorth, lonWest);
  const se = latLonToWorld(latSouth, lonEast);

  const width = Math.abs(se.x - nw.x);
  const depth = Math.abs(se.z - nw.z);
  const centerX = (nw.x + se.x) / 2;
  const centerZ = (nw.z + se.z) / 2;

  return {
    minX: nw.x,
    maxX: se.x,
    minZ: nw.z,
    maxZ: se.z,
    centerX,
    centerZ,
    width,
    depth,
    latNorth,
    latSouth,
    lonWest,
    lonEast,
  };
}

/**
 * Mesin Zoom LOD Bertingkat OpenStreetMap dari Nasional (z=5) hingga Jalanan (z=16):
 * - Gambaran Nasional (cameraDistance > 34): OSM z=5, mode 'pulse-dot'
 * - Pandangan Pulau/Provinsi (18.5 < cameraDistance <= 34): OSM z=7, mode 'pulse-dot'
 * - Pandangan Regional (11.5 < cameraDistance <= 18.5): OSM z=9, mode 'pulse-dot'
 * - Pandangan Kabupaten/Kota (3.6 < cameraDistance <= 11.5): OSM z=10, mode '3d-model' (model 3D ringkas)
 * - Pandangan Kecamatan & Jalan Arteri (1.2 < cameraDistance <= 3.6): OSM z=12, mode '3d-model'
 * - Pandangan Distrik Kota & Jalan Utama (0.42 < cameraDistance <= 1.2): OSM z=14, mode '3d-model'
 * - Pandangan Nama Jalan (0.16 < cameraDistance <= 0.42): OSM z=15, mode '3d-model' (Nama Jalan Terbaca Jelas)
 * - Pandangan Blok Bangunan & Gang (cameraDistance <= 0.16): OSM z=16, mode '3d-model'
 */
export function computeZoomLod(cameraDistance: number): ZoomLodState {
  const clampedDist = Math.max(0.05, Math.min(110, cameraDistance));

  if (clampedDist <= 0.16) {
    return {
      cameraDistance: clampedDist,
      osmTileZoom: 16,
      lodMode: "3d-model",
      lodLabel: "Zoom Jalan & Blok Kota (z=16) — Aset 3D Mikro",
      osmDetailDescription: "Tile OSM z=16 (Nama Jalan & Blok Bangunan Terlihat Jelas)",
      focusRadiusWorld: 1.5,
      isStreetLevel: true,
    };
  }

  if (clampedDist <= 0.42) {
    return {
      cameraDistance: clampedDist,
      osmTileZoom: 15,
      lodMode: "3d-model",
      lodLabel: "Zoom Nama Jalan (z=15) — Aset 3D Mikro",
      osmDetailDescription: "Tile OSM z=15 (Nama Jalan Raya & Lingkungan Terbaca Jelas)",
      focusRadiusWorld: 2.5,
      isStreetLevel: true,
    };
  }

  if (clampedDist <= 1.2) {
    return {
      cameraDistance: clampedDist,
      osmTileZoom: 14,
      lodMode: "3d-model",
      lodLabel: "Zoom Kawasan & Jalan Utama (z=14) — Aset 3D Mikro",
      osmDetailDescription: "Tile OSM z=14 (Jaringan Jalan Kota & Kecamatan)",
      focusRadiusWorld: 4.2,
      isStreetLevel: true,
    };
  }

  if (clampedDist <= 3.6) {
    return {
      cameraDistance: clampedDist,
      osmTileZoom: 12,
      lodMode: "3d-model",
      lodLabel: "Zoom Detail Kota/Kecamatan (z=12) — Aset 3D Ringkas",
      osmDetailDescription: "Tile OSM z=12 (Kecamatan & Jalur Arteri)",
      focusRadiusWorld: 7.5,
      isStreetLevel: false,
    };
  }

  if (clampedDist <= 11.5) {
    return {
      cameraDistance: clampedDist,
      osmTileZoom: 10,
      lodMode: "3d-model",
      lodLabel: "Zoom Kabupaten/Kota (z=10) — Aset 3D Ringkas",
      osmDetailDescription: "Tile OSM z=10 (Nama Kabupaten/Kota Terbaca Jelas)",
      focusRadiusWorld: 11.0,
      isStreetLevel: false,
    };
  }

  if (clampedDist <= 18.5) {
    return {
      cameraDistance: clampedDist,
      osmTileZoom: 9,
      lodMode: "pulse-dot",
      lodLabel: "Zoom Provinsi/Regional (z=9) — Mode Pulse-Dot",
      osmDetailDescription: "Tile OSM z=9 (Perbesar ke Kabupaten/Jalan untuk Aset 3D)",
      focusRadiusWorld: 16.0,
      isStreetLevel: false,
    };
  }

  if (clampedDist <= 34.0) {
    return {
      cameraDistance: clampedDist,
      osmTileZoom: 7,
      lodMode: "pulse-dot",
      lodLabel: "Zoom Pulau/Provinsi (z=7) — Mode Pulse-Dot",
      osmDetailDescription: "Tile OSM z=7 (Tampilan Pulau — Klik Titik untuk Zoom 3D)",
      focusRadiusWorld: 26.0,
      isStreetLevel: false,
    };
  }

  return {
    cameraDistance: clampedDist,
    osmTileZoom: 5,
    lodMode: "pulse-dot",
    lodLabel: "Tampilan Nasional Nusantara (z=5) — Mode Pulse-Dot",
    osmDetailDescription: "Tile OSM z=5 (Seluruh Kepulauan Indonesia)",
    focusRadiusWorld: 55.0,
    isStreetLevel: false,
  };
}

/**
 * Algoritma Anti-Overlap / Pengelompokan Melingkar (Decluttering):
 * Menjamin titik-titik yang sangat padat (misal Yogyakarta, Prambanan-Borobudur, Trowulan, Bali)
 * tidak bertumpukan saat dilihat dari kejauhan, dan secara halus kembali ke titik aslinya saat diperbesar.
 */
export function computeDeclutteredPositions(
  nodes: CulturalNode[],
  minSeparationWorld = 0.28,
  clusterRadiusWorld = 0.55
): Record<string, DeclutteredNodePosition> {
  const projected = nodes.map((node) => {
    const pt = latLonToWorld(node.lat, node.lon);
    return {
      node,
      trueX: pt.x,
      trueZ: pt.z,
    };
  });

  const visited = new Set<string>();
  const clusters: Array<typeof projected> = [];

  for (let i = 0; i < projected.length; i++) {
    const seed = projected[i];
    if (visited.has(seed.node.id)) continue;

    const group = [seed];
    visited.add(seed.node.id);

    for (let j = i + 1; j < projected.length; j++) {
      const candidate = projected[j];
      if (visited.has(candidate.node.id)) continue;

      const spatialDist = Math.hypot(
        candidate.trueX - seed.trueX,
        candidate.trueZ - seed.trueZ
      );

      if (spatialDist < clusterRadiusWorld) {
        group.push(candidate);
        visited.add(candidate.node.id);
      }
    }

    clusters.push(group);
  }

  const result: Record<string, DeclutteredNodePosition> = {};

  for (const group of clusters) {
    const count = group.length;
    if (count === 1) {
      const single = group[0];
      result[single.node.id] = {
        id: single.node.id,
        clusterGroup: single.node.clusterGroup,
        trueX: single.trueX,
        trueZ: single.trueZ,
        centerX: single.trueX,
        centerZ: single.trueZ,
        displayX: single.trueX,
        displayZ: single.trueZ,
        offsetDistance: 0,
        isDisplaced: false,
        angleRad: 0,
        clusterSize: 1,
      };
      continue;
    }

    const centerX = group.reduce((acc, item) => acc + item.trueX, 0) / count;
    const centerZ = group.reduce((acc, item) => acc + item.trueZ, 0) / count;

    const sorted = [...group].sort(
      (a, b) => a.node.yearAppeared - b.node.yearAppeared
    );

    const sinHalfAngle = Math.sin(Math.PI / count);
    const ringRadius = Math.max(
      minSeparationWorld * 0.6,
      minSeparationWorld / (2 * Math.max(0.25, sinHalfAngle))
    );

    for (let k = 0; k < count; k++) {
      const item = sorted[k];
      const angleRad = -Math.PI / 2 + (k * 2 * Math.PI) / count;
      const displayX = centerX + Math.cos(angleRad) * ringRadius;
      const displayZ = centerZ + Math.sin(angleRad) * ringRadius;
      const offsetDistance = Math.hypot(
        displayX - item.trueX,
        displayZ - item.trueZ
      );

      result[item.node.id] = {
        id: item.node.id,
        clusterGroup: item.node.clusterGroup,
        trueX: item.trueX,
        trueZ: item.trueZ,
        centerX,
        centerZ,
        displayX,
        displayZ,
        offsetDistance,
        isDisplaced: true,
        angleRad,
        clusterSize: count,
      };
    }
  }

  return result;
}

/**
 * Menentukan fase keberadaan CulturalNode pada tahun linimasa tertentu.
 */
export function getCulturalPhaseAtYear(
  node: CulturalNode,
  currentYear: number
): CulturalPhase {
  if (currentYear < node.yearAppeared) return "inactive";
  if (currentYear < node.flourishingStart) return "emerging";
  if (currentYear <= node.flourishingEnd) return "flourishing";
  return "legacy";
}

export function getPhaseBadgeMeta(phase: CulturalPhase): {
  label: string;
  glowMultiplier: number;
  scaleMultiplier: number;
  description: string;
} {
  switch (phase) {
    case "emerging":
      return {
        label: "Fase Berkembang",
        glowMultiplier: 0.75,
        scaleMultiplier: 0.9,
        description: "Kemunculan awal dan pembentukan identitas budaya",
      };
    case "flourishing":
      return {
        label: "Masa Keemasan",
        glowMultiplier: 1.3,
        scaleMultiplier: 1.06,
        description: "Puncak kejayaan, pengaruh luas, dan pencapaian monumental",
      };
    case "legacy":
      return {
        label: "Warisan Berkelanjutan",
        glowMultiplier: 0.95,
        scaleMultiplier: 1.0,
        description: "Bertahan lintas zaman sebagai pusaka hidup dan cagar budaya",
      };
    default:
      return {
        label: "Belum Muncul",
        glowMultiplier: 0,
        scaleMultiplier: 0,
        description: "Belum muncul pada tahun linimasa ini",
      };
  }
}

export function formatHistoricalYear(year: number): string {
  const rounded = Math.round(year);
  if (rounded < 0) {
    return `${Math.abs(rounded)} SM`;
  }
  if (rounded === 0) {
    return "1 M";
  }
  return `${rounded} M`;
}

export function getEraForYear(year: number): HistoricalEra {
  if (year < 400) return HISTORICAL_ERAS[0];
  if (year < 1400) return HISTORICAL_ERAS[1];
  if (year < 1800) return HISTORICAL_ERAS[2];
  if (year < 1945) return HISTORICAL_ERAS[3];
  return HISTORICAL_ERAS[4];
}

export function getNodePositionAtCameraDistance(
  dec: DeclutteredNodePosition,
  cameraDistance: number
): { x: number; z: number; lat: number; lon: number; blend: number } {
  const t = Math.max(0, Math.min(1, (cameraDistance - 0.2) / (4.2 - 0.2)));
  const smooth = t * t * (3 - 2 * t);
  const blend = Math.max(0.16, Math.min(1.0, smooth * 0.84 + 0.16));
  const x = dec.trueX + (dec.displayX - dec.trueX) * blend;
  const z = dec.trueZ + (dec.displayZ - dec.trueZ) * blend;
  const { lat, lon } = worldToLatLon(x, z);
  return { x, z, lat, lon, blend };
}
