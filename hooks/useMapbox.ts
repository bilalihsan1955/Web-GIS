'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useMapStore } from '@/store/useMapStore';
import { sampleGeoJSON } from '@/lib/geojson';
import {
  MAPBOX_STYLE,
  INITIAL_CENTER,
  INITIAL_ZOOM,
  GLOBE_PROJECTION,
  CLUSTER_RADIUS,
  CLUSTER_MAX_ZOOM,
  SOURCE_ID,
  LAYER_CLUSTERS,
  LAYER_CLUSTER_COUNT,
  LAYER_UNCLUSTERED,
} from '@/lib/constants';

/**
 * Custom hook that owns the entire Mapbox GL JS lifecycle:
 *   1. Initialise globe with dark satellite style
 *   2. Add GeoJSON source with clustering
 *   3. Wire cluster-expand + point-select click handlers
 *   4. **Destroy WebGL context on unmount** (critical for memory)
 *
 * Returns a ref to attach to the container `<div>`.
 */
export function useMapbox() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // Use stable references to store actions to avoid effect re-runs
  const setMapInstance = useDashboardStore((s) => s.setMapInstance);
  const openViewer = useMapStore((s) => s.openViewer);

  const setupLayers = useCallback((map: mapboxgl.Map) => {
    // ── GeoJSON Source with clustering ──────────────────────────────
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: sampleGeoJSON,
      cluster: true,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      clusterRadius: CLUSTER_RADIUS,
    });

    // ── Cluster Circles ────────────────────────────────────────────
    map.addLayer({
      id: LAYER_CLUSTERS,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#22d3ee', // cyan-400 — 1-9
          10,
          '#a78bfa', // violet-400 — 10-29
          30,
          '#f472b6', // pink-400 — 30+
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          18, // base
          10,
          26,
          30,
          34,
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255, 255, 255, 0.15)',
        'circle-opacity': 0.85,
      },
    });

    // ── Cluster Count Labels ───────────────────────────────────────
    map.addLayer({
      id: LAYER_CLUSTER_COUNT,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 13,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // ── Unclustered Individual Points ──────────────────────────────
    map.addLayer({
      id: LAYER_UNCLUSTERED,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#22d3ee',
        'circle-radius': 7,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    });
  }, []);

  const setupInteractions = useCallback(
    (map: mapboxgl.Map) => {
      // ── Click: Cluster → expand ──────────────────────────────────
      map.on('click', LAYER_CLUSTERS, (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [LAYER_CLUSTERS],
        });
        if (!features.length) return;

        const clusterId = features[0].properties?.cluster_id;
        const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;

        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          const geometry = features[0].geometry as GeoJSON.Point;

          map.easeTo({
            center: geometry.coordinates as [number, number],
            zoom: zoom ?? CLUSTER_MAX_ZOOM,
            duration: 500,
          });
        });
      });

      // ── Click: Unclustered point → open 360 viewer ─────────────────
      map.on('click', LAYER_UNCLUSTERED, (e) => {
        if (!e.features?.length) return;

        const feature = e.features[0];
        const id = feature.properties?.id;
        
        if (id) {
          openViewer(id);
        }
      });

      // ── Cursor affordance ────────────────────────────────────────
      const pointerLayers = [LAYER_CLUSTERS, LAYER_UNCLUSTERED];
      pointerLayers.forEach((layer) => {
        map.on('mouseenter', layer, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layer, () => {
          map.getCanvas().style.cursor = '';
        });
      });
    },
    [openViewer],
  );

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // ── Set token ────────────────────────────────────────────────────
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    // ── Create map ───────────────────────────────────────────────────
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_STYLE,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      projection: GLOBE_PROJECTION,
      antialias: false, // performance: skip anti-aliasing
    });

    mapRef.current = map;
    setMapInstance(map);

    // ── Navigation controls ──────────────────────────────────────────
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    // ── Globe atmosphere + data layers (re-runs on every style swap) ─
    map.on('style.load', () => {
      map.setFog({
        color: 'rgb(10, 10, 20)',
        'high-color': 'rgb(20, 20, 40)',
        'horizon-blend': 0.08,
        'space-color': 'rgb(5, 5, 15)',
        'star-intensity': 0.6,
      });

      // Re-add GeoJSON source + clustering layers after every style swap
      setupLayers(map);
    });

    // ── Interactions (registered once — persist across style changes) ─
    map.on('load', () => {
      setupInteractions(map);
    });

    // ── Dynamic 3D pitch based on zoom level ──────────────────────────
    //    zoom ≤ 4  → pitch 0° (flat globe view)
    //    zoom 4–15 → linear interpolation 0°–65°
    //    zoom ≥ 15 → capped at 65°
    map.on('zoom', () => {
      const zoom = map.getZoom();
      const MIN_ZOOM = 4;
      const MAX_ZOOM = 15;
      const MAX_PITCH = 65;

      const targetPitch =
        zoom <= MIN_ZOOM
          ? 0
          : Math.min(
              MAX_PITCH,
              ((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * MAX_PITCH,
            );

      // Only update if pitch differs noticeably (avoids micro-jitter)
      if (Math.abs(map.getPitch() - targetPitch) > 0.5) {
        map.setPitch(targetPitch);
      }
    });

    // ── CRITICAL: Destroy WebGL context on unmount ────────────────────
    return () => {
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
  }, [setupLayers, setupInteractions, setMapInstance]);

  return { mapContainerRef, mapRef };
}
