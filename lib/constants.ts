/**
 * Map configuration constants.
 * Centralised here to avoid magic strings/numbers across components.
 */

// ── Mapbox Style ────────────────────────────────────────────────────────────
export const MAPBOX_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';

// ── Initial Viewport ────────────────────────────────────────────────────────
export const INITIAL_CENTER: [number, number] = [118.0, -2.5]; // Indonesia
export const INITIAL_ZOOM = 4;

// ── Globe Projection ────────────────────────────────────────────────────────
export const GLOBE_PROJECTION = 'globe' as const;

// ── Clustering ──────────────────────────────────────────────────────────────
export const CLUSTER_RADIUS = 35;   // Radius lebih kecil agar node lebih mudah terpisah
export const CLUSTER_MAX_ZOOM = 20;  // Clustering aktif sampai zoom 20, memungkinkan pemisahan di zoom tinggi

// ── Source / Layer IDs (prevents typos) ─────────────────────────────────────
export const SOURCE_ID = 'spatial-nodes';
export const LAYER_CLUSTERS = 'clusters';
export const LAYER_CLUSTER_COUNT = 'cluster-count';
export const LAYER_UNCLUSTERED = 'unclustered-point';

// ── Leaflet Tile Providers ──────────────────────────────────────────────────
export const LEAFLET_DARK_TILE =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export const LEAFLET_ATTRIBUTION =
  '&copy; <a href="https://carto.com/">CARTO</a>';
