import * as THREE from "three";
import {
  OSM_BASE_ZOOM,
  OSM_MAP_DEPTH,
  OSM_MAP_WIDTH,
  OSM_TILE_X_COUNT,
  OSM_TILE_X_START,
  OSM_TILE_Y_COUNT,
  OSM_TILE_Y_START,
  OSM_WORLD_UNITS_PER_TILE,
  geoToWorld,
  latToTileY,
  lonToTileX,
  worldToGeo,
} from "./coordinates";
import { INDONESIA_ISLANDS } from "./islands";
import type { OsmMapSystem } from "./types";

const DETAIL_ZOOM = 7;
const DETAIL_GRID_SIZE = 4; // 4x4 = 16 ubin per petak regional

function drawFallbackVectorMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  // Latar belakang samudra kartografi
  ctx.fillStyle = "#0e2838";
  ctx.fillRect(0, 0, width, height);

  // Garis bujur & lintang graticule
  ctx.strokeStyle = "rgba(148, 206, 224, 0.12)";
  ctx.lineWidth = 1;
  for (let lon = 90; lon <= 145; lon += 5) {
    const xFrac =
      (lonToTileX(lon, OSM_BASE_ZOOM) - OSM_TILE_X_START) / OSM_TILE_X_COUNT;
    const px = xFrac * width;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
    ctx.stroke();
  }
  for (let lat = -15; lat <= 10; lat += 5) {
    const yFrac =
      (latToTileY(lat, OSM_BASE_ZOOM) - OSM_TILE_Y_START) / OSM_TILE_Y_COUNT;
    const py = yFrac * height;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(width, py);
    ctx.stroke();
  }

  // Siluet pulau Nusantara vektor (tampil seketika tanpa latensi unduhan)
  ctx.fillStyle = "#245946";
  ctx.strokeStyle = "#6da68e";
  ctx.lineWidth = 1.5;
  for (const island of INDONESIA_ISLANDS) {
    ctx.beginPath();
    island.coords.forEach(([lat, lon], idx) => {
      const xFrac =
        (lonToTileX(lon, OSM_BASE_ZOOM) - OSM_TILE_X_START) / OSM_TILE_X_COUNT;
      const yFrac =
        (latToTileY(lat, OSM_BASE_ZOOM) - OSM_TILE_Y_START) / OSM_TILE_Y_COUNT;
      const px = xFrac * width;
      const py = yFrac * height;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

export function createOsmNusantaraMap(
  maxAnisotropy: number,
  isSoftwareGl: boolean
): OsmMapSystem {
  const group = new THREE.Group();
  group.name = "OsmNusantaraMap";

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  let disposed = false;
  const tileCache = new Map<string, HTMLImageElement>();
  const pendingTiles = new Set<string>();

  // 1. Kanvas OpenStreetMap Tingkat Dasar (z = 5, 5x3 ubin = 1280 x 768)
  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = OSM_TILE_X_COUNT * 256;
  baseCanvas.height = OSM_TILE_Y_COUNT * 256;
  const baseCtx = baseCanvas.getContext("2d")!;
  drawFallbackVectorMap(baseCtx, baseCanvas.width, baseCanvas.height);

  const baseTexture = new THREE.CanvasTexture(baseCanvas);
  baseTexture.colorSpace = THREE.SRGBColorSpace;
  baseTexture.anisotropy = maxAnisotropy;
  baseTexture.minFilter = THREE.LinearMipmapLinearFilter;
  baseTexture.magFilter = THREE.LinearFilter;
  textures.push(baseTexture);

  const baseGeo = new THREE.PlaneGeometry(OSM_MAP_WIDTH, OSM_MAP_DEPTH);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: baseTexture,
    roughness: 0.86,
    metalness: 0.04,
  });
  geometries.push(baseGeo);
  materials.push(baseMat);

  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.rotation.x = -Math.PI / 2;
  baseMesh.position.y = 0;
  baseMesh.receiveShadow = !isSoftwareGl;
  group.add(baseMesh);

  // 2. Bezel meja museum / plinth kayu berpelindung emas di bawah peta
  const plinthGeo = new THREE.BoxGeometry(OSM_MAP_WIDTH + 1.2, 0.55, OSM_MAP_DEPTH + 1.2);
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x102230,
    roughness: 0.55,
    metalness: 0.35,
  });
  const trimGeo = new THREE.BoxGeometry(OSM_MAP_WIDTH + 1.32, 0.12, OSM_MAP_DEPTH + 1.32);
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x8a6936,
    roughness: 0.35,
    metalness: 0.72,
  });
  geometries.push(plinthGeo, trimGeo);
  materials.push(plinthMat, trimMat);

  const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
  plinthMesh.position.y = -0.29;
  group.add(plinthMesh);

  const trimMesh = new THREE.Mesh(trimGeo, trimMat);
  trimMesh.position.y = -0.07;
  group.add(trimMesh);

  // 3. Garis Khatulistiwa (Equator 0°) di atas bidang peta
  const eqWest = geoToWorld(0, 90);
  const eqEast = geoToWorld(0, 146.25);
  const eqGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(eqWest.x, 0.02, eqWest.z),
    new THREE.Vector3(eqEast.x, 0.02, eqEast.z),
  ]);
  const eqMat = new THREE.LineDashedMaterial({
    color: 0xd49a45,
    transparent: true,
    opacity: 0.45,
    dashSize: 0.65,
    gapSize: 0.45,
  });
  const eqLine = new THREE.Line(eqGeo, eqMat);
  eqLine.computeLineDistances();
  geometries.push(eqGeo);
  materials.push(eqMat);
  group.add(eqLine);

  // Pengambilan ubin OpenStreetMap asinkron
  function loadOsmTile(
    z: number,
    x: number,
    y: number,
    onLoaded: (img: HTMLImageElement) => void
  ) {
    const key = `${z}/${x}/${y}`;
    const cached = tileCache.get(key);
    if (cached) {
      onLoaded(cached);
      return;
    }
    if (pendingTiles.has(key)) return;
    pendingTiles.add(key);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      pendingTiles.delete(key);
      if (disposed) return;
      tileCache.set(key, img);
      onLoaded(img);
    };
    img.onerror = () => {
      pendingTiles.delete(key);
    };
    img.src = `https://tile.openstreetmap.org/${key}.png`;
  }

  // Muat ubin z=5 OpenStreetMap
  for (let ty = 0; ty < OSM_TILE_Y_COUNT; ty++) {
    for (let tx = 0; tx < OSM_TILE_X_COUNT; tx++) {
      const tileX = OSM_TILE_X_START + tx;
      const tileY = OSM_TILE_Y_START + ty;
      loadOsmTile(OSM_BASE_ZOOM, tileX, tileY, (img) => {
        baseCtx.drawImage(img, tx * 256, ty * 256, 256, 256);
        baseTexture.needsUpdate = true;
      });
    }
  }

  // 4. Petak Detail Regional Resolusi Tinggi (z = 7) saat kamera memperbesar wilayah pulau
  const detailCanvas = document.createElement("canvas");
  detailCanvas.width = DETAIL_GRID_SIZE * 256; // 1024
  detailCanvas.height = DETAIL_GRID_SIZE * 256; // 1024
  const detailCtx = detailCanvas.getContext("2d")!;

  const detailTexture = new THREE.CanvasTexture(detailCanvas);
  detailTexture.colorSpace = THREE.SRGBColorSpace;
  detailTexture.anisotropy = maxAnisotropy;
  textures.push(detailTexture);

  const zoomRatio = Math.pow(2, DETAIL_ZOOM - OSM_BASE_ZOOM); // 4
  const detailWorldSpan = (DETAIL_GRID_SIZE * OSM_WORLD_UNITS_PER_TILE) / zoomRatio; // 12 unit
  const detailGeo = new THREE.PlaneGeometry(detailWorldSpan, detailWorldSpan);
  const detailMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: detailTexture,
    roughness: 0.85,
    metalness: 0.04,
    transparent: true,
    opacity: 0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  geometries.push(detailGeo);
  materials.push(detailMat);

  const detailMesh = new THREE.Mesh(detailGeo, detailMat);
  detailMesh.rotation.x = -Math.PI / 2;
  detailMesh.position.y = 0.01;
  detailMesh.visible = false;
  detailMesh.receiveShadow = !isSoftwareGl;
  group.add(detailMesh);

  let currentPatchOriginX = -1;
  let currentPatchOriginY = -1;

  const updateDetailPatch = (targetX: number, targetZ: number, cameraDistance: number) => {
    const shouldShow = cameraDistance < 25;
    if (!shouldShow) {
      detailMat.opacity = Math.max(0, detailMat.opacity - 0.12);
      if (detailMat.opacity <= 0.01) detailMesh.visible = false;
      return;
    }

    const { lat, lon } = worldToGeo(targetX, targetZ);
    const centerTileX = Math.floor(lonToTileX(lon, DETAIL_ZOOM));
    const centerTileY = Math.floor(latToTileY(lat, DETAIL_ZOOM));
    const originX = centerTileX - Math.floor(DETAIL_GRID_SIZE / 2);
    const originY = centerTileY - Math.floor(DETAIL_GRID_SIZE / 2);

    if (originX !== currentPatchOriginX || originY !== currentPatchOriginY) {
      currentPatchOriginX = originX;
      currentPatchOriginY = originY;

      detailCtx.clearRect(0, 0, detailCanvas.width, detailCanvas.height);
      detailTexture.needsUpdate = true;

      const patchCenterXTile = (originX + DETAIL_GRID_SIZE / 2) / zoomRatio;
      const patchCenterYTile = (originY + DETAIL_GRID_SIZE / 2) / zoomRatio;
      const worldCenterX =
        (patchCenterXTile - (OSM_TILE_X_START + OSM_TILE_X_COUNT / 2)) *
        OSM_WORLD_UNITS_PER_TILE;
      const worldCenterZ =
        (patchCenterYTile - (OSM_TILE_Y_START + OSM_TILE_Y_COUNT / 2)) *
        OSM_WORLD_UNITS_PER_TILE;

      detailMesh.position.set(worldCenterX, 0.01, worldCenterZ);

      for (let dy = 0; dy < DETAIL_GRID_SIZE; dy++) {
        for (let dx = 0; dx < DETAIL_GRID_SIZE; dx++) {
          const tx = originX + dx;
          const ty = originY + dy;
          loadOsmTile(DETAIL_ZOOM, tx, ty, (img) => {
            if (currentPatchOriginX !== originX || currentPatchOriginY !== originY) {
              return;
            }
            detailCtx.drawImage(img, dx * 256, dy * 256, 256, 256);
            detailTexture.needsUpdate = true;
          });
        }
      }
    }

    detailMesh.visible = true;
    detailMat.opacity = Math.min(1, detailMat.opacity + 0.12);
  };

  return {
    group,
    getSurfaceY: () => 0.02,
    updateDetailPatch,
    dispose: () => {
      disposed = true;
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      tileCache.clear();
    },
  };
}
