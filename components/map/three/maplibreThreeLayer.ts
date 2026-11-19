import {
  MercatorCoordinate,
  type CustomLayerInterface,
  type CustomRenderMethodInput,
  type Map as MapLibreMap,
} from "maplibre-gl";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { sites, type SiteWithCategory } from "@/data";
import type { PinState } from "@/lib/peta-data";
import { traces } from "@/lib/traces";
import { buildCompositeArchetype, createSharedMaterials } from "./culturalModels";
import { createProceduralTextures } from "./proceduralTextures";
import { getSiteAccentColor, getSiteArchetype } from "./siteArchetypes";
import { HISTORICAL_CULTURAL_ROUTES } from "./tradeRoutes";
import type {
  CulturalRouteDefinition,
  ModelArchetype,
  ProceduralTextureSet,
  RouteArcInstance,
  SharedMaterials,
} from "./types";

export interface MaplibreThreeLayerState {
  currentYear: number;
  selectedSlug: string | null;
  pulseSlugs: ReadonlySet<string>;
  showRoutes: boolean;
  showTraces: boolean;
  pins: PinState[];
}

export interface MapMonumentInstance {
  site: SiteWithCategory;
  root: THREE.Group;
  modelGroup: THREE.Group;
  shadowMesh: THREE.Mesh;
  haloMesh: THREE.Mesh;
  haloMaterial: THREE.MeshBasicMaterial;
  pulseGroup: THREE.Group;
  pulseRingA: THREE.Mesh;
  pulseMatA: THREE.MeshBasicMaterial;
  pulseRingB: THREE.Mesh;
  pulseMatB: THREE.MeshBasicMaterial;
  currentScale: number;
  targetScale: number;
  dotScale: number;
  targetDotScale: number;
  isSelected: boolean;
  isPulse: boolean;
  exists: boolean;
  active: boolean;
  eventCount: number;
  archetype: ModelArchetype;
  accentColor: string;
  screenPos: { x: number; y: number };
}

// Pusat Nusantara (antara Selat Makassar & Kalimantan Timur) sebagai referensi asal koordinat
const ORIGIN_LON = 117.8;
const ORIGIN_LAT = -2.3;

// 1 unit dalam ruang lokal Three.js = 38 meter fisik di dunia nyata
// Ukuran kompak dan proporsional (~30-50m fisik) sehingga duduk rapi di atas persil situs
// tanpa meluber ke jalanan atau menutupi label nama jalan OpenStreetMap.
const SCENE_METERS_PER_UNIT = 38;

const _projMatrix = new THREE.Matrix4();
const _modelMatrix = new THREE.Matrix4();
const _rotX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
const _scaleVec = new THREE.Vector3();
const _vec3 = new THREE.Vector3();

export interface CustomThreeLayer extends CustomLayerInterface {
  updateState: (partial: Partial<MaplibreThreeLayerState>) => void;
  hitTest: (point: { x: number; y: number }, maxDistancePx?: number) => SiteWithCategory | null;
  getSiteScreenPos: (slug: string) => { x: number; y: number } | null;
  getActiveMonuments: () => MapMonumentInstance[];
}

