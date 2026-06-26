import { create } from 'zustand';
import type { SpatialNodeProperties } from '@/lib/geojson';
import type mapboxgl from 'mapbox-gl';

/**
 * Dashboard state — drives modal visibility and selected feature.
 *
 * Using atomic selectors (e.g. `useStore(s => s.isModalOpen)`) ensures
 * the Mapbox canvas never re-renders when unrelated state changes.
 */

interface SelectedFeature {
  coordinates: [number, number];
  properties: SpatialNodeProperties;
}

interface DashboardState {
  // ── Modal ───────────────────────────────────────────────────────────
  isModalOpen: boolean;
  selectedFeature: SelectedFeature | null;

  // ── Map Viewport (optional future use) ──────────────────────────────
  mapCenter: [number, number];
  mapZoom: number;

  // ── Map Instance & Layer State ──────────────────────────────────────
  mapInstance: mapboxgl.Map | null;
  isSatellite: boolean;

  // ── Actions ─────────────────────────────────────────────────────────
  openModal: (feature: SelectedFeature) => void;
  closeModal: () => void;
  setMapView: (center: [number, number], zoom: number) => void;
  setMapInstance: (map: mapboxgl.Map | null) => void;
  setIsSatellite: (val: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  isModalOpen: false,
  selectedFeature: null,
  mapCenter: [118.0, -2.5],
  mapZoom: 4,
  mapInstance: null,
  isSatellite: true,

  openModal: (feature) =>
    set({ isModalOpen: true, selectedFeature: feature }),

  closeModal: () =>
    set({ isModalOpen: false, selectedFeature: null }),

  setMapView: (center, zoom) =>
    set({ mapCenter: center, mapZoom: zoom }),

  setMapInstance: (map) =>
    set({ mapInstance: map }),

  setIsSatellite: (val) =>
    set({ isSatellite: val }),
}));
