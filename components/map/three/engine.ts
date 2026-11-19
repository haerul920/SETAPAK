import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { SiteWithCategory, Site } from "@/data";
import { sites } from "@/data";
import type { PinState } from "@/lib/peta-data";
import {
  LOD_REGION_RADIUS_THRESHOLD,
  LOD_ZOOM_DISTANCE_THRESHOLD,
  cameraDistanceToZoom,
  geoToWorld,
  worldToGeo,
  zoomToCameraDistance,
} from "./coordinates";
import { createCulturalMonuments } from "./culturalModels";
import { createOsmNusantaraMap } from "./osmMap";
import { createProceduralTextures } from "./proceduralTextures";
import { createCulturalRoutes } from "./tradeRoutes";
import type {
  CulturalMonumentInstance,
  HoverSiteInfo,
  MonumentSystem,
  Nusantara3DOptions,
  OsmMapSystem,
  ProceduralTextureSet,
  RouteSystem,
} from "./types";

const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();
const _vec3 = new THREE.Vector3();
const _defaultCamPos = new THREE.Vector3(0, 34, 34);
const _defaultTarget = new THREE.Vector3(0, 0.0, 0.2);

export class Nusantara3DEngine {
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public controls: OrbitControls;

  private textures: ProceduralTextureSet;
  private osmMap: OsmMapSystem;
  private monumentSystem: MonumentSystem;
  private routeSystem: RouteSystem;

  private isSoftwareGl: boolean;
  private options: Nusantara3DOptions;
  private disposed = false;
  private frameId = 0;
  private lastTime = performance.now();
  private elapsed = 0;
  private lastHoverCheck = 0;
  private pointerDownPos = { x: 0, y: 0 };
  private lastReportedZoomMode = false;
  private lastReportedCenter = { lat: -2.3, lng: 118, zoom: 3.6 };
  private moveDebounceTimer = 0;

  private currentYear = 2026;
  private showRoutes = true;
  private selectedSlug: string | null = null;
  private pulseSlugs: ReadonlySet<string> = new Set();

