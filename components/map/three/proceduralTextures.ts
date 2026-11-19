import * as THREE from "three";
import type { ProceduralTextureSet } from "./types";

function createSeededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const rand = createSeededRandom(19450817);

  // 1. Terrain micro-relief bump map (grayscale linear)
  const terrainCanvas = document.createElement("canvas");
  terrainCanvas.width = 256;
  terrainCanvas.height = 256;
  const tCtx = terrainCanvas.getContext("2d")!;
  tCtx.fillStyle = "#808080";
  tCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const x = rand() * 256;
    const y = rand() * 256;
    const r = 1 + rand() * 5;
    const v = Math.floor(95 + rand() * 75);
    tCtx.fillStyle = `rgba(${v},${v},${v},0.22)`;
    tCtx.beginPath();
    tCtx.arc(x, y, r, 0, Math.PI * 2);
    tCtx.fill();
  }
  const terrainBumpMap = new THREE.CanvasTexture(terrainCanvas);
  terrainBumpMap.wrapS = THREE.RepeatWrapping;
  terrainBumpMap.wrapT = THREE.RepeatWrapping;
  terrainBumpMap.repeat.set(4, 4);
  terrainBumpMap.anisotropy = maxAnisotropy;

  // 2. Volcanic stone / andesite bump map (linear)
  const stoneCanvas = document.createElement("canvas");
  stoneCanvas.width = 256;
  stoneCanvas.height = 256;
  const sCtx = stoneCanvas.getContext("2d")!;
  sCtx.fillStyle = "#787878";
  sCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    sCtx.fillStyle = "rgba(40,40,40,0.28)";
    sCtx.fillRect(0, y, 256, 1.5);
  }
  for (let i = 0; i < 1800; i++) {
    const x = rand() * 256;
    const y = rand() * 256;
    const v = Math.floor(70 + rand() * 110);
    sCtx.fillStyle = `rgba(${v},${v},${v},0.25)`;
    sCtx.fillRect(x, y, 2, 2);
  }
  const stoneBumpMap = new THREE.CanvasTexture(stoneCanvas);
  stoneBumpMap.wrapS = THREE.RepeatWrapping;
  stoneBumpMap.wrapT = THREE.RepeatWrapping;
  stoneBumpMap.repeat.set(2, 2);
  stoneBumpMap.anisotropy = maxAnisotropy;

  // 3. Teakwood grain map (linear)
  const woodCanvas = document.createElement("canvas");
  woodCanvas.width = 256;
  woodCanvas.height = 256;
  const wCtx = woodCanvas.getContext("2d")!;
  wCtx.fillStyle = "#888888";
  wCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 3) {
    const shade = Math.floor(100 + Math.sin(y * 0.25) * 28 + (rand() - 0.5) * 25);
    wCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
    wCtx.fillRect(0, y, 256, 2);
  }
  const woodGrainMap = new THREE.CanvasTexture(woodCanvas);
  woodGrainMap.wrapS = THREE.RepeatWrapping;
  woodGrainMap.wrapT = THREE.RepeatWrapping;
  woodGrainMap.anisotropy = maxAnisotropy;

  // 4. Cartographic Ocean Bathymetry Grid (sRGB color map, 100% seamless tile)
  const oceanCanvas = document.createElement("canvas");
  oceanCanvas.width = 512;
  oceanCanvas.height = 512;
  const oCtx = oceanCanvas.getContext("2d")!;
  oCtx.fillStyle = "#0c1f2c";
  oCtx.fillRect(0, 0, 512, 512);

  // Nautical rhumb & graticule lines
  oCtx.strokeStyle = "rgba(130, 196, 214, 0.08)";
  oCtx.lineWidth = 1;
  for (let i = 0; i < 512; i += 64) {
    oCtx.beginPath();
    oCtx.moveTo(i + 0.5, 0);
    oCtx.lineTo(i + 0.5, 512);
    oCtx.stroke();

    oCtx.beginPath();
    oCtx.moveTo(0, i + 0.5);
    oCtx.lineTo(512, i + 0.5);
    oCtx.stroke();
  }
  oCtx.strokeStyle = "rgba(212, 154, 69, 0.05)";
  oCtx.setLineDash([4, 6]);
  oCtx.beginPath();
  oCtx.moveTo(0, 0);
  oCtx.lineTo(512, 512);
  oCtx.moveTo(512, 0);
  oCtx.lineTo(0, 512);
  oCtx.stroke();

  const oceanGridMap = new THREE.CanvasTexture(oceanCanvas);
  oceanGridMap.colorSpace = THREE.SRGBColorSpace;
  oceanGridMap.wrapS = THREE.RepeatWrapping;
  oceanGridMap.wrapT = THREE.RepeatWrapping;
  oceanGridMap.repeat.set(10, 6);
  oceanGridMap.anisotropy = maxAnisotropy;

  // 5. Soft radial contact shadow disc texture
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const shCtx = shadowCanvas.getContext("2d")!;
  const shGrad = shCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
  shGrad.addColorStop(0, "rgba(6, 12, 18, 0.72)");
  shGrad.addColorStop(0.55, "rgba(6, 12, 18, 0.28)");
  shGrad.addColorStop(1, "rgba(6, 12, 18, 0)");
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(shadowCanvas);

  return {
    terrainBumpMap,
    stoneBumpMap,
    woodGrainMap,
    oceanGridMap,
    contactShadowMap,
    dispose: () => {
      terrainBumpMap.dispose();
      stoneBumpMap.dispose();
      woodGrainMap.dispose();
      oceanGridMap.dispose();
      contactShadowMap.dispose();
    },
  };
}
