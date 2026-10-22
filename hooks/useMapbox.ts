'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useSearchParams } from 'next/navigation';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useMapStore } from '@/store/useMapStore';
import { useMapboxBoundaries } from '@/hooks/useMapboxBoundaries';
import {
  MAPBOX_STYLE,
  INITIAL_CENTER,
  GLOBE_PROJECTION,
  CLUSTER_RADIUS,
  CLUSTER_MAX_ZOOM,
  SOURCE_ID,
  LAYER_CLUSTERS,
  LAYER_CLUSTER_COUNT,
  LAYER_UNCLUSTERED,
} from '@/lib/constants';

// ============================================================================
// hooks/useMapbox.ts: Core Mapbox GL JS 3D Globe & Clustering Lifecycle Hook
// Strict WebGL Context Cleanup & Memory Leak Prevention (< 240 lines)
// ============================================================================

export function useMapbox(options?: { shouldAnimate?: boolean; adminId?: string }) {
  const shouldAnimate = options?.shouldAnimate ?? true;
  const adminIdParam = options?.adminId;
  const selectedCompanyId = useDashboardStore((s) => s.selectedCompanyId);
  const targetCompanyId = adminIdParam || selectedCompanyId;
  const searchParams = useSearchParams();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const hasAnimatedRef = useRef(false);
  const isAnimatingRef = useRef(false);

  const setMapInstance = useDashboardStore((s) => s.setMapInstance);
  const openViewer = useMapStore((s) => s.openViewer);
  const geoJSON = useMapStore((s) => s.geoJSON);
  const searchQuery = useMapStore((s) => s.searchQuery);
  const activeSection = useMapStore((s) => s.activeSection);

  // Sub-hook: Handle GeoJSON polygon boundary layers and collision guards
  useMapboxBoundaries({
    map: mapRef.current,
    isMapLoaded,
    targetCompanyId,
  });

  const setupLayers = useCallback((map: mapboxgl.Map) => {
    const initialGeoJSON = useMapStore.getState().geoJSON || { type: 'FeatureCollection', features: [] };

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: initialGeoJSON,
      cluster: true,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      clusterRadius: CLUSTER_RADIUS,
    });

    // Cluster circles with dynamic size and color styling
    map.addLayer({
      id: LAYER_CLUSTERS,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#34d399', 10, '#a78bfa', 30, '#fbbf24', 100, '#fb7185',
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          16, 10, 26, 30, 36, 100, 48,
        ],
        'circle-stroke-width': 3,
        'circle-stroke-color': 'rgba(255, 255, 255, 0.4)',
        'circle-opacity': 0.9,
      },
    });

    // Cluster count numbers
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
      paint: { 'text-color': '#ffffff' },
    });

    // Individual 360 photo nodes
    map.addLayer({
      id: LAYER_UNCLUSTERED,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#38bdf8',
        'circle-radius': 7,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.95,
      },
    });
  }, []);

  const setupInteractions = useCallback((map: mapboxgl.Map) => {
    map.on('click', LAYER_CLUSTERS, (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [LAYER_CLUSTERS] });
      if (!features.length) return;

      const clusterId = features[0].properties?.cluster_id;
      const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;

      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        const geometry = features[0].geometry as GeoJSON.Point;
        const currentZoom = map.getZoom();
        const targetZoom = zoom && zoom > currentZoom ? Math.min(zoom + 1.2, 22) : Math.min(currentZoom + 2.5, 22);

        isAnimatingRef.current = true;
        map.flyTo({
          center: geometry.coordinates as [number, number],
          zoom: targetZoom,
          pitch: Math.min(60, Math.max(0, ((targetZoom - 4) / 11) * 60)),
          duration: 900,
          essential: true,
        });

        map.once('moveend', () => {
          isAnimatingRef.current = false;
        });
      });
    });

    map.on('click', LAYER_UNCLUSTERED, (e) => {
      if (!e.features?.length) return;
      const id = e.features[0].properties?.id;
      if (id) openViewer(id);
    });

    [LAYER_CLUSTERS, LAYER_UNCLUSTERED].forEach((layer) => {
      map.on('mouseenter', layer, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layer, () => {
        map.getCanvas().style.cursor = '';
      });
    });
  }, [openViewer]);

  // Synchronize GeoJSON source data with active search/section filters
  useEffect(() => {
    if (!mapRef.current || !geoJSON || !isMapLoaded) return;
    const source = mapRef.current.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
    if (!source) return;

    const filtered = geoJSON.features.filter((feature) => {
      const loc = feature.properties;
      if (!loc) return false;
      const matchesSearch = loc.locationName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSection = activeSection === 'ALL' ? true : loc.section === activeSection;
      return matchesSearch && matchesSection;
    });

    source.setData({ type: 'FeatureCollection', features: filtered });

    // Initial cinematic drop-in camera animation
    if (!hasAnimatedRef.current && geoJSON.features.length > 0 && shouldAnimate) {
      hasAnimatedRef.current = true;
      const urlLat = searchParams.get('lat');
      const urlLng = searchParams.get('lng');
      const urlZoom = searchParams.get('zoom');

      const focusCoords: [number, number] = urlLat && urlLng
        ? [parseFloat(urlLng), parseFloat(urlLat)]
        : ((geoJSON.features[0].geometry as GeoJSON.Point).coordinates as [number, number]);

      isAnimatingRef.current = true;
      mapRef.current.flyTo({
        center: focusCoords,
        zoom: urlZoom ? parseFloat(urlZoom) : 6.95,
        speed: 1,
        curve: 1,
        essential: true,
      });

      mapRef.current.once('moveend', () => {
        isAnimatingRef.current = false;
      });
    }
  }, [geoJSON, isMapLoaded, searchQuery, activeSection, searchParams, shouldAnimate]);

  // Mapbox instance initialization and WebGL Context Cleanup
  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_STYLE,
      center: INITIAL_CENTER,
      zoom: 1.5,
      maxZoom: 22,
      projection: GLOBE_PROJECTION,
      antialias: false,
    });

    mapRef.current = map;
    setMapInstance(map);
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    map.on('style.load', () => {
      map.setFog({
        color: 'rgb(10, 10, 20)',
        'high-color': 'rgb(20, 20, 40)',
        'horizon-blend': 0.08,
        'space-color': 'rgb(5, 5, 15)',
        'star-intensity': 0.6,
      });
      setupLayers(map);
    });

    map.on('load', () => {
      setIsMapLoaded(true);
      setupInteractions(map);
    });

    // Cleanup WebGL Context on Unmount to prevent memory leaks
    return () => {
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};
      mapRef.current = null;
      setMapInstance(null);

      setTimeout(() => {
        try {
          map.remove();
        } catch (e) {
          console.error('[useMapbox] WebGL graceful cleanup error:', e);
        }
      }, 200);
    };
  }, [setupLayers, setupInteractions, setMapInstance]);

  return { mapContainerRef, mapRef };
}