export function createMaplibreThreeLayer(
  initialState: Partial<MaplibreThreeLayerState> = {},
  isSoftwareGl = false
): CustomThreeLayer {
  const state: MaplibreThreeLayerState = {
    currentYear: initialState.currentYear ?? 2026,
    selectedSlug: initialState.selectedSlug ?? null,
    pulseSlugs: initialState.pulseSlugs ?? new Set(),
    showRoutes: initialState.showRoutes ?? true,
    showTraces: initialState.showTraces ?? false,
    pins: initialState.pins ?? [],
  };

  const originMerc = MercatorCoordinate.fromLngLat([ORIGIN_LON, ORIGIN_LAT], 0);
  const unitScale = originMerc.meterInMercatorCoordinateUnits() * SCENE_METERS_PER_UNIT;

  _scaleVec.set(unitScale, -unitScale, unitScale);
  _modelMatrix
    .makeTranslation(originMerc.x, originMerc.y, originMerc.z)
    .scale(_scaleVec)
    .multiply(_rotX);

  const lngLatToSceneXZ = (lng: number, lat: number) => {
    const m = MercatorCoordinate.fromLngLat([lng, lat], 0);
    return {
      x: (m.x - originMerc.x) / unitScale,
      z: (m.y - originMerc.y) / unitScale,
    };
  };

  let mapInstance: MapLibreMap | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.Camera | null = null;
  let envRT: THREE.WebGLRenderTarget | null = null;
  let textures: ProceduralTextureSet | null = null;
  let mats: SharedMaterials | null = null;

  const trackedGeometries: THREE.BufferGeometry[] = [];
  const trackedMaterials: THREE.Material[] = [];
  const monuments: MapMonumentInstance[] = [];
  const monumentBySlug = new Map<string, MapMonumentInstance>();
  const routeArcs: RouteArcInstance[] = [];

  // Lapisan Jejak Wikidata (traces) 3D
  let tracesPoints: THREE.Points | null = null;
  let tracesMaterial: THREE.PointsMaterial | null = null;
  let tracesGeometry: THREE.BufferGeometry | null = null;

  let lastTime = performance.now();
  let elapsed = 0;
  let repaintTimer = 0;
  let disposed = false;

  const scheduleRepaint = () => {
    if (disposed || !mapInstance) return;
    if (isSoftwareGl) {
      if (repaintTimer) return;
      repaintTimer = window.setTimeout(() => {
        repaintTimer = 0;
        if (!disposed) mapInstance?.triggerRepaint();
      }, 90);
    } else {
      mapInstance.triggerRepaint();
    }
  };

  const updateMonumentsFromPins = () => {
    const pinMap = new Map(state.pins.map((p) => [p.site.slug, p]));
    for (let i = 0; i < monuments.length; i++) {
      const mon = monuments[i];
      const pin = pinMap.get(mon.site.slug);
      if (pin) {
        mon.exists = pin.exists;
        mon.active = pin.active;
        mon.eventCount = pin.count;
      } else {
        mon.exists = false;
        mon.active = false;
        mon.eventCount = 0;
      }
      mon.isSelected = mon.site.slug === state.selectedSlug;
      mon.isPulse = state.pulseSlugs.has(mon.site.slug);
    }
  };

  const layer: CustomThreeLayer = {
    id: "nusantara-3d-cultures",
    type: "custom",
    renderingMode: "3d",

    updateState(partial: Partial<MaplibreThreeLayerState>) {
      if (partial.currentYear !== undefined) state.currentYear = partial.currentYear;
      if (partial.selectedSlug !== undefined) state.selectedSlug = partial.selectedSlug;
      if (partial.pulseSlugs !== undefined) state.pulseSlugs = partial.pulseSlugs;
      if (partial.showRoutes !== undefined) state.showRoutes = partial.showRoutes;
      if (partial.showTraces !== undefined) state.showTraces = partial.showTraces;
      if (partial.pins !== undefined) {
        state.pins = partial.pins;
        updateMonumentsFromPins();
      }
      scheduleRepaint();
    },

    hitTest(point: { x: number; y: number }, maxDistancePx = 28): SiteWithCategory | null {
      if (!mapInstance) return null;
      let closestSite: SiteWithCategory | null = null;
      let closestDist = maxDistancePx;

      for (let i = 0; i < monuments.length; i++) {
        const mon = monuments[i];
        if (!mon.active && !mon.isSelected) continue;
        const dist = Math.hypot(point.x - mon.screenPos.x, point.y - mon.screenPos.y);
        if (dist < closestDist) {
          closestDist = dist;
          closestSite = mon.site;
        }
      }
      return closestSite;
    },

    getSiteScreenPos(slug: string): { x: number; y: number } | null {
      const mon = monumentBySlug.get(slug);
      return mon ? { ...mon.screenPos } : null;
    },

    getActiveMonuments(): MapMonumentInstance[] {
      return monuments;
    },

    onAdd(map, gl) {
      disposed = false;
      mapInstance = map;
      camera = new THREE.Camera();
      scene = new THREE.Scene();

      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: !isSoftwareGl,
      });
      renderer.autoClear = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;

      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envRT.texture;
      pmremGenerator.dispose();

      // Pencahayaan studio 3-titik di atas peta nyata MapLibre
      const hemi = new THREE.HemisphereLight(0xd9efff, 0x263844, 1.05);
      scene.add(hemi);

      const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.95);
      keyLight.position.set(18, 34, 20);
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x74c2e1, 0.7);
      rimLight.position.set(-22, 18, -18);
      scene.add(rimLight);

      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      textures = createProceduralTextures(maxAniso);
      mats = createSharedMaterials(textures);
      trackedMaterials.push(...Object.values(mats));

      const shadowGeo = new THREE.CircleGeometry(0.74, 20);
      const haloGeo = new THREE.RingGeometry(0.64, 0.82, 24);
      const pulseRingGeo = new THREE.RingGeometry(0.32, 0.44, 24);
      const beaconOuterGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.04, 16);
      const beaconCoreGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.05, 16);
      const beaconInnerGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.07, 12);
      trackedGeometries.push(
        shadowGeo,
        haloGeo,
        pulseRingGeo,
        beaconOuterGeo,
        beaconCoreGeo,
        beaconInnerGeo
      );

      // Bangun model 3D komposit budaya untuk setiap situs di posisi geografis aslinya
      sites.forEach((site) => {
        const { x, z } = lngLatToSceneXZ(site.coords.lng, site.coords.lat);
        const archetype = getSiteArchetype(site);
        const accentColor = getSiteAccentColor(site);

        const root = new THREE.Group();
        root.position.set(x, 0, z);

        // 1. Bayangan kontak dasar
        const shadowMesh = new THREE.Mesh(shadowGeo, mats!.contactShadow);
        shadowMesh.rotation.x = -Math.PI / 2;
        shadowMesh.position.y = 0.012;
        root.add(shadowMesh);

        // 2. Halo resonansi zaman & seleksi
        const haloMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color(accentColor),
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        trackedMaterials.push(haloMaterial);

        const haloMesh = new THREE.Mesh(haloGeo, haloMaterial);
        haloMesh.rotation.x = -Math.PI / 2;
        haloMesh.position.y = 0.018;
        root.add(haloMesh);

        // 3. Titik pemancar denyut (overview pulsing beacon dot) saat zoom makro
        const pulseGroup = new THREE.Group();
        const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(accentColor) });
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

        const backing = new THREE.Mesh(beaconOuterGeo, mats!.beaconBacking);
        backing.position.y = 0.02;
        pulseGroup.add(backing);

        const core = new THREE.Mesh(beaconCoreGeo, coreMat);
        core.position.y = 0.035;
        pulseGroup.add(core);

        const inner = new THREE.Mesh(beaconInnerGeo, mats!.beaconHighlight);
        inner.position.y = 0.048;
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

        // 4. Model 3D arsitektur prosedural komposit
        const modelGroup = buildCompositeArchetype(
          archetype,
          mats!,
          accentColor,
          trackedGeometries,
          trackedMaterials
        );
        modelGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = false;
            mesh.receiveShadow = false;
          }
        });
        root.add(modelGroup);
        scene!.add(root);

        const monInst: MapMonumentInstance = {
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
          currentScale: 0.01,
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
          screenPos: { x: 0, y: 0 },
        };

        monuments.push(monInst);
        monumentBySlug.set(site.slug, monInst);
      });

      // Bangun jalur niaga rempah & difusi budaya 3D
      const beadGeo = new THREE.SphereGeometry(0.18, 12, 12);
      trackedGeometries.push(beadGeo);

      HISTORICAL_CULTURAL_ROUTES.forEach((route, idx) => {
        const vectors: THREE.Vector3[] = [];
        for (let i = 0; i < route.points.length; i++) {
          const p = route.points[i];
          const curr = lngLatToSceneXZ(p.lng, p.lat);
          vectors.push(new THREE.Vector3(curr.x, 0.12, curr.z));

          if (i < route.points.length - 1) {
            const nextP = route.points[i + 1];
            const next = lngLatToSceneXZ(nextP.lng, nextP.lat);
            const midX = (curr.x + next.x) * 0.5;
            const midZ = (curr.z + next.z) * 0.5;
            const dist = Math.hypot(next.x - curr.x, next.z - curr.z);
            const arcY = 0.6 + Math.min(2.2, dist * 0.14);
            vectors.push(new THREE.Vector3(midX, arcY, midZ));
          }
        }

        const curve = new THREE.CatmullRomCurve3(vectors);
        const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.055, 8, false);
        trackedGeometries.push(tubeGeo);

        const tubeMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(route.color),
          emissive: new THREE.Color(route.color),
          emissiveIntensity: 0.45,
          roughness: 0.35,
          metalness: 0.25,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        trackedMaterials.push(tubeMaterial);

        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMaterial);
        tubeMesh.visible = false;
        scene!.add(tubeMesh);

        const beadMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color(route.color),
          transparent: true,
          opacity: 0,
        });
        trackedMaterials.push(beadMaterial);

        const beadMesh = new THREE.Mesh(beadGeo, beadMaterial);
        beadMesh.visible = false;
        scene!.add(beadMesh);

        routeArcs.push({
          route,
          curve,
          tubeMesh,
          tubeMaterial,
          beadMesh,
          beadMaterial,
          phaseOffset: idx * 0.27,
        });
      });

      // Siapkan partikel 3D Jejak Wikidata
      const traceCoords: number[] = [];
      traces.forEach((tr) => {
        const pt = lngLatToSceneXZ(tr.lng, tr.lat);
        traceCoords.push(pt.x, 0.08, pt.z);
      });
      tracesGeometry = new THREE.BufferGeometry();
      tracesGeometry.setAttribute("position", new THREE.Float32BufferAttribute(traceCoords, 3));
      tracesMaterial = new THREE.PointsMaterial({
        color: 0xe7b75f,
        size: 5.5,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.75,
      });
      tracesPoints = new THREE.Points(tracesGeometry, tracesMaterial);
      tracesPoints.visible = false;
      scene!.add(tracesPoints);
      trackedGeometries.push(tracesGeometry);
      trackedMaterials.push(tracesMaterial);

      updateMonumentsFromPins();
      renderer.resetState();
    },

    render(_gl: WebGL2RenderingContext, options: CustomRenderMethodInput) {
      if (!renderer || !scene || !camera || !mapInstance) return;

      const now = performance.now();
      const dt = Math.min(0.08, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;

      const zoom = mapInstance.getZoom();
      const canvasEl = mapInstance.getCanvas();
      const canvasWidth = canvasEl.clientWidth || 1;
      const canvasHeight = canvasEl.clientHeight || 1;
      let needsFollowUpFrame = false;

      // Sinkronisasi proyeksi kamera Three.js dengan matriks tampilan miring MapLibre
      const matrix =
        options.defaultProjectionData?.mainMatrix ||
        (options as unknown as { modelViewProjectionMatrix?: number[] }).modelViewProjectionMatrix;
      if (matrix) {
        _projMatrix.fromArray(matrix);
        camera.projectionMatrix.copy(_projMatrix).multiply(_modelMatrix);
      }

      // Perbarui skala 3D model & posisi layar untuk hover/click
      for (let i = 0; i < monuments.length; i++) {
        const m = monuments[i];
        const isSelected = m.isSelected;
        const active = m.active;

        // Hitung target skala monumen:
        // Pin 2D dirender oleh PinGlyph HTML resmi SETAPAK pada semua tingkat zoom.
        // Objek 3D arsitektur muncul saat zoom mendekati situs (zoom >= 13) atau saat situs dipilih,
        // dengan ukuran proporsional (~30-50m) sehingga nama jalan OpenStreetMap tetap terbaca jelas.
        let targetModelScale = 0;

        if (active || isSelected) {
          if (zoom >= 13.0 || isSelected) {
            const streetDampen = zoom > 15.0 ? Math.max(0.48, 1 - (zoom - 15.0) * 0.1) : 1.0;
            targetModelScale = (isSelected ? 1.05 : 0.82) * streetDampen;
          } else if (zoom >= 11.5) {
            // Transisi masuk halus saat mendekati situs
            const t = (zoom - 11.5) / 1.5;
            targetModelScale = t * 0.75;
          }
        }

        m.currentScale = THREE.MathUtils.damp(m.currentScale, targetModelScale, 8.5, dt);
        m.dotScale = 0; // Titik ditangani langsung oleh PinGlyph HTML DOM

        if (Math.abs(m.currentScale - targetModelScale) > 0.008) {
          needsFollowUpFrame = true;
        }

        const showModel = m.currentScale > 0.015;

        m.modelGroup.visible = showModel;
        m.shadowMesh.visible = showModel;
        m.haloMesh.visible = showModel;
        m.pulseGroup.visible = false;

        if (showModel) {
          m.modelGroup.scale.setScalar(m.currentScale);
          m.shadowMesh.scale.setScalar(m.currentScale);

          const pulse = 1 + Math.sin(elapsed * 2.5 + i) * 0.08;
          if (isSelected) {
            m.haloMesh.scale.setScalar(1.35 * pulse);
            m.haloMaterial.opacity = 0.9;
            needsFollowUpFrame = true;
          } else if (m.isPulse) {
            m.haloMesh.scale.setScalar(1.25 * pulse);
            m.haloMaterial.opacity = 0.78;
            needsFollowUpFrame = true;
          } else {
            m.haloMesh.scale.setScalar(0.96);
            m.haloMaterial.opacity = 0.38;
          }
        }

        // Proyeksikan posisi layar monumen untuk hit-testing & tooltip kursor
        _vec3.copy(m.root.position).applyMatrix4(_modelMatrix).applyMatrix4(_projMatrix);
        m.screenPos.x = (_vec3.x * 0.5 + 0.5) * canvasWidth;
        m.screenPos.y = (-_vec3.y * 0.5 + 0.5) * canvasHeight;
      }

      // Perbarui rute niaga & difusi budaya
      const beadScale = Math.max(0.25, Math.min(1.2, Math.pow(0.68, zoom - 5)));
      for (let i = 0; i < routeArcs.length; i++) {
        const arc = routeArcs[i];
        let targetOpacity = 0;

        if (state.showRoutes && state.currentYear >= arc.route.appearYear) {
          if (state.currentYear <= arc.route.fadeYear) {
            const fadeIn = Math.min(1, (state.currentYear - arc.route.appearYear) / 160);
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

        const visibleNow = arc.tubeMaterial.opacity > 0.02;
        arc.tubeMesh.visible = visibleNow;
        arc.beadMesh.visible = visibleNow && arc.beadMaterial.opacity > 0.05;

        if (Math.abs(arc.tubeMaterial.opacity - targetOpacity) > 0.015) {
          needsFollowUpFrame = true;
        }

        if (arc.beadMesh.visible) {
          const u = (elapsed * 0.12 + arc.phaseOffset) % 1;
          arc.curve.getPointAt(u, _vec3);
          arc.beadMesh.position.copy(_vec3);
          arc.beadMesh.scale.setScalar(beadScale);
          needsFollowUpFrame = true;
        }
      }

      // Perbarui visibilitas lapisan Jejak Wikidata
      if (tracesPoints) {
        tracesPoints.visible = state.showTraces;
      }

      renderer.resetState();
      renderer.render(scene, camera);

      if (needsFollowUpFrame) {
        scheduleRepaint();
      }
    },

    onRemove() {
      disposed = true;
      clearTimeout(repaintTimer);
      trackedGeometries.forEach((g) => g.dispose());
      trackedMaterials.forEach((m) => m.dispose());
      textures?.dispose();
      envRT?.dispose();
      renderer?.dispose();
      monuments.length = 0;
      monumentBySlug.clear();
      routeArcs.length = 0;
      scene = null;
      camera = null;
      renderer = null;
      mapInstance = null;
    },
  };

  return layer;
}
