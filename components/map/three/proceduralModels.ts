import * as THREE from "three";
import type { ModelArchetype } from "./nusantaraData";

/**
 * Menghasilkan tekstur relief/kekasaran prosedural monokrom untuk batu pahat, perunggu, kayu, dan ijuk
 * tanpa memerlukan file aset eksternal.
 */
let cachedMicroReliefTex: THREE.CanvasTexture | null = null;
export function getProceduralMicroReliefTexture(): THREE.CanvasTexture {
  if (cachedMicroReliefTex) return cachedMicroReliefTex;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 128, 128);

  for (let y = 0; y < 128; y += 2) {
    const shade = 115 + ((y * 17) % 28);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(0, y, 128, 1);
  }
  for (let i = 0; i < 650; i++) {
    const rx = (i * 73) % 128;
    const ry = (i * 41) % 128;
    const val = i % 2 === 0 ? 155 : 95;
    ctx.fillStyle = `rgb(${val},${val},${val})`;
    ctx.fillRect(rx, ry, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  cachedMicroReliefTex = tex;
  return tex;
}

/**
 * Menghasilkan tekstur penggaris derajat kartografi bergantian emas & hitam
 * untuk bezel bingkai showcase peta 3D.
 */
export function createCartographicRulerTexture(
  axis: "horizontal" | "vertical",
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = axis === "horizontal" ? 2048 : 256;
  canvas.height = axis === "horizontal" ? 128 : 1024;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#18120d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

  const segments = axis === "horizontal" ? 14 : 6;
  if (axis === "horizontal") {
    const segW = canvas.width / segments;
    for (let i = 0; i < segments; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(217, 119, 6, 0.22)" : "rgba(30, 41, 59, 0.35)";
      ctx.fillRect(i * segW, 8, segW, canvas.height - 16);
      // Label teks derajat BT dihapus agar bingkai bersih dan rapi
    }
  } else {
    const segH = canvas.height / segments;
    for (let i = 0; i < segments; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(217, 119, 6, 0.22)" : "rgba(30, 41, 59, 0.35)";
      ctx.fillRect(8, i * segH, canvas.width - 16, segH);
      // Label teks derajat LU/LS dihapus agar bingkai bersih dan rapi
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Membangun Bingkai Showcase Peta 3D Nusantara yang membungkus ubin OpenStreetMap
 * layaknya meja peta kartografi kayu jati berpelindung kuningan di museum.
 */
export function buildMapShowcaseFrame(
  mapCenterX: number,
  mapCenterZ: number,
  mapWidth: number,
  mapDepth: number,
  maxAnisotropy: number
): THREE.Group {
  const frameGroup = new THREE.Group();
  const bumpMap = getProceduralMicroReliefTexture();

  // 1. Deep Teakwood & Obsidian Outer Casing Material
  const woodFrameMat = new THREE.MeshStandardMaterial({
    color: 0x27170e,
    roughness: 0.52,
    metalness: 0.18,
    bumpMap,
    bumpScale: 0.02,
  });

  // 2. Brushed Antique Brass Trim Material
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.26,
    metalness: 0.86,
  });

  // 3. Dark Slate Base Bed under the map (top face sits cleanly at y = -0.005, renderOrder = 0)
  const baseBed = new THREE.Mesh(
    new THREE.BoxGeometry(mapWidth + 6.4, 1.2, mapDepth + 6.4),
    new THREE.MeshStandardMaterial({
      color: 0x090f1d,
      roughness: 0.65,
      metalness: 0.35,
    })
  );
  baseBed.position.set(mapCenterX, -0.605, mapCenterZ);
  baseBed.renderOrder = 0;
  frameGroup.add(baseBed);

  // 4. Inner Graduated Cartographic Degree Ruler Bezels (bottom sits at y = +0.02 above map tiles, renderOrder = 30)
  const bezelWidth = 1.05;
  const bezelHeight = 0.18;
  const bezelY = 0.11; // bottom at +0.02, top at +0.20
  const hRulerTex = createCartographicRulerTexture("horizontal", maxAnisotropy);
  const vRulerTex = createCartographicRulerTexture("vertical", maxAnisotropy);

  const hRulerMat = new THREE.MeshStandardMaterial({
    map: hRulerTex,
    color: 0xffffff,
    roughness: 0.45,
    metalness: 0.25,
  });
  const vRulerMat = new THREE.MeshStandardMaterial({
    map: vRulerTex,
    color: 0xffffff,
    roughness: 0.45,
    metalness: 0.25,
  });

  // North & South Ruler Strips (exact mapWidth so they don't overlap West/East strips)
  for (const dir of [-1, 1]) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(mapWidth, bezelHeight, bezelWidth),
      hRulerMat
    );
    strip.position.set(
      mapCenterX,
      bezelY,
      mapCenterZ + dir * (mapDepth / 2 + bezelWidth / 2)
    );
    strip.renderOrder = 30;
    frameGroup.add(strip);
  }

  // West & East Ruler Strips (exact mapDepth)
  for (const dir of [-1, 1]) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(bezelWidth, bezelHeight, mapDepth),
      vRulerMat
    );
    strip.position.set(
      mapCenterX + dir * (mapWidth / 2 + bezelWidth / 2),
      bezelY,
      mapCenterZ
    );
    strip.renderOrder = 30;
    frameGroup.add(strip);
  }

  // Four Brass Inner Ruler Corner Squares (fills the 4 bezel intersections without overlap)
  for (const dx of [-1, 1]) {
    for (const dz of [-1, 1]) {
      const bezelCorner = new THREE.Mesh(
        new THREE.BoxGeometry(bezelWidth, bezelHeight + 0.02, bezelWidth),
        brassMat
      );
      bezelCorner.position.set(
        mapCenterX + dx * (mapWidth / 2 + bezelWidth / 2),
        bezelY + 0.01,
        mapCenterZ + dz * (mapDepth / 2 + bezelWidth / 2)
      );
      bezelCorner.renderOrder = 30;
      frameGroup.add(bezelCorner);
    }
  }

  // 5. Raised Stepped Teakwood Outer Frame Walls (non-overlapping with corner plinths, renderOrder = 30)
  const outerWallThickness = 1.9;
  const innerSpanW = mapWidth + bezelWidth * 2;
  const innerSpanD = mapDepth + bezelWidth * 2;
  const wallHeight = 0.56;
  const wallY = 0.24;

  // North & South Outer Moulding Walls (span innerSpanW so corners are owned exclusively by cornerPlinth)
  for (const dir of [-1, 1]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(innerSpanW, wallHeight, outerWallThickness),
      woodFrameMat
    );
    wall.position.set(
      mapCenterX,
      wallY,
      mapCenterZ + dir * (innerSpanD / 2 + outerWallThickness / 2)
    );
    wall.renderOrder = 30;
    frameGroup.add(wall);

    // Brass inlay strip along top of outer wall
    const inlay = new THREE.Mesh(
      new THREE.BoxGeometry(innerSpanW - 0.1, 0.06, 0.28),
      brassMat
    );
    inlay.position.set(
      mapCenterX,
      wallY + wallHeight / 2 + 0.035,
      mapCenterZ + dir * (innerSpanD / 2 + outerWallThickness / 2)
    );
    inlay.renderOrder = 30;
    frameGroup.add(inlay);
  }

  // West & East Outer Moulding Walls (span innerSpanD)
  for (const dir of [-1, 1]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(outerWallThickness, wallHeight, innerSpanD),
      woodFrameMat
    );
    wall.position.set(
      mapCenterX + dir * (innerSpanW / 2 + outerWallThickness / 2),
      wallY,
      mapCenterZ
    );
    wall.renderOrder = 30;
    frameGroup.add(wall);

    const inlay = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.06, innerSpanD - 0.1),
      brassMat
    );
    inlay.position.set(
      mapCenterX + dir * (innerSpanW / 2 + outerWallThickness / 2),
      wallY + wallHeight / 2 + 0.035,
      mapCenterZ
    );
    inlay.renderOrder = 30;
    frameGroup.add(inlay);
  }

  // 6. Four Ornate Brass Corner Bosses / Medallions (NW, NE, SW, SE)
  for (const dx of [-1, 1]) {
    for (const dz of [-1, 1]) {
      const cx = mapCenterX + dx * (innerSpanW / 2 + outerWallThickness / 2);
      const cz = mapCenterZ + dz * (innerSpanD / 2 + outerWallThickness / 2);

      const cornerPlinth = new THREE.Mesh(
        new THREE.BoxGeometry(
          outerWallThickness,
          wallHeight + 0.14,
          outerWallThickness
        ),
        brassMat
      );
      cornerPlinth.position.set(cx, wallY + 0.05, cz);
      cornerPlinth.renderOrder = 30;

      const rosette = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.68, 0.14, 8),
        woodFrameMat
      );
      rosette.position.set(cx, wallY + wallHeight / 2 + 0.19, cz);
      rosette.renderOrder = 30;

      const jewel = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        brassMat
      );
      jewel.position.set(cx, wallY + wallHeight / 2 + 0.34, cz);
      jewel.renderOrder = 30;

      frameGroup.add(cornerPlinth, rosette, jewel);
    }
  }

  return frameGroup;
}

