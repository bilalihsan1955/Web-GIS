'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useMapStore } from '@/store/useMapStore';
// sampleGeoJSON removed
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
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const hasAnimatedRef = useRef(false);
  const isAnimatingRef = useRef(false); // Guard: prevent pitch handler from killing flyTo

  // Use stable references to store actions to avoid effect re-runs
  const setMapInstance = useDashboardStore((s) => s.setMapInstance);
  const openViewer = useMapStore((s) => s.openViewer);

  const setupLayers = useCallback((map: mapboxgl.Map) => {
    const initialGeoJSON = useMapStore.getState().geoJSON || { type: 'FeatureCollection', features: [] };
    
    // ── GeoJSON Source with clustering ──────────────────────────────
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: initialGeoJSON,
      cluster: true,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      clusterRadius: CLUSTER_RADIUS,
    });

    // ── Cluster Circles (warna berlapis berdasarkan jumlah node) ────
    map.addLayer({
      id: LAYER_CLUSTERS,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#34d399', // emerald-400 — 2–9 node (cluster kecil)
          10,
          '#a78bfa', // violet-400  — 10–29 node (cluster sedang)
          30,
          '#fbbf24', // amber-400   — 30–99 node (cluster besar)
          100,
          '#fb7185', // rose-400    — 100+ node (cluster sangat besar)
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          16, // 2–9   (cluster kecil)
          10,
          26, // 10–29 (cluster sedang)
          30,
          36, // 30–99 (cluster besar)
          100,
          48, // 100+  (cluster sangat besar)
        ],
        'circle-stroke-width': 3,
        'circle-stroke-color': [
          'step',
          ['get', 'point_count'],
          'rgba(52, 211, 153, 0.3)',  // emerald glow
          10,
          'rgba(167, 139, 250, 0.3)', // violet glow
          30,
          'rgba(251, 191, 36, 0.3)',  // amber glow
          100,
          'rgba(251, 113, 133, 0.3)', // rose glow
        ],
        'circle-opacity': 0.9,
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

    // ── Unclustered Individual Points (node tunggal — biru terang) ──
    map.addLayer({
      id: LAYER_UNCLUSTERED,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#38bdf8', // sky-400 — warna unik untuk node tunggal
        'circle-radius': 7,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.95,
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
          const expansionZoom = Math.min((zoom ?? CLUSTER_MAX_ZOOM) + 2, 22); // +2 agar pasti terpisah

          // Guard: cegah pitch handler menginterupsi animasi
          isAnimatingRef.current = true;

          // Hitung pitch dinamis berdasarkan zoom (seperti efek scroll mouse)
          const targetPitch = Math.min(60, Math.max(0, ((expansionZoom - 4) / 11) * 60));

          (map as any)._isFlying = true;
          map.flyTo({
            center: geometry.coordinates as [number, number],
            zoom: expansionZoom,
            pitch: targetPitch, // Miring sesuai kedalaman zoom
            duration: 1200,
            essential: true,
            easing: (t) => 1 - Math.pow(1 - t, 3)
          });

          map.once('moveend', () => {
            (map as any)._isFlying = false;
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

      // ── HTML Markers for Unclustered Labels ────────────────────────
      map.on('render', () => {
        if (!map.isSourceLoaded(SOURCE_ID)) return;
        
        const currentZoom = map.getZoom();
        const features = map.queryRenderedFeatures({ layers: [LAYER_UNCLUSTERED] });
        const currentIds = new Set<string>();

        // Label teks muncul kapanpun node tunggal (unclustered) terlihat
        if (features.length > 0) {
          features.forEach(feature => {
            const id = feature.properties?.id;
            // FIX: Map strictly from the joined locationName
            const name = feature.properties?.locationName;
            if (!id) return;
            
            currentIds.add(id);

            if (!markersRef.current[id]) {
              // FIX: Root container to break out of layout restrictions
              const rootEl = document.createElement('div');
              rootEl.className = 'relative w-0 h-0';

              const labelEl = document.createElement('div');
              labelEl.className = 'absolute top-full left-1/2 -translate-x-1/2 mt-3.5 pointer-events-none whitespace-nowrap text-white text-xs font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-wider transition-opacity duration-300';
              labelEl.textContent = name || 'Unknown Location';
              
              rootEl.appendChild(labelEl);
              
              const geometry = feature.geometry as GeoJSON.Point;
              
              const marker = new mapboxgl.Marker({ element: rootEl, anchor: 'center' })
                .setLngLat(geometry.coordinates as [number, number])
                .addTo(map);
                
              markersRef.current[id] = marker;
            } else {
              // Keep coordinates synced if data updates
              const geometry = feature.geometry as GeoJSON.Point;
              markersRef.current[id].setLngLat(geometry.coordinates as [number, number]);
            }
          });
        }

        // Cleanup markers that are out of view, clustered, or hidden by zoom threshold
        Object.keys(markersRef.current).forEach(id => {
          if (!currentIds.has(id)) {
            markersRef.current[id].remove();
            delete markersRef.current[id];
          }
        });
      });
    },
    [openViewer],
  );

  const geoJSON = useMapStore((s) => s.geoJSON);
  const searchQuery = useMapStore((s) => s.searchQuery);
  const activeSection = useMapStore((s) => s.activeSection);

  // ── Sync GeoJSON data to map source when it loads from Supabase or filters change ──
  useEffect(() => {
    if (mapRef.current && geoJSON && isMapLoaded) {
      const source = mapRef.current.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
      if (source) {
        const filteredFeatures = geoJSON.features.filter((feature) => {
          const loc = feature.properties;
          if (!loc) return false;
          const matchesSearch = loc.locationName.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesSection = activeSection === 'ALL' ? true : loc.section === activeSection;
          return matchesSearch && matchesSection;
        });

        source.setData({
          type: 'FeatureCollection',
          features: filteredFeatures
        });
      }

      // ── Initial Cinematic Entry Animation (Bulletproof Deep Zoom) ──
      if (!hasAnimatedRef.current && geoJSON.features.length > 0) {
        hasAnimatedRef.current = true;
        
        // LOGIC FIX 1: Geographic Centroids fail if nodes are in different cities/countries (it zooms into empty space).
        // Solution: Guarantee a perfect landing by targeting the most recent spatial node.
        const focusFeature = geoJSON.features[0];
        const focusCoords = (focusFeature.geometry as GeoJSON.Point).coordinates as [number, number];

        // LOGIC FIX 2: The map.on('zoom') pitch handler was calling setPitch() every frame,
        // which Mapbox treats as a user interruption, aborting flyTo mid-flight.
        // Solution: Set a guard flag to disable pitch updates during animation.
        isAnimatingRef.current = true;
        
        mapRef.current.flyTo({
          center: focusCoords,
          zoom: 6.95, // Level jalan/blok — tidak terlalu dekat, tidak terlalu jauh
          speed: 1, // Sedikit lebih cepat dari 0.1 agar tidak terlalu lambat
          curve: 1,
          essential: true,
          easing: (t) => 1 - Math.pow(1 - t, 4)
        });
        
        // Re-enable pitch handler after animation completes
        mapRef.current.once('moveend', () => {
          isAnimatingRef.current = false;
        });
      }
    }
  }, [geoJSON, isMapLoaded, searchQuery, activeSection]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // ── Set token ────────────────────────────────────────────────────
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    // ── Create map ───────────────────────────────────────────────────
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_STYLE,
      center: INITIAL_CENTER,
      zoom: 1.5, // Start in deep space for cinematic drop-in
      maxZoom: 22, // THIS IS CRITICAL TO ALLOW DEEP ZOOM
      projection: GLOBE_PROJECTION,
      antialias: false, // performance: skip anti-aliasing
    });

    // ── Normalize Scroll Zoom Physics ────────────────────────────────
    map.scrollZoom.setZoomRate(1 / 50); 
    map.scrollZoom.setWheelZoomRate(1 / 50);

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
      setIsMapLoaded(true);
      setupInteractions(map);
    });

    // ── Dynamic 3D pitch based on zoom level ──────────────────────────
    //    zoom ≤ 4  → pitch 0° (flat globe view)
    //    zoom 4–15 → linear interpolation 0°–65°
    //    zoom ≥ 15 → capped at 65°
    map.on('zoom', () => {
      // CRITICAL FIX: Skip pitch updates while flyTo animation is running
      // setPitch() during flyTo causes Mapbox to abort the animation mid-flight
      if (isAnimatingRef.current || (map as any)._isFlying) return;
      
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
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
  }, [setupLayers, setupInteractions, setMapInstance]);

  return { mapContainerRef, mapRef };
}
