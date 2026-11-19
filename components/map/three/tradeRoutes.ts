import * as THREE from "three";
import { geoToWorld } from "./coordinates";
import type { CulturalRouteDefinition, RouteArcInstance, RouteSystem } from "./types";

export const HISTORICAL_CULTURAL_ROUTES: CulturalRouteDefinition[] = [
  {
    id: "jalur-austronesia",
    name: "Jalur Migrasi Pelayar Austronesia",
    appearYear: -2500,
    fadeYear: 600,
    color: "#d98a4e",
    description: "Rute pelayaran awal pembawa bahasa Austronesia, tradisi bahari, dan perahu bercadik.",
    points: [
      { lat: 1.4, lng: 125.1 },
      { lat: -3.5, lng: 122.5 },
      { lat: -5.2, lng: 119.4 },
      { lat: -8.3, lng: 115.4 },
      { lat: -6.8, lng: 108.5 },
    ],
  },
  {
    id: "jalur-hindu-buddha",
    name: "Jalur Mandala & Candi Hindu-Buddha",
    appearYear: 400,
    fadeYear: 1500,
    color: "#e2a84b",
    description: "Penyebaran aksara Pallawa-Kawi, pusat studi Sriwijaya, kosmologi candi, dan kemaritiman Majapahit.",
    points: [
      { lat: -2.99, lng: 104.76 }, // Sriwijaya / Palembang
      { lat: -1.48, lng: 103.67 }, // Muarajambi
      { lat: -6.2, lng: 106.8 }, // Tarumanegara
      { lat: -7.61, lng: 110.2 }, // Borobudur
      { lat: -7.75, lng: 110.49 }, // Prambanan
      { lat: -7.55, lng: 112.4 }, // Trowulan
      { lat: -8.37, lng: 115.45 }, // Bali
    ],
  },
  {
    id: "jalur-kesultanan-rempah",
    name: "Jalur Kesultanan & Niaga Rempah Nusantara",
    appearYear: 1250,
    fadeYear: 1850,
    color: "#38b293",
    description: "Jaringan ulama, pedagang rempah, dan armada maritim dari Samudra Pasai hingga Maluku.",
    points: [
      { lat: 5.12, lng: 97.2 }, // Samudra Pasai
      { lat: -0.46, lng: 100.59 }, // Pagaruyung
      { lat: -6.04, lng: 106.15 }, // Banten
      { lat: -6.89, lng: 110.64 }, // Demak
      { lat: -5.14, lng: 119.41 }, // Somba Opu / Makassar
      { lat: -4.52, lng: 129.9 }, // Banda Neira
      { lat: 0.79, lng: 127.36 }, // Ternate-Tidore
    ],
  },
  {
    id: "jalur-pergerakan-nusantara",
    name: "Jaringan Pergerakan & Persatuan Nusantara",
    appearYear: 1908,
    fadeYear: 2026,
    color: "#7da8d6",
    description: "Gelombang kesadaran nasional yang menyatukan seluruh kepulauan dari Sabang sampai Merauke.",
    points: [
      { lat: 3.5, lng: 98.7 },
      { lat: -6.18, lng: 106.84 },
      { lat: -7.81, lng: 110.36 },
      { lat: -5.14, lng: 119.41 },
      { lat: -2.53, lng: 140.7 },
    ],
  },
  {
    id: "jalur-setapak-inti",
    name: "Rute Koridor Warisan Klasik SETAPAK",
    appearYear: 700,
    fadeYear: 2026,
    color: "#e7b75f",
    description: "Poros cagar budaya klasik: Muarajambi - Prambanan - Borobudur - Trowulan.",
    points: [
      { lat: -1.48, lng: 103.67 }, // Muarajambi
      { lat: -7.61, lng: 110.2 }, // Borobudur
      { lat: -7.75, lng: 110.49 }, // Prambanan
      { lat: -7.55, lng: 112.4 }, // Trowulan
    ],
  },
];

