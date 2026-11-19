import * as THREE from "three";
import type { SiteWithCategory } from "@/data";
import { geoToWorld } from "./coordinates";
import { getSiteAccentColor, getSiteArchetype } from "./siteArchetypes";
import type {
  CulturalMonumentInstance,
  ModelArchetype,
  MonumentSystem,
  ProceduralTextureSet,
  SharedMaterials,
} from "./types";

export function createSharedMaterials(textures: ProceduralTextureSet): SharedMaterials {
  return {
    andesite: new THREE.MeshStandardMaterial({
      color: 0x6a6e73,
      roughness: 0.88,
      metalness: 0.05,
      bumpMap: textures.stoneBumpMap,
      bumpScale: 0.03,
    }),
    terracotta: new THREE.MeshStandardMaterial({
      color: 0xa44b32,
      roughness: 0.78,
      metalness: 0.04,
      bumpMap: textures.stoneBumpMap,
      bumpScale: 0.025,
    }),
    teakwood: new THREE.MeshStandardMaterial({
      color: 0x6c4228,
      roughness: 0.72,
      metalness: 0.04,
      bumpMap: textures.woodGrainMap,
      bumpScale: 0.02,
    }),
    darkPalm: new THREE.MeshStandardMaterial({
      color: 0x262322,
      roughness: 0.92,
      metalness: 0.02,
      bumpMap: textures.woodGrainMap,
      bumpScale: 0.03,
    }),
    goldLeaf: new THREE.MeshStandardMaterial({
      color: 0xe8b64c,
      roughness: 0.22,
      metalness: 0.9,
    }),
    bronzePatina: new THREE.MeshStandardMaterial({
      color: 0x638571,
      roughness: 0.42,
      metalness: 0.68,
    }),
    limestone: new THREE.MeshStandardMaterial({
      color: 0xd9cdb8,
      roughness: 0.68,
      metalness: 0.05,
      bumpMap: textures.stoneBumpMap,
      bumpScale: 0.015,
    }),
    sailCloth: new THREE.MeshStandardMaterial({
      color: 0xf0e6d2,
      roughness: 0.82,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
    brickRed: new THREE.MeshStandardMaterial({
      color: 0xb33d26,
      roughness: 0.75,
      metalness: 0.04,
      bumpMap: textures.stoneBumpMap,
      bumpScale: 0.03,
    }),
    contactShadow: new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
    beaconBacking: new THREE.MeshBasicMaterial({
      color: 0x0b1822,
      transparent: true,
      opacity: 0.92,
    }),
    beaconHighlight: new THREE.MeshBasicMaterial({
      color: 0xf9f5ed,
    }),
  };
}

function addPart(
  parent: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
  castShadow = true
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.set(rot[0], rot[1], rot[2]);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/**
 * Membangun model 3D prosedural Nusantara komposit (4–10 bagian) berpusat di y = 0.
 */
export function buildCompositeArchetype(
  archetype: ModelArchetype,
  mats: SharedMaterials,
  accentHex: string,
  geometriesToTrack: THREE.BufferGeometry[],
  materialsToTrack: THREE.Material[]
): THREE.Group {
  const g = new THREE.Group();
  const track = <T extends THREE.BufferGeometry>(geo: T): T => {
    geometriesToTrack.push(geo);
    return geo;
  };

  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentHex),
    roughness: 0.35,
    metalness: 0.45,
  });
  materialsToTrack.push(accentMat);

  switch (archetype) {
    case "stupa": {
      // Candi Borobudur / Stupa Buddha berundak
      addPart(g, track(new THREE.BoxGeometry(1.22, 0.14, 1.22)), mats.andesite, [0, 0.07, 0]);
      addPart(g, track(new THREE.BoxGeometry(0.96, 0.14, 0.96)), mats.andesite, [0, 0.21, 0]);
      addPart(g, track(new THREE.BoxGeometry(0.72, 0.12, 0.72)), mats.andesite, [0, 0.34, 0]);

      const stupaProfile = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.26, 0),
        new THREE.Vector2(0.26, 0.12),
        new THREE.Vector2(0.2, 0.28),
        new THREE.Vector2(0.09, 0.38),
        new THREE.Vector2(0.03, 0.48),
        new THREE.Vector2(0, 0.58),
      ];
      addPart(g, track(new THREE.LatheGeometry(stupaProfile, 16)), mats.andesite, [0, 0.4, 0]);
      addPart(g, track(new THREE.ConeGeometry(0.045, 0.25, 8)), mats.goldLeaf, [0, 1.02, 0]);

      const corners: Array<[number, number]> = [
        [-0.38, -0.38],
        [0.38, -0.38],
        [-0.38, 0.38],
        [0.38, 0.38],
      ];
      const miniStupa = track(new THREE.CylinderGeometry(0.045, 0.085, 0.18, 8));
      corners.forEach(([cx, cz]) => {
        addPart(g, miniStupa, mats.limestone, [cx, 0.38, cz]);
      });
      break;
    }

    case "prambanan": {
      // Candi Prambanan / Candi Siwa ramping menjulang
      addPart(g, track(new THREE.BoxGeometry(1.24, 0.14, 0.76)), mats.andesite, [0, 0.07, 0]);
      addPart(g, track(new THREE.BoxGeometry(0.38, 0.52, 0.38)), mats.andesite, [0, 0.4, 0]);
      addPart(
        g,
        track(new THREE.ConeGeometry(0.26, 0.68, 4)),
        mats.andesite,
        [0, 0.98, 0],
        [0, Math.PI / 4, 0]
      );
      addPart(g, track(new THREE.CylinderGeometry(0.03, 0.065, 0.2, 8)), mats.goldLeaf, [0, 1.38, 0]);

      [-0.4, 0.4].forEach((ox) => {
        addPart(g, track(new THREE.BoxGeometry(0.26, 0.36, 0.26)), mats.andesite, [ox, 0.32, 0]);
        addPart(
          g,
          track(new THREE.ConeGeometry(0.18, 0.48, 4)),
          mats.andesite,
          [ox, 0.74, 0],
          [0, Math.PI / 4, 0]
        );
        addPart(g, track(new THREE.SphereGeometry(0.042, 8, 8)), mats.goldLeaf, [ox, 1.0, 0]);
      });
      break;
    }

    case "tajug": {
      // Masjid Atap Tumpang Nusantara (Demak, Kudus, Banten)
      addPart(g, track(new THREE.BoxGeometry(1.14, 0.14, 1.14)), mats.limestone, [0, 0.07, 0]);
      addPart(g, track(new THREE.BoxGeometry(0.88, 0.26, 0.88)), mats.teakwood, [0, 0.27, 0]);
      addPart(
        g,
        track(new THREE.ConeGeometry(0.78, 0.28, 4)),
        mats.terracotta,
        [0, 0.54, 0],
        [0, Math.PI / 4, 0]
      );
      addPart(
        g,
        track(new THREE.ConeGeometry(0.56, 0.25, 4)),
        mats.darkPalm,
        [0, 0.75, 0],
        [0, Math.PI / 4, 0]
      );
      addPart(
        g,
        track(new THREE.ConeGeometry(0.36, 0.23, 4)),
        mats.terracotta,
        [0, 0.95, 0],
        [0, Math.PI / 4, 0]
      );
      addPart(g, track(new THREE.CylinderGeometry(0.03, 0.055, 0.22, 8)), mats.goldLeaf, [0, 1.14, 0]);
      break;
    }

    case "benteng": {
      // Benteng pertahanan (Fort Rotterdam, Somba Opu, Marlborough, Belgica)
      addPart(g, track(new THREE.BoxGeometry(1.26, 0.22, 1.26)), mats.andesite, [0, 0.11, 0]);
      addPart(g, track(new THREE.BoxGeometry(0.94, 0.24, 0.94)), mats.brickRed, [0, 0.34, 0]);

      // Sudut bastion bintang (4 sudut)
      const bastions: Array<[number, number]> = [
        [-0.52, -0.52],
        [0.52, -0.52],
        [-0.52, 0.52],
        [0.52, 0.52],
      ];
      bastions.forEach(([bx, bz]) => {
        addPart(
          g,
          track(new THREE.ConeGeometry(0.24, 0.44, 4)),
          mats.andesite,
          [bx, 0.44, bz],
          [0, Math.PI / 4, 0]
        );
        addPart(g, track(new THREE.SphereGeometry(0.045, 6, 6)), mats.bronzePatina, [bx, 0.68, bz]);
      });

      // Menara pengawas tengah / mercu
      addPart(g, track(new THREE.CylinderGeometry(0.12, 0.16, 0.52, 8)), mats.limestone, [0, 0.6, 0]);
      addPart(g, track(new THREE.ConeGeometry(0.18, 0.24, 8)), mats.terracotta, [0, 0.92, 0]);
      addPart(g, track(new THREE.CylinderGeometry(0.015, 0.015, 0.32, 4)), mats.goldLeaf, [0, 1.15, 0]);
      break;
    }

    case "gapura": {
      // Gapura Paduraksa / Candi Bentar bata merah Majapahit (Trowulan)
      addPart(g, track(new THREE.BoxGeometry(1.2, 0.12, 0.7)), mats.andesite, [0, 0.06, 0]);

      [-0.28, 0.28].forEach((gx) => {
        addPart(g, track(new THREE.BoxGeometry(0.32, 0.44, 0.42)), mats.brickRed, [gx, 0.34, 0]);
        addPart(g, track(new THREE.BoxGeometry(0.26, 0.34, 0.36)), mats.brickRed, [gx, 0.72, 0]);
        addPart(
          g,
          track(new THREE.ConeGeometry(0.18, 0.42, 4)),
          mats.brickRed,
          [gx, 1.08, 0],
          [0, Math.PI / 4, 0]
        );
        addPart(g, track(new THREE.SphereGeometry(0.04, 6, 6)), mats.goldLeaf, [gx, 1.32, 0]);
      });
      break;
    }

    case "prasasti": {
      // Prasasti Batu Berukir / Yupa / Ciaruteun
      addPart(g, track(new THREE.CylinderGeometry(0.52, 0.58, 0.12, 8)), mats.andesite, [0, 0.06, 0]);
      addPart(g, track(new THREE.CylinderGeometry(0.38, 0.44, 0.1, 8)), mats.limestone, [0, 0.17, 0]);

      // Batu prasasti tegak dengan relief
      addPart(
        g,
        track(new THREE.BoxGeometry(0.38, 0.74, 0.18)),
        mats.andesite,
        [0, 0.58, 0],
        [0, 0, 0]
      );
      addPart(
        g,
        track(new THREE.CylinderGeometry(0.18, 0.18, 0.18, 12, 1, false, 0, Math.PI)),
        mats.andesite,
        [0, 0.95, 0],
        [Math.PI / 2, 0, -Math.PI / 2]
      );
      // Ukiran aksara emas
      addPart(g, track(new THREE.BoxGeometry(0.28, 0.46, 0.02)), mats.goldLeaf, [0, 0.6, 0.095]);
      break;
    }

    case "gadang": {
      // Rumah Gadang Minangkabau (atap gonjong lengkung tanduk kerbau)
      addPart(g, track(new THREE.BoxGeometry(1.12, 0.12, 0.68)), mats.teakwood, [0, 0.14, 0]);
      [-0.44, 0, 0.44].forEach((px) => {
        addPart(g, track(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 6)), mats.darkPalm, [
          px,
          0.09,
          0.24,
        ]);
        addPart(g, track(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 6)), mats.darkPalm, [
          px,
          0.09,
          -0.24,
        ]);
      });
      addPart(g, track(new THREE.BoxGeometry(1.02, 0.3, 0.56)), mats.teakwood, [0, 0.35, 0]);
      addPart(g, track(new THREE.BoxGeometry(0.74, 0.24, 0.6)), mats.darkPalm, [0, 0.58, 0]);

      // Gonjong kiri dan kanan
      addPart(
        g,
        track(new THREE.ConeGeometry(0.22, 0.62, 4)),
        mats.darkPalm,
        [-0.48, 0.82, 0],
        [0, Math.PI / 4, 0.42]
      );
      addPart(
        g,
        track(new THREE.ConeGeometry(0.22, 0.62, 4)),
        mats.darkPalm,
        [0.48, 0.82, 0],
        [0, Math.PI / 4, -0.42]
      );
      addPart(
        g,
        track(new THREE.ConeGeometry(0.18, 0.48, 4)),
        mats.goldLeaf,
        [0, 0.86, 0],
        [0, Math.PI / 4, 0]
      );
      break;
    }

    case "pura": {
      // Pura Bali / Meru bertingkat & Candi Bentar
      addPart(g, track(new THREE.BoxGeometry(1.16, 0.1, 0.92)), mats.andesite, [0, 0.05, 0]);
      addPart(g, track(new THREE.BoxGeometry(0.16, 0.46, 0.18)), mats.brickRed, [-0.28, 0.34, 0.32]);
      addPart(g, track(new THREE.BoxGeometry(0.16, 0.46, 0.18)), mats.brickRed, [0.28, 0.34, 0.32]);
      addPart(g, track(new THREE.BoxGeometry(0.44, 0.26, 0.44)), mats.brickRed, [0, 0.24, -0.1]);

      for (let i = 0; i < 4; i++) {
        const w = 0.48 - i * 0.085;
        addPart(
          g,
          track(new THREE.ConeGeometry(w, 0.18, 4)),
          mats.darkPalm,
          [0, 0.46 + i * 0.17, -0.1],
          [0, Math.PI / 4, 0]
        );
      }
      addPart(g, track(new THREE.ConeGeometry(0.05, 0.19, 8)), mats.goldLeaf, [0, 1.18, -0.1]);
      break;
    }

    case "tongkonan": {
      // Rumah Tongkonan Toraja (atap melengkung perahu)
      addPart(g, track(new THREE.BoxGeometry(0.78, 0.1, 0.5)), mats.teakwood, [0, 0.14, 0]);
      addPart(g, track(new THREE.BoxGeometry(0.7, 0.26, 0.42)), mats.terracotta, [0, 0.32, 0]);
      const roofCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.64, 0.92, 0),
        new THREE.Vector3(0, 0.58, 0),
        new THREE.Vector3(0.64, 0.92, 0),
      ]);
      addPart(g, track(new THREE.TubeGeometry(roofCurve, 12, 0.17, 6, false)), mats.darkPalm, [0, 0, 0]);
      addPart(g, track(new THREE.CylinderGeometry(0.03, 0.03, 0.82, 6)), mats.teakwood, [0.48, 0.42, 0]);
      addPart(g, track(new THREE.ConeGeometry(0.065, 0.18, 6)), mats.goldLeaf, [0.58, 1.02, 0]);
      break;
    }

    case "pinisi": {
      // Kapal Perahu Layar Pinisi Nusantara
      const hullShape = new THREE.Shape();
      hullShape.moveTo(-0.64, 0.18);
      hullShape.quadraticCurveTo(0, -0.06, 0.7, 0.23);
      hullShape.lineTo(0.48, -0.13);
      hullShape.quadraticCurveTo(0, -0.21, -0.52, -0.11);
      hullShape.closePath();

      const hullGeo = track(
        new THREE.ExtrudeGeometry(hullShape, {
          depth: 0.3,
          bevelEnabled: true,
          bevelThickness: 0.04,
          bevelSize: 0.04,
          bevelSegments: 2,
        })
      );
      hullGeo.translate(0, 0.22, -0.15);
      addPart(g, hullGeo, mats.teakwood, [0, 0, 0]);

      // Tiang layar utama & depan
      addPart(g, track(new THREE.CylinderGeometry(0.026, 0.036, 0.96, 8)), mats.teakwood, [-0.15, 0.74, 0]);
      addPart(g, track(new THREE.CylinderGeometry(0.022, 0.032, 0.82, 8)), mats.teakwood, [0.24, 0.68, 0]);
      addPart(
        g,
        track(new THREE.CylinderGeometry(0.016, 0.026, 0.5, 6)),
        mats.teakwood,
        [0.8, 0.46, 0],
        [0, 0, -1.15]
      );
      // Layar kanvas
      addPart(
        g,
        track(new THREE.PlaneGeometry(0.4, 0.58)),
        mats.sailCloth,
        [-0.15, 0.78, 0.04],
        [0, 0.15, 0]
      );
      addPart(
        g,
        track(new THREE.PlaneGeometry(0.34, 0.5)),
        mats.sailCloth,
        [0.24, 0.72, 0.04],
        [0, 0.15, 0]
      );
      addPart(g, track(new THREE.SphereGeometry(0.045, 8, 8)), mats.goldLeaf, [-0.15, 1.25, 0]);
      break;
    }

    case "nekara": {
      // Nekara Perunggu Dong Son / Pejeng
      addPart(g, track(new THREE.CylinderGeometry(0.48, 0.56, 0.14, 12)), mats.andesite, [0, 0.07, 0]);
      const drumProfile = [
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.3, 0.0),
        new THREE.Vector2(0.23, 0.24),
        new THREE.Vector2(0.27, 0.44),
        new THREE.Vector2(0.4, 0.58),
        new THREE.Vector2(0.4, 0.66),
        new THREE.Vector2(0.0, 0.66),
      ];
      addPart(g, track(new THREE.LatheGeometry(drumProfile, 20)), mats.bronzePatina, [0, 0.14, 0]);
      addPart(
        g,
        track(new THREE.TorusGeometry(0.34, 0.026, 8, 20)),
        mats.goldLeaf,
        [0, 0.81, 0],
        [Math.PI / 2, 0, 0]
      );
      break;
    }

    case "megalith": {
      // Peninggalan Megalitik (Sangiran, Liang Bua, Pasemah, Bada)
      addPart(g, track(new THREE.CylinderGeometry(0.6, 0.68, 0.12, 8)), mats.andesite, [0, 0.06, 0]);
      addPart(g, track(new THREE.CylinderGeometry(0.44, 0.5, 0.1, 8)), mats.andesite, [0, 0.17, 0]);
      addPart(
        g,
        track(new THREE.CylinderGeometry(0.12, 0.17, 0.82, 6)),
        mats.limestone,
        [0, 0.64, 0],
        [0.04, 0.2, -0.03]
      );
      addPart(g, track(new THREE.BoxGeometry(0.34, 0.09, 0.26)), mats.andesite, [0.26, 0.27, 0.2]);
      addPart(
        g,
        track(new THREE.CylinderGeometry(0.045, 0.055, 0.38, 6)),
        mats.andesite,
        [-0.28, 0.4, -0.19],
        [-0.08, 0, 0.06]
      );
      break;
    }

    case "joglo": {
      // Rumah Adat & Keraton Joglo Jawa
      addPart(g, track(new THREE.BoxGeometry(1.16, 0.12, 0.96)), mats.limestone, [0, 0.06, 0]);
      [
        [-0.26, -0.22],
        [0.26, -0.22],
        [-0.26, 0.22],
        [0.26, 0.22],
      ].forEach(([px, pz]) => {
        addPart(g, track(new THREE.CylinderGeometry(0.032, 0.038, 0.38, 8)), mats.teakwood, [
          px,
          0.31,
          pz,
        ]);
      });
      addPart(
        g,
        track(new THREE.ConeGeometry(0.8, 0.26, 4)),
        mats.terracotta,
        [0, 0.58, 0],
        [0, Math.PI / 4, 0]
      );
      addPart(
        g,
        track(new THREE.ConeGeometry(0.4, 0.36, 4)),
        mats.terracotta,
        [0, 0.85, 0],
        [0, Math.PI / 4, 0]
      );
      addPart(g, track(new THREE.SphereGeometry(0.055, 8, 8)), mats.goldLeaf, [0, 1.06, 0]);
      break;
    }

    case "honai": {
      // Rumah Tradisional Honai Papua
      addPart(g, track(new THREE.CylinderGeometry(0.48, 0.52, 0.08, 14)), mats.andesite, [0, 0.04, 0]);
      addPart(g, track(new THREE.CylinderGeometry(0.38, 0.4, 0.36, 12)), mats.teakwood, [0, 0.26, 0]);
      addPart(g, track(new THREE.ConeGeometry(0.48, 0.55, 12)), mats.darkPalm, [0, 0.68, 0]);
      addPart(g, track(new THREE.CylinderGeometry(0.03, 0.04, 0.15, 6)), mats.teakwood, [0, 0.99, 0]);
      break;
    }

    case "monument":
    default: {
      // Monumen Kemerdekaan, Tugu, atau Bangunan Kolonial Bersejarah
      addPart(g, track(new THREE.CylinderGeometry(0.52, 0.6, 0.14, 8)), mats.limestone, [0, 0.07, 0]);
      addPart(g, track(new THREE.BoxGeometry(0.48, 0.18, 0.48)), mats.limestone, [0, 0.23, 0]);
      addPart(
        g,
        track(new THREE.CylinderGeometry(0.09, 0.17, 0.9, 4)),
        mats.limestone,
        [0, 0.74, 0],
        [0, Math.PI / 4, 0]
      );
      addPart(g, track(new THREE.ConeGeometry(0.095, 0.26, 10)), mats.goldLeaf, [0, 1.28, 0]);
      break;
    }
  }

  // Cincin alas aksen khas situs di sekeliling model 3D
  const ringGeo = track(new THREE.TorusGeometry(0.64, 0.025, 8, 24));
  addPart(g, ringGeo, accentMat, [0, 0.025, 0], [Math.PI / 2, 0, 0], false);

  return g;
}