/**
 * Menghasilkan kanvas vektor instan kepulauan Nusantara sebagai latar belakang instan tanpa latensi ubin.
 */
export function createInstantArchipelagoVectorTexture(
  maxAnisotropy: number = 4
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#aad3df");
  grad.addColorStop(0.5, "#b8dce6");
  grad.addColorStop(1, "#9ec9d6");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const lonMin = 90.0;
  const lonMax = 146.0;
  const latMax = 9.5;
  const latMin = -12.5;

  const projectXY = (lat: number, lon: number): [number, number] => {
    const x = ((lon - lonMin) / (lonMax - lonMin)) * canvas.width;
    const y = ((latMax - lat) / (latMax - latMin)) * canvas.height;
    return [x, y];
  };

  // Subtle lat/lon graticule grid
  ctx.strokeStyle = "rgba(15, 23, 42, 0.08)";
  ctx.lineWidth = 1;
  for (let lon = 95; lon <= 145; lon += 5) {
    const [x] = projectXY(0, lon);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let lat = -10; lat <= 8; lat += 2) {
    const [, y] = projectXY(lat, 118);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  const islands: Array<{ name: string; pts: Array<[number, number]> }> = [
    {
      name: "SUMATERA",
      pts: [
        [5.6, 95.2],
        [4.2, 97.8],
        [1.5, 101.8],
        [-0.8, 103.8],
        [-2.8, 105.9],
        [-5.8, 105.7],
        [-5.5, 104.2],
        [-2.2, 101.0],
        [1.2, 98.6],
        [3.8, 96.1],
      ],
    },
    {
      name: "JAWA",
      pts: [
        [-6.0, 105.9],
        [-6.1, 107.5],
        [-6.7, 111.2],
        [-7.2, 113.5],
        [-8.4, 114.4],
        [-8.3, 111.8],
        [-7.8, 109.0],
        [-6.9, 106.2],
      ],
    },
    {
      name: "BALI & NUSA TENGGARA",
      pts: [
        [-8.1, 114.5],
        [-8.2, 116.5],
        [-8.3, 119.5],
        [-8.4, 123.5],
        [-9.8, 124.8],
        [-10.2, 120.2],
        [-8.9, 115.2],
      ],
    },
    {
      name: "KALIMANTAN",
      pts: [
        [2.1, 109.5],
        [4.3, 117.8],
        [1.2, 118.8],
        [-1.8, 116.6],
        [-3.6, 116.1],
        [-3.4, 111.6],
        [-1.2, 109.4],
      ],
    },
    {
      name: "SULAWESI",
      pts: [
        [1.4, 120.8],
        [1.6, 125.1],
        [0.4, 124.2],
        [-0.5, 120.1],
        [-1.8, 121.6],
        [-0.9, 123.4],
        [-4.5, 122.8],
        [-5.6, 120.4],
        [-5.5, 119.4],
        [-2.8, 118.9],
        [-0.5, 119.7],
      ],
    },
    {
      name: "MALUKU",
      pts: [
        [2.2, 127.8],
        [0.6, 128.7],
        [-0.8, 127.5],
        [-3.1, 128.0],
        [-3.7, 130.8],
        [-2.8, 130.4],
        [-0.5, 128.4],
      ],
    },
    {
      name: "PAPUA",
      pts: [
        [-0.7, 130.8],
        [-0.4, 132.8],
        [-1.6, 134.2],
        [-2.1, 138.5],
        [-2.6, 140.9],
        [-8.4, 140.8],
        [-8.2, 137.8],
        [-5.0, 135.2],
        [-4.1, 132.9],
        [-2.1, 130.4],
      ],
    },
  ];

  for (const island of islands) {
    ctx.save();
    ctx.beginPath();
    island.pts.forEach(([lat, lon], idx) => {
      const [x, y] = projectXY(lat, lon);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    ctx.fillStyle = "#e8ecd8";
    ctx.fill();
    ctx.strokeStyle = "#8da382";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const avgLat = island.pts.reduce((s, p) => s + p[0], 0) / island.pts.length;
    const avgLon = island.pts.reduce((s, p) => s + p[1], 0) / island.pts.length;
    const [lx, ly] = projectXY(avgLat, avgLon);
    ctx.font = '600 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = "#475569";
    ctx.textAlign = "center";
    ctx.fillText(island.name, lx, ly);
  }

  // Equator line (Garis Khatulistiwa 0°)
  const [, eqY] = projectXY(0, 118);
  ctx.save();
  ctx.setLineDash([12, 8]);
  ctx.strokeStyle = "rgba(217, 119, 6, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, eqY);
  ctx.lineTo(canvas.width, eqY);
  ctx.stroke();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/**
 * Membangun model 3D arsitektur budaya prosedural komposit (3–12 bagian)
 * berpusat di alas (y = 0) sehingga duduk presisi di permukaan peta 3D.
 */
export function buildCulturalArchetypeMesh(
  archetype: ModelArchetype | string,
  accentHex: string
): THREE.Group {
  const group = new THREE.Group();
  const bumpMap = getProceduralMicroReliefTexture();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.85,
    metalness: 0.1,
    bumpMap,
    bumpScale: 0.015,
  });
  const darkAndesiteMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.78,
    metalness: 0.15,
    bumpMap,
    bumpScale: 0.02,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x92400e,
    roughness: 0.68,
    metalness: 0.08,
    bumpMap,
    bumpScale: 0.012,
  });
  const thatchRoofMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.92,
    metalness: 0.04,
    bumpMap,
    bumpScale: 0.025,
  });
  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.28,
    metalness: 0.82,
    bumpMap,
    bumpScale: 0.01,
  });
  const goldAccentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentHex),
    emissive: new THREE.Color(accentHex),
    emissiveIntensity: 0.25,
    roughness: 0.22,
    metalness: 0.88,
  });
  const sailMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.52,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const terracottaMat = new THREE.MeshStandardMaterial({
    color: 0xc2410c,
    roughness: 0.72,
    metalness: 0.12,
  });

  // Plinth alas model (y = 0)
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.31, 0.053, 16),
    darkAndesiteMat
  );
  plinth.position.y = 0.0185;
  group.add(plinth);

  // Normalisasi nama archetype
  const key = archetype.toLowerCase();

  if (key.includes("menhir") || key.includes("megalith")) {
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.4), stoneMat);
    step1.position.y = 0.068;
    const step2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.28), darkAndesiteMat);
    step2.position.y = 0.122;
    const menhir = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.085, 0.36, 7), stoneMat);
    menhir.position.set(0, 0.31, 0);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.013, 8, 16), goldAccentMat);
    band.rotation.x = Math.PI / 2;
    band.position.set(0, 0.32, 0);
    const smallMenhir = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.045, 0.19, 6), darkAndesiteMat);
    smallMenhir.position.set(0.1, 0.2, 0.07);
    group.add(step1, step2, menhir, band, smallMenhir);
  } else if (key.includes("nekara")) {
    const pts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.15, 0.0),
      new THREE.Vector2(0.11, 0.13),
      new THREE.Vector2(0.14, 0.26),
      new THREE.Vector2(0.17, 0.36),
      new THREE.Vector2(0.0, 0.36),
    ];
    const drum = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), bronzeMat);
    drum.position.y = 0.038;
    const tympanum = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.024, 20), goldAccentMat);
    tympanum.position.y = 0.402;
    const sunStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), stoneMat);
    sunStar.position.y = 0.43;
    group.add(drum, tympanum, sunStar);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.008, 6, 12), goldAccentMat);
      handle.position.set(Math.cos(a) * 0.13, 0.24, Math.sin(a) * 0.13);
      handle.rotation.y = a;
      group.add(handle);
    }
  } else if (key.includes("stupa") || key.includes("borobudur")) {
    const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.46), darkAndesiteMat);
    t1.position.y = 0.068;
    const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.36), stoneMat);
    t2.position.y = 0.122;
    const t3 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.055, 0.26), darkAndesiteMat);
    t3.position.y = 0.174;
    const r1 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.045, 16), stoneMat);
    r1.position.y = 0.218;
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65), goldAccentMat);
    bell.position.y = 0.235;
    const harmika = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.04, 0.045), stoneMat);
    harmika.position.y = 0.335;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.11, 12), goldAccentMat);
    spire.position.y = 0.405;
    group.add(t1, t2, t3, r1, bell, harmika, spire);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const mini = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 10), stoneMat);
      mini.position.set(Math.cos(a) * 0.15, 0.225, Math.sin(a) * 0.15);
      group.add(mini);
    }
  } else if (key.includes("prambanan") || key.includes("candi")) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.42), darkAndesiteMat);
    base.position.y = 0.072;
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.23, 0.17), stoneMat);
    mainBody.position.y = 0.21;
    const mainRoof = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.19, 4), darkAndesiteMat);
    mainRoof.rotation.y = Math.PI / 4;
    mainRoof.position.y = 0.41;
    const ratna = new THREE.Mesh(new THREE.OctahedronGeometry(0.038, 0), goldAccentMat);
    ratna.position.y = 0.515;
    group.add(base, mainBody, mainRoof, ratna);
    for (const offsetX of [-0.13, 0.13]) {
      const sideTower = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.06, 0.24, 6), stoneMat);
      sideTower.position.set(offsetX, 0.21, 0.055);
      const sidePeak = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.085, 6), goldAccentMat);
      sidePeak.position.set(offsetX, 0.365, 0.055);
      group.add(sideTower, sidePeak);
    }
  } else if (key.includes("tajug") || key.includes("masjid")) {
    const walls = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.32), sailMat);
    walls.position.y = 0.102;
    const tier1 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.105, 4), terracottaMat);
    tier1.rotation.y = Math.PI / 4;
    tier1.position.y = 0.205;
    const tier2 = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.1, 4), woodMat);
    tier2.rotation.y = Math.PI / 4;
    tier2.position.y = 0.285;
    const tier3 = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.105, 4), terracottaMat);
    tier3.rotation.y = Math.PI / 4;
    tier3.position.y = 0.365;
    const mustaka = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 12), goldAccentMat);
    mustaka.position.y = 0.43;
    group.add(walls, tier1, tier2, tier3, mustaka);
  } else if (key.includes("pinisi") || key.includes("perahu")) {
    const cradle = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.055, 0.11), darkAndesiteMat);
    cradle.position.y = 0.062;
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.045, 0.42, 12), woodMat);
    hull.rotation.z = Math.PI / 2;
    hull.scale.set(1, 1, 0.65);
    hull.position.y = 0.105;
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 8), goldAccentMat);
    bow.rotation.z = -Math.PI / 3;
    bow.position.set(0.23, 0.155, 0);
    const mast1 = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.015, 0.36, 8), woodMat);
    mast1.position.set(0.045, 0.275, 0);
    const mast2 = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.013, 0.3, 8), woodMat);
    mast2.position.set(-0.085, 0.245, 0);
    const sail1 = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.22), sailMat);
    sail1.position.set(0.055, 0.295, 0.014);
    sail1.rotation.y = 0.2;
    const sail2 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.18), sailMat);
    sail2.position.set(-0.075, 0.265, -0.014);
    sail2.rotation.y = -0.15;
    const jib = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 3), goldAccentMat);
    jib.position.set(0.17, 0.245, 0);
    jib.rotation.z = -0.35;
    group.add(cradle, hull, bow, mast1, mast2, sail1, sail2, jib);
  } else if (key.includes("gadang")) {
    const stilts = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.075, 0.16), darkAndesiteMat);
    stilts.position.y = 0.072;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.2), woodMat);
    body.position.y = 0.15;
    const roofCenter = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.07, 0.23), thatchRoofMat);
    roofCenter.position.y = 0.235;
    const leftHorn = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 4), goldAccentMat);
    leftHorn.position.set(-0.18, 0.335, 0);
    leftHorn.rotation.z = 0.28;
    const rightHorn = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 4), goldAccentMat);
    rightHorn.position.set(0.18, 0.335, 0);
    rightHorn.rotation.z = -0.28;
    const centerHorn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), terracottaMat);
    centerHorn.position.set(0, 0.315, 0.045);
    group.add(stilts, body, roofCenter, leftHorn, rightHorn, centerHorn);
  } else if (key.includes("pura")) {
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.26, 0.13), terracottaMat);
      wing.position.set(side * 0.105, 0.165, 0.075);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.04, 0.15), goldAccentMat);
      trim.position.set(side * 0.105, 0.305, 0.075);
      group.add(wing, trim);
    }
    const meruBase = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.18), stoneMat);
    meruBase.position.set(0, 0.11, -0.075);
    group.add(meruBase);
    for (let t = 0; t < 3; t++) {
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.14 - t * 0.028, 0.085, 4), thatchRoofMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(0, 0.205 + t * 0.08, -0.075);
      group.add(roof);
    }
  } else if (key.includes("tongkonan")) {
    const stilts = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.115, 0.15), darkAndesiteMat);
    stilts.position.y = 0.092;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.17), terracottaMat);
    cabin.position.y = 0.19;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.22, 0.385, 0),
      new THREE.Vector3(-0.075, 0.24, 0),
      new THREE.Vector3(0.075, 0.24, 0),
      new THREE.Vector3(0.22, 0.385, 0),
    ]);
    const saddleRoof = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.06, 6, false), thatchRoofMat);
    const frontProw = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.11, 4), goldAccentMat);
    frontProw.position.set(0.22, 0.415, 0);
    frontProw.rotation.z = -0.45;
    const backProw = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.11, 4), goldAccentMat);
    backProw.position.set(-0.22, 0.415, 0);
    backProw.rotation.z = 0.45;
    group.add(stilts, cabin, saddleRoof, frontProw, backProw);
  } else if (key.includes("joglo") || key.includes("keraton")) {
    const floor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.055, 0.34), stoneMat);
    floor.position.y = 0.062;
    const pillars = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.2), woodMat);
    pillars.position.y = 0.14;
    const lowerRoof = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.28, 0.09, 4), terracottaMat);
    lowerRoof.rotation.y = Math.PI / 4;
    lowerRoof.position.y = 0.225;
    const upperJoglo = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.15, 0.135, 4), goldAccentMat);
    upperJoglo.rotation.y = Math.PI / 4;
    upperJoglo.position.y = 0.325;
    group.add(floor, pillars, lowerRoof, upperJoglo);
  } else if (key.includes("honai")) {
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.135, 16), woodMat);
    wall.position.set(-0.035, 0.102, 0);
    const dome1 = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.155, 16), thatchRoofMat);
    dome1.position.set(-0.035, 0.225, 0);
    const domeTop = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), goldAccentMat);
    domeTop.position.set(-0.035, 0.275, 0);
    const smallWall = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.1, 12), woodMat);
    smallWall.position.set(0.13, 0.088, 0.075);
    const smallRoof = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.115, 12), thatchRoofMat);
    smallRoof.position.set(0.13, 0.18, 0.075);
    group.add(wall, dome1, domeTop, smallWall, smallRoof);
  } else if (key.includes("benteng")) {
    const fortBase = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.09, 0.44), darkAndesiteMat);
    fortBase.position.y = 0.08;
    const innerWalls = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), terracottaMat);
    innerWalls.position.y = 0.165;
    const watchTower = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.24, 8), stoneMat);
    watchTower.position.set(0, 0.3, 0);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.1, 8), goldAccentMat);
    roof.position.set(0, 0.44, 0);
    group.add(fortBase, innerWalls, watchTower, roof);
    for (const dx of [-0.18, 0.18]) {
      for (const dz of [-0.18, 0.18]) {
        const bastion = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), darkAndesiteMat);
        bastion.position.set(dx, 0.11, dz);
        group.add(bastion);
      }
    }
  } else if (key.includes("gapura")) {
    const gapuraFloor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.25), darkAndesiteMat);
    gapuraFloor.position.y = 0.06;
    for (const sx of [-0.1, 0.1]) {
      const pylon1 = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.2, 0.14), terracottaMat);
      pylon1.position.set(sx, 0.17, 0);
      const pylon2 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.15, 0.12), terracottaMat);
      pylon2.position.set(sx, 0.32, 0);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 4), goldAccentMat);
      crown.rotation.y = Math.PI / 4;
      crown.position.set(sx, 0.45, 0);
      group.add(pylon1, pylon2, crown);
    }
    group.add(gapuraFloor);
  } else if (key.includes("prasasti")) {
    const plinthPrasasti = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.24), darkAndesiteMat);
    plinthPrasasti.position.y = 0.065;
    const stele = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.34, 0.08), stoneMat);
    stele.position.set(0, 0.25, 0);
    const steleArch = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12, 1, false, 0, Math.PI), stoneMat);
    steleArch.rotation.z = Math.PI / 2;
    steleArch.position.set(0, 0.42, 0);
    const goldenScript = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.01), goldAccentMat);
    goldenScript.position.set(0, 0.25, 0.042);
    group.add(plinthPrasasti, stele, steleArch, goldenScript);
  } else {
    // monumen_nasional / default
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.055, 0.36), sailMat);
    pedestal.position.y = 0.062;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.085, 0.1, 8), sailMat);
    cup.position.y = 0.132;
    const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.045, 0.34, 8), sailMat);
    obelisk.position.y = 0.345;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.08), bronzeMat);
    deck.position.y = 0.515;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.1, 10), goldAccentMat);
    flame.position.y = 0.575;
    group.add(pedestal, cup, obelisk, deck, flame);
  }

  group.traverse((child) => {
    child.renderOrder = 25;
  });

  return group;
}