export function createCulturalRoutes(
  getSurfaceY: (lat: number, lon: number) => number,
  routesList: CulturalRouteDefinition[] = HISTORICAL_CULTURAL_ROUTES
): RouteSystem {
  const group = new THREE.Group();
  group.name = "CulturalDiffusionRoutes";

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const beadGeo = new THREE.SphereGeometry(0.14, 12, 12);
  geometries.push(beadGeo);

  let elapsed = 0;

  const routes: RouteArcInstance[] = routesList.map((route, idx) => {
    const vectors: THREE.Vector3[] = [];
    for (let i = 0; i < route.points.length; i++) {
      const p = route.points[i];
      const world = geoToWorld(p.lat, p.lng);
      const y = getSurfaceY(p.lat, p.lng) + 0.12;
      vectors.push(new THREE.Vector3(world.x, y, world.z));

      // Busur lengkung elegan melintasi perairan antarpulau
      if (i < route.points.length - 1) {
        const next = route.points[i + 1];
        const nextWorld = geoToWorld(next.lat, next.lng);
        const midX = (world.x + nextWorld.x) * 0.5;
        const midZ = (world.z + nextWorld.z) * 0.5;
        const dist = Math.hypot(nextWorld.x - world.x, nextWorld.z - world.z);
        const arcY = 0.65 + Math.min(2.1, dist * 0.14);
        vectors.push(new THREE.Vector3(midX, arcY, midZ));
      }
    }

    const curve = new THREE.CatmullRomCurve3(vectors);
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.055, 8, false);
    geometries.push(tubeGeo);

    const tubeMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(route.color),
      emissive: new THREE.Color(route.color),
      emissiveIntensity: 0.35,
      roughness: 0.4,
      metalness: 0.2,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    materials.push(tubeMaterial);

    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMaterial);
    tubeMesh.visible = false;
    group.add(tubeMesh);

    const beadMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(route.color),
      transparent: true,
      opacity: 0,
    });
    materials.push(beadMaterial);

    const beadMesh = new THREE.Mesh(beadGeo, beadMaterial);
    beadMesh.visible = false;
    group.add(beadMesh);

    return {
      route,
      curve,
      tubeMesh,
      tubeMaterial,
      beadMesh,
      beadMaterial,
      phaseOffset: idx * 0.27,
    };
  });

  const _vec = new THREE.Vector3();

  const updateRoutes = (toYear: number, visible: boolean, dt: number): boolean => {
    elapsed += dt;
    let needsRepaint = false;

    for (let i = 0; i < routes.length; i++) {
      const arc = routes[i];
      let targetOpacity = 0;

      if (visible && toYear >= arc.route.appearYear) {
        if (toYear <= arc.route.fadeYear) {
          const fadeIn = Math.min(1, (toYear - arc.route.appearYear) / 160);
          targetOpacity = Math.max(0.4, fadeIn * 0.85);
        } else {
          targetOpacity = 0.2;
        }
      }

      arc.tubeMaterial.opacity = THREE.MathUtils.damp(
        arc.tubeMaterial.opacity,
        targetOpacity,
        6.5,
        dt
      );
      arc.beadMaterial.opacity = THREE.MathUtils.damp(
        arc.beadMaterial.opacity,
        targetOpacity > 0.2 ? 0.95 : 0,
        6.5,
        dt
      );

      const isMeshVis = arc.tubeMaterial.opacity > 0.02;
      arc.tubeMesh.visible = isMeshVis;
      arc.beadMesh.visible = isMeshVis && arc.beadMaterial.opacity > 0.05;

      if (Math.abs(arc.tubeMaterial.opacity - targetOpacity) > 0.01) {
        needsRepaint = true;
      }

      if (arc.beadMesh.visible) {
        const u = (elapsed * 0.12 + arc.phaseOffset) % 1;
        arc.curve.getPointAt(u, _vec);
        arc.beadMesh.position.copy(_vec);
        needsRepaint = true;
      }
    }

    return needsRepaint;
  };

  return {
    group,
    routes,
    updateRoutes,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      routes.length = 0;
    },
  };
}
