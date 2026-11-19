import type * as THREE from "three";
import type { SiteWithCategory, Category } from "@/data";
import type { PinState } from "@/lib/peta-data";

export type ModelArchetype =
  | "stupa"
  | "prambanan"
  | "tajug"
  | "gadang"
  | "pura"
  | "tongkonan"
  | "pinisi"
  | "nekara"
  | "megalith"
  | "joglo"
  | "honai"
  | "monument"
  | "benteng"
  | "prasasti"
  | "gapura";

export interface CulturalMonumentInstance {
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
  hitProxy: THREE.Mesh;
  baseY: number;
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
}

export interface SharedMaterials {
  andesite: THREE.MeshStandardMaterial;
  terracotta: THREE.MeshStandardMaterial;
  teakwood: THREE.MeshStandardMaterial;
  darkPalm: THREE.MeshStandardMaterial;
  goldLeaf: THREE.MeshStandardMaterial;
  bronzePatina: THREE.MeshStandardMaterial;
  limestone: THREE.MeshStandardMaterial;
  sailCloth: THREE.MeshStandardMaterial;
  brickRed: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  beaconBacking: THREE.MeshBasicMaterial;
  beaconHighlight: THREE.MeshBasicMaterial;
}

export interface MonumentSystem {
  group: THREE.Group;
  monuments: CulturalMonumentInstance[];
  hitProxies: THREE.Mesh[];
  monumentBySlug: Map<string, CulturalMonumentInstance>;
  dispose: () => void;
}

export interface ProceduralTextureSet {
  terrainBumpMap: THREE.CanvasTexture;
  stoneBumpMap: THREE.CanvasTexture;
  woodGrainMap: THREE.CanvasTexture;
  oceanGridMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  dispose: () => void;
}

export interface OsmMapSystem {
  group: THREE.Group;
  getSurfaceY: (lat: number, lon: number) => number;
  updateDetailPatch: (targetX: number, targetZ: number, cameraDistance: number) => void;
  dispose: () => void;
}

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface CulturalRouteDefinition {
  id: string;
  name: string;
  appearYear: number;
  fadeYear: number;
  color: string;
  description: string;
  points: RoutePoint[];
}

export interface RouteArcInstance {
  route: CulturalRouteDefinition;
  curve: THREE.CatmullRomCurve3;
  tubeMesh: THREE.Mesh;
  tubeMaterial: THREE.MeshStandardMaterial;
  beadMesh: THREE.Mesh;
  beadMaterial: THREE.MeshBasicMaterial;
  phaseOffset: number;
}

export interface RouteSystem {
  group: THREE.Group;
  routes: RouteArcInstance[];
  updateRoutes: (toYear: number, visible: boolean, dt: number) => boolean;
  dispose: () => void;
}

export interface HoverSiteInfo {
  site: SiteWithCategory;
  x: number;
  y: number;
  archetype: ModelArchetype;
  color: string;
  exists: boolean;
  active: boolean;
  count: number;
}

export interface CameraView {
  lat: number;
  lng: number;
  zoom: number;
}

export interface Nusantara3DOptions {
  onSelectSite?: (slug: string) => void;
  onHoverSite?: (info: HoverSiteInfo | null) => void;
  onCameraChange?: (view: CameraView) => void;
  onZoomModeChange?: (isRegional: boolean) => void;
  showRoutes?: boolean;
  initialYear?: number;
}