export function createCulturalMonuments(
  sites: SiteWithCategory[],
  textures: ProceduralTextureSet,
  getSurfaceY: (lat: number, lon: number) => number,
  isSoftwareGl: boolean
): MonumentSystem {
  const group = new THREE.Group();
  group.name = "CulturalMonuments";

  const mats = createSharedMaterials(textures);
  const trackedGeometries: THREE.BufferGeometry[] = [];
  const trackedMaterials: THREE.Material[] = Object.values(mats);

  const shadowGeo = new THREE.CircleGeometry(0.78, 20);
  const haloGeo = new THREE.RingGeometry(0.68, 0.86, 24);
  const pulseRingGeo = new THREE.RingGeometry(0.32, 0.44, 28);
  const beaconOuterGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.04, 18);
  const beaconCoreGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 18);
  const beaconInnerGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 14);
  const proxyGeo = new THREE.CylinderGeometry(0.95, 0.95, 1.6, 8);
  const proxyMat = new THREE.MeshBasicMaterial({ visible: false });

  trackedGeometries.push(
    shadowGeo,
    haloGeo,
    pulseRingGeo,
    beaconOuterGeo,
    beaconCoreGeo,
    beaconInnerGeo,
    proxyGeo
  );
  trackedMaterials.push(proxyMat);

  const monuments: CulturalMonumentInstance[] = [];
  const hitProxies: THREE.Mesh[] = [];
  const monumentBySlug = new Map<string, CulturalMonumentInstance>();

  sites.forEach((site) => {
    const { x, z } = geoToWorld(site.coords.lat, site.coords.lng);
    const surfaceY = getSurfaceY(site.coords.lat, site.coords.lng);
    const archetype = getSiteArchetype(site);
    const accentColor = getSiteAccentColor(site);

    const root = new THREE.Group();
    root.name = `Monument_${site.slug}`;
    root.position.set(x, surfaceY, z);

    // 1. Bayangan kontak lantai
    const shadowMesh = new THREE.Mesh(shadowGeo, mats.contactShadow);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.012;
    root.add(shadowMesh);

    // 2. Halo resonansi zaman / seleksi
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(accentColor),
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    trackedMaterials.push(haloMaterial);

    const haloMesh = new THREE.Mesh(haloGeo, haloMaterial);
    haloMesh.rotation.x = -Math.PI / 2;
    haloMesh.position.y = 0.018;
    root.add(haloMesh);

    // 3. Titik pemancar denyut (overview pulsing beacon dot) saat zoom jauh
    const pulseGroup = new THREE.Group();
    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(accentColor),
    });
    const pulseMatA = new THREE.MeshBasicMaterial({
      color: new THREE.Color(accentColor),
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const pulseMatB = new THREE.MeshBasicMaterial({
      color: new THREE.Color(accentColor),
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    trackedMaterials.push(coreMat, pulseMatA, pulseMatB);

    const backing = new THREE.Mesh(beaconOuterGeo, mats.beaconBacking);
    backing.position.y = 0.025;
    pulseGroup.add(backing);

    const core = new THREE.Mesh(beaconCoreGeo, coreMat);
    core.position.y = 0.04;
    pulseGroup.add(core);

    const inner = new THREE.Mesh(beaconInnerGeo, mats.beaconHighlight);
    inner.position.y = 0.052;
    pulseGroup.add(inner);

    const pulseRingA = new THREE.Mesh(pulseRingGeo, pulseMatA);
    pulseRingA.rotation.x = -Math.PI / 2;
    pulseRingA.position.y = 0.022;
    pulseGroup.add(pulseRingA);

    const pulseRingB = new THREE.Mesh(pulseRingGeo, pulseMatB);
    pulseRingB.rotation.x = -Math.PI / 2;
    pulseRingB.position.y = 0.024;
    pulseGroup.add(pulseRingB);

    root.add(pulseGroup);

    // 4. Model 3D Komposit Prosedural
    const modelGroup = buildCompositeArchetype(
      archetype,
      mats,
      accentColor,
      trackedGeometries,
      trackedMaterials
    );
    modelGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        if (isSoftwareGl) m.castShadow = false;
      }
    });
    modelGroup.visible = false;
    root.add(modelGroup);

    // 5. Proxy Raycast Layer 1 untuk seleksi klik & hover berkecepatan tinggi
    const hitProxy = new THREE.Mesh(proxyGeo, proxyMat);
    hitProxy.position.y = 0.7;
    hitProxy.layers.set(1);
    hitProxy.userData.siteSlug = site.slug;
    root.add(hitProxy);
    hitProxies.push(hitProxy);

    group.add(root);

    const inst: CulturalMonumentInstance = {
      site,
      root,
      modelGroup,
      shadowMesh,
      haloMesh,
      haloMaterial,
      pulseGroup,
      pulseRingA,
      pulseMatA,
      pulseRingB,
      pulseMatB,
      hitProxy,
      baseY: surfaceY,
      currentScale: 0,
      targetScale: 0,
      dotScale: 0,
      targetDotScale: 0,
      isSelected: false,
      isPulse: false,
      exists: true,
      active: true,
      eventCount: 0,
      archetype,
      accentColor,
    };

    monuments.push(inst);
    monumentBySlug.set(site.slug, inst);
  });

  return {
    group,
    monuments,
    hitProxies,
    monumentBySlug,
    dispose: () => {
      trackedGeometries.forEach((g) => g.dispose());
      trackedMaterials.forEach((m) => m.dispose());
      monuments.length = 0;
      hitProxies.length = 0;
      monumentBySlug.clear();
    },
  };
}