  private cameraGoal = {
    active: false,
    camPos: _defaultCamPos.clone(),
    targetPos: _defaultTarget.clone(),
  };

  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement, options: Nusantara3DOptions = {}) {
    this.container = container;
    this.options = options;
    if (options.initialYear !== undefined) {
      this.currentYear = options.initialYear;
    }
    if (options.showRoutes !== undefined) {
      this.showRoutes = options.showRoutes;
    }

    this.isSoftwareGl = (() => {
      try {
        const probe = document.createElement("canvas").getContext("webgl2");
        if (!probe) return true;
        const ext = probe.getExtension("WEBGL_debug_renderer_info");
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension("WEBGL_lose_context")?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true, // Dibutuhkan oleh fungsi saveImage() di PetaClient
    });

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    const canvas = this.renderer.domElement;
    canvas.style.display = "block";
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.setAttribute("data-testid", "nusantara-3d-canvas");
    container.appendChild(canvas);

    // Scene & Pencahayaan Studio Nusantara
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1822);
    this.scene.fog = new THREE.FogExp2(0x0b1822, 0.0082);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    // Camera
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.2, 220);
    this.camera.position.copy(_defaultCamPos);

    // Controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(_defaultTarget);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 6.5;
    this.controls.maxDistance = 66;
    this.controls.minPolarAngle = 0.16;
    this.controls.maxPolarAngle = Math.PI * 0.44;
    this.controls.panSpeed = 0.85;
    this.controls.rotateSpeed = 0.72;
    this.controls.update();

    this.controls.addEventListener("start", () => {
      this.cameraGoal.active = false;
    });

    this.controls.addEventListener("change", () => {
      this.triggerCenterChange();
    });

    // Rig Pencahayaan 3-Titik Seimbang
    const hemiLight = new THREE.HemisphereLight(0xbbe0f8, 0x132c38, 0.95);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff2da, 1.6);
    keyLight.position.set(20, 36, 18);
    keyLight.castShadow = !this.isSoftwareGl;
    if (!this.isSoftwareGl) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 4;
      keyLight.shadow.camera.far = 90;
      const d = 32;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6bbad4, 0.55);
    rimLight.position.set(-26, 16, -20);
    this.scene.add(rimLight);

    // Tekstur prosedural, Peta OSM, Monumen Budaya, dan Jalur Maritim
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);
    this.osmMap = createOsmNusantaraMap(maxAniso, this.isSoftwareGl);
    this.scene.add(this.osmMap.group);

    this.monumentSystem = createCulturalMonuments(
      sites,
      this.textures,
      this.osmMap.getSurfaceY,
      this.isSoftwareGl
    );
    this.scene.add(this.monumentSystem.group);

    this.routeSystem = createCulturalRoutes(this.osmMap.getSurfaceY);
    this.scene.add(this.routeSystem.group);

    // Layer 1 Raycasting setup
    _raycaster.layers.set(1);

    // Event listeners
    canvas.addEventListener("pointerdown", this.handlePointerDown);
    canvas.addEventListener("pointerup", this.handlePointerUp);
    canvas.addEventListener("pointermove", this.handlePointerMove);

    window.addEventListener("resize", this.handleResize);
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    // Mulai animasi loop
    this.tick();
  }

  private handleResize = () => {
    if (this.disposed || !this.container) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private updatePointerNdc(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handlePointerDown = (e: PointerEvent) => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  private handlePointerUp = (e: PointerEvent) => {
    const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (dist > 6) return;

    this.updatePointerNdc(e);
    _raycaster.setFromCamera(_pointer, this.camera);
    const hits = _raycaster.intersectObjects(this.monumentSystem.hitProxies, false);

    if (hits.length > 0) {
      const slug = hits[0].object.userData.siteSlug as string | undefined;
      if (slug) {
        const mon = this.monumentSystem.monumentBySlug.get(slug);
        if (mon && (mon.targetScale > 0.05 || mon.targetDotScale > 0.05)) {
          this.options.onSelectSite?.(slug);
        }
      }
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    const now = performance.now();
    if (now - this.lastHoverCheck < 45) return;
    this.lastHoverCheck = now;

    this.updatePointerNdc(e);
    _raycaster.setFromCamera(_pointer, this.camera);
    const hits = _raycaster.intersectObjects(this.monumentSystem.hitProxies, false);

    let found: CulturalMonumentInstance | null = null;
    if (hits.length > 0) {
      const slug = hits[0].object.userData.siteSlug as string | undefined;
      if (slug) {
        const mon = this.monumentSystem.monumentBySlug.get(slug);
        if (mon && (mon.targetScale > 0.05 || mon.targetDotScale > 0.05)) {
          found = mon;
        }
      }
    }

    const canvas = this.renderer.domElement;
    if (found) {
      canvas.style.cursor = "pointer";
      const hoverInfo: HoverSiteInfo = {
        site: found.site,
        x: e.clientX,
        y: e.clientY,
        archetype: found.archetype,
        color: found.accentColor,
        exists: found.exists,
        active: found.active,
        count: found.eventCount,
      };
      this.options.onHoverSite?.(hoverInfo);
    } else {
      canvas.style.cursor = "grab";
      this.options.onHoverSite?.(null);
    }
  };

  private triggerCenterChange() {
    if (this.disposed) return;
    const now = performance.now();
    if (now - this.moveDebounceTimer < 120) return;
    this.moveDebounceTimer = now;

    const geo = worldToGeo(this.controls.target.x, this.controls.target.z);
    const dist = this.camera.position.distanceTo(this.controls.target);
    const zoom = cameraDistanceToZoom(dist);

    this.lastReportedCenter = { lat: geo.lat, lng: geo.lon, zoom };
    this.options.onCameraChange?.(this.lastReportedCenter);
  }

  private tick = () => {
    if (this.disposed) return;
    this.frameId = requestAnimationFrame(this.tick);

    const now = performance.now();
    const dt = Math.min(0.08, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.elapsed += dt;

    // Smooth damped camera fly-to
    if (this.cameraGoal.active) {
      const k = 5.5;
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.cameraGoal.camPos.x, k, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.cameraGoal.camPos.y, k, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.cameraGoal.camPos.z, k, dt);
      this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, this.cameraGoal.targetPos.x, k, dt);
      this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, this.cameraGoal.targetPos.y, k, dt);
      this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, this.cameraGoal.targetPos.z, k, dt);

      const distCam = this.camera.position.distanceTo(this.cameraGoal.camPos);
      const distTarget = this.controls.target.distanceTo(this.cameraGoal.targetPos);
      if (distCam < 0.08 && distTarget < 0.05) {
        this.cameraGoal.active = false;
      }
    }
    this.controls.update();

    const cameraDistance = this.camera.position.distanceTo(this.controls.target);
    this.osmMap.updateDetailPatch(this.controls.target.x, this.controls.target.z, cameraDistance);

    let anyModelVisible = false;

    // Update monumen cagar budaya (transisi dinamis antara titik pemancar & model 3D)
    for (let i = 0; i < this.monumentSystem.monuments.length; i++) {
      const m = this.monumentSystem.monuments[i];

      const distFromFocus = Math.hypot(
        m.root.position.x - this.controls.target.x,
        m.root.position.z - this.controls.target.z
      );

      const zoomedToRegion =
        cameraDistance <= LOD_ZOOM_DISTANCE_THRESHOLD &&
        distFromFocus <= LOD_REGION_RADIUS_THRESHOLD;

      const showModel =
        m.active &&
        (zoomedToRegion || (m.isSelected && cameraDistance <= LOD_ZOOM_DISTANCE_THRESHOLD + 4));

      const showPulseDot = m.active && !showModel;

      if (showModel) anyModelVisible = true;

      // Target skala 3D model arsitektur
      m.targetScale = showModel ? (m.isSelected ? 1.42 : 1.18) : 0;
      m.currentScale = THREE.MathUtils.damp(m.currentScale, m.targetScale, 8.0, dt);

      // Target skala titik pemancar denyut
      m.targetDotScale = showPulseDot ? (m.isSelected ? 1.25 : 1.0) : 0;
      m.dotScale = THREE.MathUtils.damp(m.dotScale, m.targetDotScale, 9.0, dt);

      const rootVisible = m.currentScale > 0.015 || m.dotScale > 0.015;
      m.root.visible = rootVisible;
      if (!rootVisible) continue;

      if (m.currentScale <= 0.015) {
        m.modelGroup.visible = false;
        m.shadowMesh.visible = false;
        m.haloMesh.visible = false;
      } else {
        m.modelGroup.visible = true;
        m.shadowMesh.visible = true;
        m.haloMesh.visible = true;
        m.modelGroup.scale.setScalar(m.currentScale);
        m.modelGroup.position.y = (1 - Math.min(1, m.currentScale)) * -0.35;
        m.shadowMesh.scale.setScalar(m.currentScale);

        const pulse = 1 + Math.sin(this.elapsed * 2.4 + i) * 0.08;
        if (m.isSelected) {
          m.haloMesh.scale.setScalar(1.35 * pulse);
          m.haloMaterial.opacity = 0.88;
        } else if (m.isPulse) {
          m.haloMesh.scale.setScalar(1.25 * pulse);
          m.haloMaterial.opacity = 0.75;
        } else {
          m.haloMesh.scale.setScalar(1.0);
          m.haloMaterial.opacity = m.active ? 0.35 : 0.12;
        }
      }

      // Animasi denyut titik pemancar ring A & B
      if (m.dotScale <= 0.015) {
        m.pulseGroup.visible = false;
      } else {
        m.pulseGroup.visible = true;
        m.pulseGroup.scale.setScalar(m.dotScale);

        const rate = m.isSelected || m.isPulse ? 3.2 : 2.0;
        const phaseA = (this.elapsed * rate + i * 0.37) % 1;
        const phaseB = (this.elapsed * rate + i * 0.37 + 0.5) % 1;

        const scaleA = 0.8 + phaseA * 1.8;
        m.pulseRingA.scale.set(scaleA, scaleA, 1);
        m.pulseMatA.opacity = Math.max(0, 0.85 * (1 - phaseA));

        const scaleB = 0.8 + phaseB * 1.8;
        m.pulseRingB.scale.set(scaleB, scaleB, 1);
        m.pulseMatB.opacity = Math.max(0, 0.85 * (1 - phaseB));
      }
    }

    if (anyModelVisible !== this.lastReportedZoomMode) {
      this.lastReportedZoomMode = anyModelVisible;
      this.options.onZoomModeChange?.(anyModelVisible);
    }

    // Update jalur difusi dan niaga rempah
    this.routeSystem.updateRoutes(this.currentYear, this.showRoutes, dt);

    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Memperbarui daftar pin aktif, tahun linimasa, seleksi, dan denyut situs.
   */
  public updatePins(
    pins: PinState[],
    toYear: number,
    pulseSlugs?: ReadonlySet<string>,
    selectedSlug?: string | null
  ) {
    this.currentYear = toYear;
    this.selectedSlug = selectedSlug !== undefined ? selectedSlug : this.selectedSlug;
    if (pulseSlugs) this.pulseSlugs = pulseSlugs;

    const pinMap = new Map(pins.map((p) => [p.site.slug, p]));

    for (let i = 0; i < this.monumentSystem.monuments.length; i++) {
      const mon = this.monumentSystem.monuments[i];
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

      mon.isSelected = mon.site.slug === this.selectedSlug;
      mon.isPulse = this.pulseSlugs.has(mon.site.slug);
    }
  }

  public setShowRoutes(show: boolean) {
    this.showRoutes = show;
  }

  public flyTo(lat: number, lng: number, zoom = 8, durationMs = 1200) {
    const { x, z } = geoToWorld(lat, lng);
    const dist = zoomToCameraDistance(zoom);
    const offsetZ = Math.min(12, dist * 0.72);
    const offsetY = Math.min(18, dist * 0.68);

    this.cameraGoal.targetPos.set(x, 0.2, z);
    this.cameraGoal.camPos.set(x, offsetY, z + offsetZ);

    if (durationMs <= 0) {
      this.camera.position.copy(this.cameraGoal.camPos);
      this.controls.target.copy(this.cameraGoal.targetPos);
      this.controls.update();
      this.cameraGoal.active = false;
    } else {
      this.cameraGoal.active = true;
    }
  }

  public resetCamera(durationMs = 1200) {
    this.cameraGoal.targetPos.copy(_defaultTarget);
    this.cameraGoal.camPos.copy(_defaultCamPos);
    if (durationMs <= 0) {
      this.camera.position.copy(this.cameraGoal.camPos);
      this.controls.target.copy(this.cameraGoal.targetPos);
      this.controls.update();
      this.cameraGoal.active = false;
    } else {
      this.cameraGoal.active = true;
    }
  }

  public zoomIn() {
    const dir = new THREE.Vector3().subVectors(this.controls.target, this.camera.position).normalize();
    const dist = this.camera.position.distanceTo(this.controls.target);
    const step = Math.max(1.5, dist * 0.25);
    if (dist - step > this.controls.minDistance) {
      this.camera.position.addScaledVector(dir, step);
    }
  }

  public zoomOut() {
    const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
    const dist = this.camera.position.distanceTo(this.controls.target);
    const step = Math.max(2.0, dist * 0.25);
    if (dist + step < this.controls.maxDistance) {
      this.camera.position.addScaledVector(dir, step);
    }
  }

  public triggerRepaint() {
    if (!this.disposed) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /**
   * Memproyeksikan koordinat [lng, lat] ke titik piksel layar canvas
   * (cocok dengan antarmuka MapLibre m.project([lng, lat]) yang dipanggil di saveImage()).
   */
  public project(coords: [number, number]): { x: number; y: number } {
    const [lng, lat] = coords;
    const { x, z } = geoToWorld(lat, lng);
    _vec3.set(x, 0.05, z);
    _vec3.project(this.camera);

    const canvas = this.renderer.domElement;
    const halfW = canvas.clientWidth / 2;
    const halfH = canvas.clientHeight / 2;

    return {
      x: _vec3.x * halfW + halfW,
      y: -_vec3.y * halfH + halfH,
    };
  }

  /**
   * Membuat objek tiruan kompatibilitas MapLibre (MapLibre mock)
   * sehingga PetaClient.tsx (yang memanggil m.getCanvas(), m.project(), m.once(), dll.)
   * berfungsi tanpa perlu modifikasi pada PetaClient.tsx!
   */
  public createMaplibreMock(): any {
    const self = this;
    return {
      getCanvas: () => self.getCanvas(),
      project: (coords: [number, number]) => self.project(coords),
      triggerRepaint: () => self.triggerRepaint(),
      once: (event: string, callback: () => void) => {
        if (event === "idle" || event === "render") {
          setTimeout(callback, 60);
        }
      },
      on: () => {},
      off: () => {},
      getZoom: () => cameraDistanceToZoom(self.camera.position.distanceTo(self.controls.target)),
      getCenter: () => {
        const geo = worldToGeo(self.controls.target.x, self.controls.target.z);
        return { lat: geo.lat, lng: geo.lon };
      },
      flyTo: (opts: { center?: [number, number]; zoom?: number; duration?: number }) => {
        if (opts.center) {
          self.flyTo(opts.center[1], opts.center[0], opts.zoom ?? 8, opts.duration ?? 1200);
        }
      },
      easeTo: (opts: { center?: [number, number]; zoom?: number; duration?: number }) => {
        if (opts.center) {
          self.flyTo(opts.center[1], opts.center[0], opts.zoom ?? 8, opts.duration ?? 600);
        }
      },
      resize: () => self.handleResize(),
    };
  }

  public resize() {
    this.handleResize();
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointerdown", this.handlePointerDown);
    canvas.removeEventListener("pointerup", this.handlePointerUp);
    canvas.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("resize", this.handleResize);

    this.resizeObserver?.disconnect();
    this.controls.dispose();
    this.monumentSystem.dispose();
    this.routeSystem.dispose();
    this.osmMap.dispose();
    this.textures.dispose();
    this.renderer.dispose();

    if (canvas.parentElement) {
      canvas.parentElement.removeChild(canvas);
    }
  }
}
