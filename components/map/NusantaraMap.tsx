"use client";

import type { Map as MlMap } from "maplibre-gl";
import {
  Compass,
  Maximize,
  Minimize,
  Plus,
  Minus,
  RotateCcw,
  Box,
  Layers,
  Sparkles,
  Navigation,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { siteBySlug, sites, type SiteWithCategory } from "@/data";
import { localizeSite } from "@/lib/i18n";
import { NUSANTARA_BOUNDS } from "@/lib/map-style";
import type { PinState } from "@/lib/peta-data";
import { type FlyTarget, usePetaPrefs, usePetaStore } from "@/lib/peta-store";
import { isMotionReduced } from "@/lib/store";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import {
  adaptPinStatesToCulturalNodes,
  buildCulturalArchetypeMesh,
  buildMapShowcaseFrame,
  computeDeclutteredPositions,
  computeZoomLod,
  createInstantArchipelagoVectorTexture,
  CULTURAL_NODES,
  getCulturalPhaseAtYear,
  getNodePositionAtCameraDistance,
  getPhaseBadgeMeta,
  latLonToWorld,
  latToTileY,
  lonToTileX,
  MIGRATION_ROUTES,
  tileXYToWorldBounds,
  worldToLatLon,
  type CulturalNode,
  type DeclutteredNodePosition,
  type OsmZoomTier,
  type ZoomLodState,
} from "./three";

export { NUSANTARA_BOUNDS };

interface MapProps {
  pins: PinState[];
  toYear: number;
  /** situs yang peristiwanya baru saja terjadi (denyut sekali) */
  pulse: ReadonlySet<string>;
  glow: { lat: number; lng: number; name: string } | null;
  onReady: (map: MlMap) => void;
}

interface NodeVisualBundle {
  node: CulturalNode;
  declutter: DeclutteredNodePosition;
  rootGroup: THREE.Group;
  pulseCore: THREE.Mesh;
  pulseWaveRing: THREE.Mesh;
  phaseHaloDisc: THREE.Mesh;
  contrastShadowDisc: THREE.Mesh;
  hitProxy: THREE.Mesh;
  modelGroup: THREE.Group;
  tetherLine: THREE.Line | null;
  currentModelScale: number;
  currentPulseScale: number;
}

interface RouteVisualBundle {
  id: string;
  yearStart: number;
  curve: THREE.CatmullRomCurve3;
  tubeMesh: THREE.Mesh;
  particles: THREE.Mesh[];
}

interface HoverCardInfo {
  node: CulturalNode;
  x: number;
  y: number;
  exists: boolean;
  active: boolean;
  count: number;
}

const _scratchVec3A = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();

export function NusantaraMap({ pins, toYear, pulse, glow, onReady }: MapProps) {
  const { t, lang } = useCopy();
  const mountRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hoveredNodeRef = useRef<{ node: CulturalNode } | null>(null);

  // Status visual lokal
  const [hoverInfo, setHoverInfo] = useState<HoverCardInfo | null>(null);
  const [lodState, setLodState] = useState<ZoomLodState | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControlsHint, setShowControlsHint] = useState(true);
  const [screenGlowPos, setScreenGlowPos] = useState<{ x: number; y: number } | null>(null);

  // Store Peta SETAPAK
  const selected = usePetaStore((s) => s.site);
  const select = usePetaStore((s) => s.select);
  const setView = usePetaStore((s) => s.setView);
  const fly = usePetaStore((s) => s.fly);
  const layers = usePetaStore((s) => s.layers);

  const lastFly = useRef<FlyTarget | null>(null);

  // Ref reaktif untuk loop animasi Three.js tanpa re-mount
  const stateRef = useRef({
    pins,
    toYear,
    pulse,
    selected,
    showRoutes: layers.route,
    onSelectSite: (slug: string) => {
      select(slug);
    },
  });

  useEffect(() => {
    stateRef.current = {
      pins,
      toYear,
      pulse,
      selected,
      showRoutes: layers.route,
      onSelectSite: (slug: string) => {
        select(slug);
      },
    };
  }, [pins, toYear, pulse, selected, layers.route, select]);

  // Posisi ter-dekluter sekali untuk konsistensi targeting kamera
  const declutteredMapRef = useRef<Record<string, DeclutteredNodePosition>>(
    computeDeclutteredPositions(CULTURAL_NODES, 0.28, 0.55)
  );

  // Ref penerbangan kamera
  const flightTargetRef = useRef<{
    active: boolean;
    startTimeMs: number;
    durationMs: number;
    startTargetPos: THREE.Vector3;
    startCameraPos: THREE.Vector3;
    endTargetPos: THREE.Vector3;
    endCameraPos: THREE.Vector3;
  }>({
    active: false,
    startTimeMs: 0,
    durationMs: 700,
    startTargetPos: new THREE.Vector3(0, 0, 0),
    startCameraPos: new THREE.Vector3(0, 44, 34),
    endTargetPos: new THREE.Vector3(0, 0, 0),
    endCameraPos: new THREE.Vector3(0, 44, 34),
  });

  const liveCameraRef = useRef<{
    camera: THREE.PerspectiveCamera | null;
    controls: OrbitControls | null;
    renderer: THREE.WebGLRenderer | null;
    scene: THREE.Scene | null;
  }>({
    camera: null,
    controls: null,
    renderer: null,
    scene: null,
  });

  // Bereaksi terhadap panggilan fly dari store (pencarian, daftar situs, resetAll)
  useEffect(() => {
    if (!fly || lastFly.current?.nonce === fly.nonce) return;
    lastFly.current = fly;

    const cam = liveCameraRef.current.camera;
    const ctrl = liveCameraRef.current.controls;
    if (!cam || !ctrl) return;

    const worldPt = latLonToWorld(fly.lat, fly.lng);
    // Konversi zoom peta ke jarak kamera Three.js
    const targetZoom = Math.min(18, Math.max(2.5, fly.zoom));
    const dist = THREE.MathUtils.clamp(
      50 * Math.pow(0.72, targetZoom - 3.5),
      0.16,
      52
    );

    const isStreet = dist <= 1.5;
    const yRatio = isStreet ? 0.78 : 0.68;
    const zRatio = isStreet ? 0.42 : 0.62;

    const endTarget = new THREE.Vector3(worldPt.x, 0, worldPt.z);
    const endCamera = new THREE.Vector3(
      worldPt.x,
      dist * yRatio,
      worldPt.z + dist * zRatio
    );

    if (isMotionReduced()) {
      ctrl.target.copy(endTarget);
      cam.position.copy(endCamera);
      ctrl.update();
    } else {
      flightTargetRef.current = {
        active: true,
        startTimeMs: performance.now(),
        durationMs: 700,
        startTargetPos: ctrl.target.clone(),
        startCameraPos: cam.position.clone(),
        endTargetPos: endTarget,
        endCameraPos: endCamera,
      };
    }
  }, [fly]);

  // Inisialisasi Peta 3D Berbingkai Three.js
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement("canvas");
        const gl = probeCanvas.getContext("webgl2");
        if (!gl) return true;
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        probeCanvas.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true, // Diperlukan oleh saveImage() di PetaClient
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.localClippingEnabled = true;

    const canvas = renderer.domElement;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.setAttribute("data-testid", "nusantara-3d-canvas");

    container.innerHTML = "";
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    const horizonColor = new THREE.Color(0x0a111a);
    scene.background = horizonColor;
    scene.fog = new THREE.FogExp2(0x0a111a, 0.0038);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Kamera & OrbitControls dengan zoom sedalam mungkin hingga z=16 street level!
    const camera = new THREE.PerspectiveCamera(40, width / height, 1.5, 360);
    camera.position.set(0, 44, 34);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;
    controls.zoomSpeed = 1.35;
    // minDistance sangat kecil (0.06) memungkinkan zoom hingga nama jalan terlihat!
    controls.minDistance = 0.06;
    controls.maxDistance = 85;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.minPolarAngle = 0.15;
    controls.target.set(0, 0, 0);

    liveCameraRef.current = { camera, controls, renderer, scene };

    const onControlStart = () => {
      flightTargetRef.current.active = false;
    };
    controls.addEventListener("start", onControlStart);

    // Pencahayaan Studio Seimbang
    const hemiLight = new THREE.HemisphereLight(0xbfdbfe, 0x1e293b, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.45);
    keyLight.position.set(24, 46, 28);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -55;
      keyLight.shadow.camera.right = 55;
      keyLight.shadow.camera.top = 30;
      keyLight.shadow.camera.bottom = -30;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimLight.position.set(-28, 24, -30);
    scene.add(rimLight);

    // Bingkai Showcase Peta 3D Nusantara Kayu Jati & Bezel Kartografi
    const nwCorner = latLonToWorld(9.5, 90.0);
    const seCorner = latLonToWorld(-12.5, 146.0);
    const mapWidth = Math.abs(seCorner.x - nwCorner.x);
    const mapDepth = Math.abs(seCorner.z - nwCorner.z);
    const mapCenterX = (nwCorner.x + seCorner.x) / 2;
    const mapCenterZ = (nwCorner.z + seCorner.z) / 2;

    const minMapX = Math.min(nwCorner.x, seCorner.x);
    const maxMapX = Math.max(nwCorner.x, seCorner.x);
    const minMapZ = Math.min(nwCorner.z, seCorner.z);
    const maxMapZ = Math.max(nwCorner.z, seCorner.z);
    // Margin halus 0.3 agar batas ubin masuk pas di bawah lis bezel penggaris kartografi
    const clipMargin = 0.3;
    const mapClipPlanes = [
      new THREE.Plane(new THREE.Vector3(1, 0, 0), -minMapX + clipMargin),
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), maxMapX + clipMargin),
      new THREE.Plane(new THREE.Vector3(0, 0, 1), -minMapZ + clipMargin),
      new THREE.Plane(new THREE.Vector3(0, 0, -1), maxMapZ + clipMargin),
    ];

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const mapFrameGroup = buildMapShowcaseFrame(
      mapCenterX,
      mapCenterZ,
      mapWidth,
      mapDepth,
      maxAniso
    );
    scene.add(mapFrameGroup);

    // Tekstur Peta Vektor Kepulauan Instan
    const vectorTex = createInstantArchipelagoVectorTexture(maxAniso);
    const vectorMapPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(mapWidth, mapDepth),
      new THREE.MeshBasicMaterial({
        map: vectorTex,
        depthWrite: false,
        clippingPlanes: mapClipPlanes,
      })
    );
    vectorMapPlane.rotation.x = -Math.PI / 2;
    vectorMapPlane.position.set(mapCenterX, 0.0, mapCenterZ);
    vectorMapPlane.renderOrder = 1;
    scene.add(vectorMapPlane);

    // Garis Khatulistiwa 3D (Equator 0°)
    const eqWest = latLonToWorld(0, 90.0);
    const eqEast = latLonToWorld(0, 146.0);
    const eqGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(eqWest.x, 0.0, eqWest.z),
      new THREE.Vector3(eqEast.x, 0.0, eqEast.z),
    ]);
    const eqLine = new THREE.Line(
      eqGeo,
      new THREE.LineBasicMaterial({
        color: 0xd97706,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      })
    );
    eqLine.renderOrder = 18;
    scene.add(eqLine);

    // Pengelola Ubin OpenStreetMap Multi-Tier (z=5, 7, 9, 10, 12, 14, 15, 16)
    const osmTileGroup = new THREE.Group();
    scene.add(osmTileGroup);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin("anonymous");
    const loadedTiles = new Map<string, THREE.Mesh>();
    const pendingTiles = new Set<string>();
    let loadedTileCounter = 0;

    function ensureOsmTile(tx: number, ty: number, z: OsmZoomTier) {
      const maxTileIdx = Math.pow(2, z) - 1;
      if (tx < 0 || tx > maxTileIdx || ty < 0 || ty > maxTileIdx) return;
      const key = `${z}/${tx}/${ty}`;
      if (loadedTiles.has(key) || pendingTiles.has(key)) return;

      pendingTiles.add(key);
      const bounds = tileXYToWorldBounds(tx, ty, z);
      const tileUrl = `https://tile.openstreetmap.org/${z}/${tx}/${ty}.png`;
      const fallbackUrl = `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${tx}/${ty}.png`;

      const createTileMesh = (osmTex: THREE.Texture) => {
        osmTex.colorSpace = THREE.SRGBColorSpace;
        osmTex.anisotropy = maxAniso;

        const mat = new THREE.MeshBasicMaterial({
          map: osmTex,
          color: 0xeaf0f6,
          depthWrite: false,
          depthTest: true,
          clippingPlanes: mapClipPlanes,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });

        const tileMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(bounds.width, bounds.depth),
          mat
        );
        tileMesh.rotation.x = -Math.PI / 2;
        tileMesh.position.set(bounds.centerX, 0.001, bounds.centerZ);
        tileMesh.renderOrder = z;
        tileMesh.userData.zoomTier = z;
        osmTileGroup.add(tileMesh);
        loadedTiles.set(key, tileMesh);
        loadedTileCounter++;
      };

      textureLoader.load(
        tileUrl,
        (osmTex) => {
          pendingTiles.delete(key);
          createTileMesh(osmTex);
        },
        undefined,
        () => {
          // Cadangan jika OpenStreetMap membatasi laju/koneksi
          textureLoader.load(
            fallbackUrl,
            (fallbackTex) => {
              pendingTiles.delete(key);
              createTileMesh(fallbackTex);
            },
            undefined,
            () => {
              pendingTiles.delete(key);
            }
          );
        }
      );
    }

    // Muat ubin z=5 dasar seluruh Nusantara (lon 94..142, lat 7..-11)
    const z5MinX = lonToTileX(94.0, 5);
    const z5MaxX = lonToTileX(142.0, 5);
    const z5MinY = latToTileY(7.0, 5);
    const z5MaxY = latToTileY(-11.5, 5);
    for (let tx = z5MinX; tx <= z5MaxX; tx++) {
      for (let ty = z5MinY; ty <= z5MaxY; ty++) {
        ensureOsmTile(tx, ty, 5);
      }
    }

    const ALL_ZOOM_TIERS: OsmZoomTier[] = [5, 7, 9, 10, 12, 14, 15, 16];

    function updateHierarchicalOsmTiles(targetX: number, targetZ: number, activeZoom: OsmZoomTier) {
      loadedTiles.forEach((mesh) => {
        const tier = mesh.userData.zoomTier as OsmZoomTier;
        mesh.visible = tier === 5 || tier <= activeZoom;
      });

      const { lat, lon } = worldToLatLon(targetX, targetZ);
      const tiersToLoad = ALL_ZOOM_TIERS.filter((t) => t > 5 && t <= activeZoom);

      for (const zTier of tiersToLoad) {
        const centerTx = lonToTileX(lon, zTier);
        const centerTy = latToTileY(lat, zTier);
        const radiusX = zTier === activeZoom ? 3 : 1;
        const radiusY = zTier === activeZoom ? 2 : 1;
        for (let dx = -radiusX; dx <= radiusX; dx++) {
          for (let dy = -radiusY; dy <= radiusY; dy++) {
            ensureOsmTile(centerTx + dx, centerTy + dy, zTier);
          }
        }
      }
    }

    // Bangun Node Budaya 3D dari data SETAPAK
    const declutteredMap = declutteredMapRef.current;
    const culturalRootGroup = new THREE.Group();
    scene.add(culturalRootGroup);

    const nodeBundles: NodeVisualBundle[] = [];
    const clusterRingMeshes: THREE.Mesh[] = [];

    const pulseCoreGeo = new THREE.SphereGeometry(0.15, 16, 14);
    const pulseWaveGeo = new THREE.RingGeometry(0.17, 0.29, 24);
    pulseWaveGeo.rotateX(-Math.PI / 2);
    const haloDiscGeo = new THREE.CircleGeometry(0.34, 24);
    haloDiscGeo.rotateX(-Math.PI / 2);
    const hitProxyGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.7, 12);
    hitProxyGeo.translate(0, 0.35, 0);

    const drawnClusterRings = new Set<string>();
    for (const node of CULTURAL_NODES) {
      const dec = declutteredMap[node.id];
      if (dec && dec.clusterSize > 1 && !drawnClusterRings.has(dec.clusterGroup)) {
        drawnClusterRings.add(dec.clusterGroup);
        const ringRadius = Math.hypot(dec.displayX - dec.centerX, dec.displayZ - dec.centerZ);
        const clusterRingMesh = new THREE.Mesh(
          new THREE.RingGeometry(Math.max(0.01, ringRadius - 0.01), ringRadius + 0.01, 48),
          new THREE.MeshBasicMaterial({
            color: 0x334155,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide,
            depthWrite: false,
          })
        );
        clusterRingMesh.rotation.x = -Math.PI / 2;
        clusterRingMesh.position.set(dec.centerX, 0.0, dec.centerZ);
        clusterRingMesh.renderOrder = 19;
        culturalRootGroup.add(clusterRingMesh);
        clusterRingMeshes.push(clusterRingMesh);
      }
    }

    for (const node of CULTURAL_NODES) {
      const dec = declutteredMap[node.id];
      if (!dec) continue;

      const rootGroup = new THREE.Group();
      rootGroup.position.set(dec.displayX, 0.0, dec.displayZ);
      culturalRootGroup.add(rootGroup);

      const eraColor = new THREE.Color(node.accentColor);

      const contrastShadowDisc = new THREE.Mesh(
        haloDiscGeo,
        new THREE.MeshBasicMaterial({
          color: 0x0f172a,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        })
      );
      contrastShadowDisc.position.y = 0.0;
      contrastShadowDisc.renderOrder = 20;
      rootGroup.add(contrastShadowDisc);

      const phaseHaloDisc = new THREE.Mesh(
        haloDiscGeo,
        new THREE.MeshBasicMaterial({
          color: eraColor,
          transparent: true,
          opacity: 0.34,
          depthWrite: false,
        })
      );
      phaseHaloDisc.position.y = 0.0;
      phaseHaloDisc.renderOrder = 21;
      rootGroup.add(phaseHaloDisc);

      const pulseWaveRing = new THREE.Mesh(
        pulseWaveGeo,
        new THREE.MeshBasicMaterial({
          color: eraColor,
          transparent: true,
          opacity: 0.78,
          depthWrite: false,
        })
      );
      pulseWaveRing.position.y = 0.0;
      pulseWaveRing.renderOrder = 22;
      rootGroup.add(pulseWaveRing);

      const pulseCore = new THREE.Mesh(
        pulseCoreGeo,
        new THREE.MeshStandardMaterial({
          color: eraColor,
          emissive: eraColor,
          emissiveIntensity: 0.55,
          roughness: 0.25,
          metalness: 0.35,
        })
      );
      pulseCore.position.y = 0.1;
      pulseCore.renderOrder = 24;
      rootGroup.add(pulseCore);

      const modelGroup = buildCulturalArchetypeMesh(node.archetype, node.accentColor);
      modelGroup.position.y = 0.0;
      modelGroup.scale.setScalar(0.001);
      modelGroup.visible = false;
      modelGroup.renderOrder = 25;
      rootGroup.add(modelGroup);

      const hitProxy = new THREE.Mesh(
        hitProxyGeo,
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      );
      hitProxy.position.y = 0.0;
      rootGroup.add(hitProxy);

      // Tag semua mesh anak agar raycast selalu menemukan node ini
      rootGroup.userData.culturalNode = node;
      rootGroup.traverse((child) => {
        child.userData.culturalNode = node;
      });

      let tetherLine: THREE.Line | null = null;
      if (dec.isDisplaced) {
        const tetherGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(dec.trueX, 0.0, dec.trueZ),
          new THREE.Vector3(dec.displayX, 0.0, dec.displayZ),
        ]);
        tetherLine = new THREE.Line(
          tetherGeo,
          new THREE.LineBasicMaterial({
            color: 0x475569,
            transparent: true,
            opacity: 0.45,
            depthWrite: false,
          })
        );
        tetherLine.renderOrder = 19;
        culturalRootGroup.add(tetherLine);
      }

      nodeBundles.push({
        node,
        declutter: dec,
        rootGroup,
        pulseCore,
        pulseWaveRing,
        phaseHaloDisc,
        contrastShadowDisc,
        hitProxy,
        modelGroup,
        tetherLine,
        currentModelScale: 0.001,
        currentPulseScale: 1,
      });
    }

    // Bangun Rute Budaya & Maritim 3D
    const routesRootGroup = new THREE.Group();
    scene.add(routesRootGroup);
    const routeBundles: RouteVisualBundle[] = [];
    const particleGeo = new THREE.SphereGeometry(0.14, 10, 10);

    for (const route of MIGRATION_ROUTES) {
      const curvePts = route.waypoints.map((wp, idx) => {
        const pt = latLonToWorld(wp.lat, wp.lon);
        const archHeight = 0.35 + Math.sin((idx / (route.waypoints.length - 1)) * Math.PI) * 1.1;
        return new THREE.Vector3(pt.x, archHeight, pt.z);
      });

      const curve = new THREE.CatmullRomCurve3(curvePts);
      const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.055, 8, false);
      const routeColor = new THREE.Color(route.colorHex);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: routeColor,
        emissive: routeColor,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.5,
        transparent: true,
        opacity: 0.82,
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      routesRootGroup.add(tubeMesh);

      const particles: THREE.Mesh[] = [];
      const pMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      for (let p = 0; p < 5; p++) {
        const pMesh = new THREE.Mesh(particleGeo, pMat);
        routesRootGroup.add(pMesh);
        particles.push(pMesh);
      }

      routeBundles.push({
        id: route.id,
        yearStart: route.yearStart,
        curve,
        tubeMesh,
        particles,
      });
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Deteksi Klik / Hover Objek 3D Hibrida (Raycast + Screen-Space Proximity)
    function pickCulturalNodeAtClientXY(clientX: number, clientY: number): CulturalNode | null {
      const rect = renderer.domElement.getBoundingClientRect();
      _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_pointerNdc, camera);
      const visibleRoots = nodeBundles.filter((b) => b.rootGroup.visible).map((b) => b.rootGroup);

      const intersects = _raycaster.intersectObjects(visibleRoots, true);
      for (let k = 0; k < intersects.length; k++) {
        const node = intersects[k].object.userData?.culturalNode as CulturalNode | undefined;
        if (node) return node;
      }

      // Fallback jarak piksel layar
      const clickLocalX = clientX - rect.left;
      const clickLocalY = clientY - rect.top;
      let closestNode: CulturalNode | null = null;
      let minPixelDist = 32;

      for (let i = 0; i < nodeBundles.length; i++) {
        const b = nodeBundles[i];
        if (!b.rootGroup.visible) continue;
        _scratchVec3A.set(
          b.rootGroup.position.x,
          b.modelGroup.visible ? b.currentModelScale * 0.18 : 0.05,
          b.rootGroup.position.z
        );
        _scratchVec3A.project(camera);
        if (_scratchVec3A.z < -1 || _scratchVec3A.z > 1) continue;

        const screenX = ((_scratchVec3A.x + 1) * 0.5) * rect.width;
        const screenY = ((-_scratchVec3A.y + 1) * 0.5) * rect.height;
        const pixelDist = Math.hypot(clickLocalX - screenX, clickLocalY - screenY);
        if (pixelDist < minPixelDist) {
          minPixelDist = pixelDist;
          closestNode = b.node;
        }
      }

      return closestNode;
    }

    // Hitung posisi koordinat layar (relatif terhadap container peta) tepat di atas puncak objek 3D
    function getNodeScreenXY(node: CulturalNode): { x: number; y: number } | null {
      const b = nodeBundles.find((item) => item.node.id === node.id);
      if (!b || !b.rootGroup.visible) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      const nodeTopY = b.modelGroup.visible
        ? Math.max(0.04, b.currentModelScale * 0.65)
        : 0.1 + 0.15 * Math.max(0.6, b.currentPulseScale);
      _scratchVec3A.set(
        b.rootGroup.position.x,
        b.rootGroup.position.y + nodeTopY,
        b.rootGroup.position.z
      );
      _scratchVec3A.project(camera);
      if (_scratchVec3A.z < -1 || _scratchVec3A.z > 1) return null;
      return {
        x: ((_scratchVec3A.x + 1) * 0.5) * rect.width,
        y: ((-_scratchVec3A.y + 1) * 0.5) * rect.height,
      };
    }

    let pointerDownPos = { x: 0, y: 0 };
    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      if (hoveredNodeRef.current) {
        hoveredNodeRef.current = null;
        setHoverInfo(null);
        usePetaStore.getState().setHoverSite(null);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (moveDist > 7) return;

      const pickedNode = pickCulturalNodeAtClientXY(e.clientX, e.clientY);
      if (pickedNode) {
        stateRef.current.onSelectSite(pickedNode.id);

        // Arahkan kamera mendekat secara mulus ke situs yang dipilih
        const worldPt = latLonToWorld(pickedNode.lat, pickedNode.lon);
        flightTargetRef.current = {
          active: true,
          startTimeMs: performance.now(),
          durationMs: 750,
          startTargetPos: controls.target.clone(),
          startCameraPos: camera.position.clone(),
          endTargetPos: new THREE.Vector3(worldPt.x, 0, worldPt.z),
          endCameraPos: new THREE.Vector3(worldPt.x, 1.1, worldPt.z + 1.2),
        };
      }
    };

    let lastHoverTime = 0;
    const onPointerMove = (e: PointerEvent) => {
      // Sembunyikan hover tooltip saat user sedang drag/pan/orbit peta
      if (e.buttons > 0) {
        if (hoveredNodeRef.current) {
          hoveredNodeRef.current = null;
          setHoverInfo(null);
          usePetaStore.getState().setHoverSite(null);
        }
        return;
      }

      const now = performance.now();
      if (now - lastHoverTime < 35) return;
      lastHoverTime = now;

      const pickedNode = pickCulturalNodeAtClientXY(e.clientX, e.clientY);
      renderer.domElement.style.cursor = pickedNode ? "pointer" : "grab";

      if (pickedNode) {
        const pin = stateRef.current.pins.find((p) => p.site.slug === pickedNode.id);
        hoveredNodeRef.current = { node: pickedNode };
        const screenPos = getNodeScreenXY(pickedNode);
        const rect = renderer.domElement.getBoundingClientRect();
        const initialX = screenPos ? screenPos.x : e.clientX - rect.left;
        const initialY = screenPos ? screenPos.y : e.clientY - rect.top;

        setHoverInfo({
          node: pickedNode,
          x: initialX,
          y: initialY,
          exists: pin?.exists ?? true,
          active: pin?.active ?? true,
          count: pin?.count ?? 0,
        });
        usePetaStore.getState().setHoverSite(pickedNode.id);
      } else {
        if (hoveredNodeRef.current) {
          hoveredNodeRef.current = null;
          setHoverInfo(null);
          usePetaStore.getState().setHoverSite(null);
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointermove", onPointerMove);

    let resizeTimer: number | null = null;
    let resizeRaf = 0;

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Gunakan false agar Three.js tidak menimpa style.width/height = "100%"
      renderer.setSize(w, h, false);
      // Render seketika agar buffer baru langsung terisi visual tanpa frame hitam
      renderer.render(scene, camera);
    };

    const handleResizeThrottled = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        onResize();
      });
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        onResize();
      }, 320);
    };

    window.addEventListener("resize", handleResizeThrottled);
    const resizeObserver = new ResizeObserver(() => handleResizeThrottled());
    resizeObserver.observe(container);

    // Siapkan Controller Kompatibilitas untuk PetaClient.tsx (saveImage, project, getCanvas)
    const mapCompat = {
      getCanvas: () => renderer.domElement,
      project: (coords: [number, number]) => {
        const [lng, lat] = coords;
        const worldPt = latLonToWorld(lat, lng);
        _scratchVec3A.set(worldPt.x, 0, worldPt.z);
        _scratchVec3A.project(camera);
        const w = renderer.domElement.clientWidth;
        const h = renderer.domElement.clientHeight;
        return {
          x: ((_scratchVec3A.x + 1) * 0.5) * w,
          y: ((-_scratchVec3A.y + 1) * 0.5) * h,
        };
      },
      triggerRepaint: () => {
        renderer.render(scene, camera);
      },
      once: (event: string, cb: () => void) => {
        if (event === "idle" || event === "render") {
          setTimeout(cb, 60);
        }
      },
      getZoom: () => {
        const camDist = camera.position.distanceTo(controls.target);
        return Math.max(2.5, Math.min(18, 18 - Math.log2(camDist + 0.1) * 2.2));
      },
      getCenter: () => {
        const geo = worldToLatLon(controls.target.x, controls.target.z);
        return { lat: geo.lat, lng: geo.lon };
      },
      flyTo: (opts: { center?: [number, number]; zoom?: number; duration?: number }) => {
        if (opts.center) {
          const worldPt = latLonToWorld(opts.center[1], opts.center[0]);
          const z = opts.zoom ?? 8;
          const dist = THREE.MathUtils.clamp(50 * Math.pow(0.72, z - 3.5), 0.16, 52);
          flightTargetRef.current = {
            active: true,
            startTimeMs: performance.now(),
            durationMs: opts.duration ?? 700,
            startTargetPos: controls.target.clone(),
            startCameraPos: camera.position.clone(),
            endTargetPos: new THREE.Vector3(worldPt.x, 0, worldPt.z),
            endCameraPos: new THREE.Vector3(worldPt.x, dist * 0.7, worldPt.z + dist * 0.5),
          };
        }
      },
      resize: onResize,
    };

    onReady(mapCompat as unknown as MlMap);

    // Loop Animasi & Rendering
    let frameId = 0;
    let disposed = false;
    const startWallMs = performance.now();

    function tick() {
      if (disposed) return;
      const nowMs = performance.now();
      const elapsed = (nowMs - startWallMs) / 1000;

      const flight = flightTargetRef.current;
      if (flight.active) {
        const progress = Math.min(1, (nowMs - flight.startTimeMs) / flight.durationMs);
        const ease = 1 - Math.pow(1 - progress, 3);
        controls.target.lerpVectors(flight.startTargetPos, flight.endTargetPos, ease);
        camera.position.lerpVectors(flight.startCameraPos, flight.endCameraPos, ease);
        if (progress >= 1) {
          flight.active = false;
        }
      }

      controls.update();

      const camDist = camera.position.distanceTo(controls.target);

      // Skala dinamis near/far plane untuk ketajaman kedalaman maksimum
      const desiredNear = THREE.MathUtils.clamp(camDist * 0.06, 0.004, 2.2);
      const desiredFar = THREE.MathUtils.clamp(camDist * 7.5 + 110, 35, 420);
      if (Math.abs(camera.near - desiredNear) / camera.near > 0.06) {
        camera.near = desiredNear;
        camera.far = desiredFar;
        camera.updateProjectionMatrix();
      }

      const currentLod = computeZoomLod(camDist);
      setLodState(currentLod);

      updateHierarchicalOsmTiles(controls.target.x, controls.target.z, currentLod.osmTileZoom);

      const showClusterGuides = camDist > 3.8;
      for (let c = 0; c < clusterRingMeshes.length; c++) {
        clusterRingMeshes[c].visible = showClusterGuides;
      }

      const {
        pins: activePins,
        toYear: yr,
        pulse: activePulse,
        selected: selId,
        showRoutes,
      } = stateRef.current;

      const pinMap = new Map(activePins.map((p) => [p.site.slug, p]));

      // Skala responsif objek 3D
      const distanceResponsive3DScale = THREE.MathUtils.clamp(
        camDist * 0.032 + 0.011,
        0.014,
        0.195
      );

      for (let i = 0; i < nodeBundles.length; i++) {
        const b = nodeBundles[i];
        const pin = pinMap.get(b.node.id);
        const phase = getCulturalPhaseAtYear(b.node, yr);

        const isVisible = pin !== undefined && (pin.exists || phase !== "inactive");
        b.rootGroup.visible = isVisible;
        if (b.tetherLine) {
          b.tetherLine.visible = isVisible && showClusterGuides;
        }
        if (!isVisible) continue;

        const posAtDist = getNodePositionAtCameraDistance(b.declutter, camDist);
        b.rootGroup.position.set(posAtDist.x, 0.0, posAtDist.z);

        const phaseMeta = getPhaseBadgeMeta(phase);
        const isSelected = b.node.id === selId;
        const isPulsing = activePulse.has(b.node.id);

        const distFromFocus = Math.hypot(
          posAtDist.x - controls.target.x,
          posAtDist.z - controls.target.z
        );

        const shouldShow3DModel =
          currentLod.lodMode === "3d-model" && distFromFocus <= currentLod.focusRadiusWorld;

        const targetModelScale = shouldShow3DModel
          ? distanceResponsive3DScale * (isSelected ? 1.22 : 0.96) * phaseMeta.scaleMultiplier
          : 0.0002;

        const targetPulseScale = shouldShow3DModel
          ? 0.0002
          : isSelected || isPulsing
            ? 1.35
            : 0.92 * phaseMeta.scaleMultiplier;

        b.currentModelScale = THREE.MathUtils.lerp(b.currentModelScale, targetModelScale, 0.38);
        b.currentPulseScale = THREE.MathUtils.lerp(b.currentPulseScale, targetPulseScale, 0.38);

        b.modelGroup.visible = b.currentModelScale > 0.003;
        if (b.modelGroup.visible) {
          b.modelGroup.scale.setScalar(b.currentModelScale);
          b.modelGroup.rotation.y = isSelected ? elapsed * 0.65 : Math.sin(elapsed * 0.4 + i) * 0.15;
        }

        b.pulseCore.visible = b.currentPulseScale > 0.04;
        if (b.pulseCore.visible) {
          b.pulseCore.scale.setScalar(b.currentPulseScale);
        }

        const footprintScale = shouldShow3DModel
          ? THREE.MathUtils.clamp(b.currentModelScale * 1.15, 0.018, 0.28)
          : 1.0;

        b.contrastShadowDisc.scale.setScalar(footprintScale);
        const shadowMat = b.contrastShadowDisc.material as THREE.MeshBasicMaterial;
        shadowMat.opacity = currentLod.isStreetLevel ? 0.26 : 0.45;

        b.hitProxy.scale.setScalar(shouldShow3DModel ? Math.max(0.035, b.currentModelScale * 1.45) : 1.0);

        const waveCycle = (elapsed * 0.85 + i * 0.27) % 1;
        const waveScale = footprintScale * (0.92 + waveCycle * (isSelected || isPulsing ? 1.5 : 1.28));
        b.pulseWaveRing.scale.setScalar(waveScale);
        const waveMat = b.pulseWaveRing.material as THREE.MeshBasicMaterial;
        waveMat.opacity =
          (1 - waveCycle) * (currentLod.isStreetLevel ? 0.42 : 0.75) * phaseMeta.glowMultiplier;

        const haloMat = b.phaseHaloDisc.material as THREE.MeshBasicMaterial;
        haloMat.opacity =
          (currentLod.isStreetLevel ? 0.24 : isSelected ? 0.48 : 0.3) * phaseMeta.glowMultiplier;
        b.phaseHaloDisc.scale.setScalar(footprintScale * (isSelected ? 1.15 : 0.98));
      }

      // Perbarui Rute Budaya & Maritim 3D
      routesRootGroup.visible = showRoutes && !currentLod.isStreetLevel;
      if (routesRootGroup.visible) {
        const isDeepZoom = currentLod.lodMode === "3d-model";
        for (let r = 0; r < routeBundles.length; r++) {
          const rb = routeBundles[r];
          const routeActive = rb.yearStart <= yr;
          rb.tubeMesh.visible = routeActive;
          const tubeMat = rb.tubeMesh.material as THREE.MeshStandardMaterial;
          tubeMat.opacity = isDeepZoom ? 0.18 : 0.82;
          for (let p = 0; p < rb.particles.length; p++) {
            const particle = rb.particles[p];
            particle.visible = routeActive && !isDeepZoom;
            if (particle.visible) {
              const u = (elapsed * 0.11 + p / rb.particles.length) % 1;
              rb.curve.getPointAt(u, _scratchVec3A);
              particle.position.copy(_scratchVec3A);
            }
          }
        }
      }

      // Perbarui posisi floating tooltip secara real-time agar terkunci persis di atas objek 3D saat kamera bergerak
      if (hoveredNodeRef.current && tooltipRef.current) {
        const pos = getNodeScreenXY(hoveredNodeRef.current.node);
        if (pos) {
          tooltipRef.current.style.left = `${pos.x}px`;
          tooltipRef.current.style.top = `${pos.y}px`;
          tooltipRef.current.style.visibility = "visible";
        } else {
          tooltipRef.current.style.visibility = "hidden";
        }
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    }

    tick();

    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);

    const hintTimer = window.setTimeout(() => {
      setShowControlsHint(false);
    }, 7500);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(hintTimer);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      controls.removeEventListener("start", onControlStart);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", handleResizeThrottled);
      cancelAnimationFrame(resizeRaf);
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
    };
  }, [onReady]);

  // Aksi Navigasi Cepat Kamera 3D
  const handleResetView = useCallback(() => {
    const ctrl = liveCameraRef.current.controls;
    const cam = liveCameraRef.current.camera;
    if (!ctrl || !cam) return;

    flightTargetRef.current = {
      active: true,
      startTimeMs: performance.now(),
      durationMs: 700,
      startTargetPos: ctrl.target.clone(),
      startCameraPos: cam.position.clone(),
      endTargetPos: new THREE.Vector3(0, 0, 0),
      endCameraPos: new THREE.Vector3(0, 44, 34),
    };
  }, []);

  const handleZoomIn = useCallback(() => {
    const cam = liveCameraRef.current.camera;
    const ctrl = liveCameraRef.current.controls;
    if (!cam || !ctrl) return;
    const dir = new THREE.Vector3().subVectors(ctrl.target, cam.position).normalize();
    const dist = cam.position.distanceTo(ctrl.target);
    const step = Math.max(0.12, dist * 0.28);
    if (dist - step > ctrl.minDistance) {
      cam.position.addScaledVector(dir, step);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    const cam = liveCameraRef.current.camera;
    const ctrl = liveCameraRef.current.controls;
    if (!cam || !ctrl) return;
    const dir = new THREE.Vector3().subVectors(cam.position, ctrl.target).normalize();
    const dist = cam.position.distanceTo(ctrl.target);
    const step = Math.max(0.25, dist * 0.32);
    if (dist + step < ctrl.maxDistance) {
      cam.position.addScaledVector(dir, step);
    }
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!boxRef.current) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void boxRef.current.requestFullscreen();
    }
  }, []);

  const hudBtnClass =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-[rgba(20,16,12,0.88)] text-[#f5ecdc] shadow-lg backdrop-blur-md transition-all hover:border-[var(--accent)] hover:bg-[rgba(32,24,18,0.95)] hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]";

  return (
    <div
      ref={boxRef}
      className="relative h-full w-full select-none overflow-hidden"
      data-peta-map
    >
      {/* Wadah Canvas Three.js */}
      <div
        ref={mountRef}
        className="absolute inset-0 h-full w-full"
        role="application"
        aria-label={t.peta.mapLabel}
        tabIndex={0}
      />

      {/* Kontrol HUD 3D di Pojok Kanan Atas */}
      <div className="peta-noprint pointer-events-auto absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
        {/* Tombol Navigasi Cepat Kamera 3D */}
        <div className="flex flex-col gap-1 rounded-xl border border-white/15 bg-[rgba(16,12,9,0.75)] p-1 shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={handleResetView}
            className={hudBtnClass}
            title="Atur Ulang Orientasi Nusantara 3D (Tampilan Nasional)"
            aria-label="Atur ulang orientasi 3D"
          >
            <Compass className="h-4 w-4 text-[var(--accent)] transition-transform hover:rotate-45" />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className={hudBtnClass}
            title="Perbesar Tampilan (Zoom In)"
            aria-label="Perbesar"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className={hudBtnClass}
            title="Perkecil Tampilan (Zoom Out)"
            aria-label="Perkecil"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className={hudBtnClass}
            title={isFullscreen ? "Keluar dari Layar Penuh" : "Layar Penuh"}
            aria-label={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>

        {/* Indikator Mode LOD 3D Nusantara */}
        {/* {lodState && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/15 bg-[rgba(16,12,9,0.85)] px-2.5 py-1 text-[10px] font-mono shadow-lg backdrop-blur-md">
            <span
              className={cn(
                "h-2 w-2 rounded-full transition-colors duration-300",
                lodState.lodMode === "3d-model"
                  ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                  : "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
              )}
            />
            <span className="text-[#f5ecdc]/90 uppercase tracking-wider font-semibold">
              {lodState.isStreetLevel ? "Tingkat Jalanan (OSM z=15)" : lodState.lodLabel}
            </span>
          </div>
        )} */}
      </div>

      {/* Petunjuk Kontrol Gestur 3D */}
      {showControlsHint && (
        <div
          className="pointer-events-none absolute bottom-3 right-3 z-10 hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-[rgba(16,12,9,0.85)] px-3 py-1.5 text-[11px] text-[#f5ecdc]/85 shadow-xl backdrop-blur-md animate-fade-in transition-opacity duration-500"
          role="note"
        >
          <Box className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
          <span>
            <strong className="text-[#f5ecdc]">Rotasi 3D:</strong> Klik kiri & seret · <strong className="text-[#f5ecdc]">Geser:</strong> Klik kanan / Shift · <strong className="text-[#f5ecdc]">Zoom:</strong> Gulir roda mouse
          </span>
          <button
            type="button"
            onClick={() => setShowControlsHint(false)}
            className="pointer-events-auto ml-1 text-xs opacity-60 hover:opacity-100"
            aria-label="Tutup petunjuk"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Hover Tooltip untuk Situs 3D */}
      {hoverInfo && (
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-[calc(100%+14px)] transition-opacity duration-150"
          style={{
            left: `${hoverInfo.x}px`,
            top: `${hoverInfo.y}px`,
          }}
        >
          <div className="flex flex-col gap-1 rounded-xl border border-[var(--accent)]/50 bg-[rgba(18,14,10,0.95)] p-3 shadow-2xl backdrop-blur-md min-w-[210px] max-w-[280px]">
            <div className="flex items-center justify-between gap-2">
              <span
                className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#0d0b09]"
                style={{ backgroundColor: hoverInfo.node.accentColor }}
              >
                {hoverInfo.node.categoryLabel}
              </span>
              <span className="font-mono text-[9px] text-[var(--accent)] uppercase tracking-tight">
                {hoverInfo.node.archetypeLabel}
              </span>
            </div>
            <div className="font-serif text-sm font-bold text-[#f5ecdc] leading-tight mt-0.5">
              {hoverInfo.node.name}
            </div>
            <p className="text-[11px] text-[#f5ecdc]/75 line-clamp-2 leading-relaxed">
              {hoverInfo.node.originStory}
            </p>
            <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-1.5 text-[10px] text-[#f5ecdc]/60">
              <span>
                {hoverInfo.exists
                  ? hoverInfo.active
                    ? `${hoverInfo.count} peristiwa`
                    : "Situs berdiri"
                  : "Belum berdiri"}
              </span>
              <span className="text-[var(--accent)] font-medium text-[9px]">
                Klik untuk fokus 3D
              </span>
            </div>
          </div>
          {/* Tooltip pointer arrow */}
          <div className="mx-auto h-2 w-2 -translate-y-1 rotate-45 border-b border-r border-[var(--accent)]/50 bg-[rgba(18,14,10,0.95)]" />
        </div>
      )}
    </div>
  );
}
