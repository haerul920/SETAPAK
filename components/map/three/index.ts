/**
 * Mesin Peta 3D Nusantara SETAPAK (Three.js 3D Engine & Data Bridge)
 * Menyediakan arsitektur peta 3D dari /maps:
 * - Bingkai showcase kartografi museum (`buildMapShowcaseFrame`)
 * - Ubin OpenStreetMap multi-tier bertingkat dari z=5 hingga z=16 street-level (`computeZoomLod`, `tileXYToWorldBounds`)
 * - Model 3D arsitektur budaya prosedural Nusantara (`buildCulturalArchetypeMesh`)
 * - Algoritma anti-tumpang-tindih melingkar (`computeDeclutteredPositions`, `getNodePositionAtCameraDistance`)
 * - Adaptor data situs SETAPAK (`getSetapakCulturalNodes`, `adaptPinStatesToCulturalNodes`)
 */

export * from "./nusantaraData";
export * from "./geoDeclutter";
export * from "./proceduralModels";
export * from "./setapakAdapter";

// Kompatibilitas dengan modul lama
export { Nusantara3DEngine } from "./engine";
export {
  createMaplibreThreeLayer,
  type CustomThreeLayer,
  type MaplibreThreeLayerState,
  type MapMonumentInstance,
} from "./maplibreThreeLayer";
