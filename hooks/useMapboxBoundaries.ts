'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapStore } from '@/store/useMapStore';
import { sanitizeHtmlString } from '@/lib/validations/security';
import { LAYER_CLUSTERS, LAYER_CLUSTER_COUNT, LAYER_UNCLUSTERED } from '@/lib/constants';

// ============================================================================
// hooks/useMapboxBoundaries.ts: GeoJSON Boundary Layers & Collision Guard Hook
// Stacks polygon boundaries under photo nodes and prevents Stored DOM XSS
// ============================================================================

interface UseMapboxBoundariesProps {
  map: mapboxgl.Map | null;
  isMapLoaded: boolean;
  targetCompanyId?: string;
}

export function useMapboxBoundaries({ map, isMapLoaded, targetCompanyId }: UseMapboxBoundariesProps) {
  const boundaries = useMapStore((s) => s.boundaries);
  const fetchBoundaries = useMapStore((s) => s.fetchBoundaries);
  const activePopupsRef = useRef<mapboxgl.Popup[]>([]);

  // Fetch boundaries with full GeoJSON for map rendering (?include_geojson=true handled in store)
  useEffect(() => {
    fetchBoundaries(targetCompanyId);
  }, [targetCompanyId, fetchBoundaries]);

  // Sync Boundary Polygons into Mapbox layers
  useEffect(() => {
    if (!map || !isMapLoaded) return;

    boundaries.forEach((boundary) => {
      const sourceId = `boundary-source-${boundary.id}`;
      const fillLayerId = `boundary-fill-${boundary.id}`;
      const lineLayerId = `boundary-line-${boundary.id}`;

      let source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;

      // Ensure boundary layers are always placed UNDER photo node clusters and points
      const beforeLayerId = map.getLayer(LAYER_CLUSTERS)
        ? LAYER_CLUSTERS
        : map.getLayer(LAYER_UNCLUSTERED)
        ? LAYER_UNCLUSTERED
        : undefined;

      if (!source) {
        if (!boundary.geojson) return;

        map.addSource(sourceId, {
          type: 'geojson',
          data: boundary.geojson,
        });

        // Add fill layer UNDER photo nodes
        map.addLayer(
          {
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': boundary.color || '#06b6d4',
              'fill-opacity': boundary.is_visible ? boundary.opacity || 0.35 : 0,
            },
          },
          beforeLayerId
        );

        // Add line stroke layer UNDER photo nodes
        map.addLayer(
          {
            id: lineLayerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': boundary.color || '#06b6d4',
              'line-width': 2.5,
              'line-opacity': boundary.is_visible ? 0.9 : 0,
            },
          },
          beforeLayerId
        );

        // Click listener for polygon popup with Collision Guard & Stored DOM XSS Sanitization
        map.on('click', fillLayerId, (e) => {
          // 1. Collision Guard: Check if a node point or cluster circle was clicked on top
          const activePointLayers = [LAYER_UNCLUSTERED, LAYER_CLUSTERS, LAYER_CLUSTER_COUNT].filter((id) =>
            map.getLayer(id)
          );
          if (activePointLayers.length > 0) {
            const nodeFeatures = map.queryRenderedFeatures(e.point, { layers: activePointLayers });
            if (nodeFeatures && nodeFeatures.length > 0) {
              return; // Node point clicked — skip boundary popup
            }
          }

          if (e.features && e.features[0]) {
            const props = e.features[0].properties || {};
            const cleanTitle = sanitizeHtmlString((boundary.name || 'Batas Wilayah').replace(/_/g, ' '));

            // Sanitize feature properties to prevent Stored DOM XSS (OWASP A03:2021)
            const propsRows = Object.entries(props)
              .filter(([k]) => !k.startsWith('_') && typeof k === 'string' && k.toLowerCase() !== 'layer')
              .slice(0, 6)
              .map(([k, v]) => {
                const safeKey = sanitizeHtmlString(k.replace(/_/g, ' '));
                const safeVal = sanitizeHtmlString(String(v));
                return `
                  <div class="flex items-center justify-between text-[11px] py-1 border-b border-zinc-200 dark:border-white/10 gap-2">
                    <span class="text-zinc-500 dark:text-zinc-400 font-medium truncate capitalize">${safeKey}</span>
                    <span class="text-zinc-800 dark:text-zinc-200 font-semibold truncate max-w-[120px] text-right">${safeVal}</span>
                  </div>
                `;
              })
              .join('');

            const popupNode = document.createElement('div');
            popupNode.className = 'flex flex-col gap-2.5 text-zinc-900 dark:text-white max-w-[280px] p-1';
            popupNode.innerHTML = `
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full shrink-0 shadow-md" style="background-color: ${sanitizeHtmlString(boundary.color || '#06b6d4')}"></span>
                <h4 class="font-bold text-sm text-zinc-900 dark:text-white leading-tight break-words flex-1">${cleanTitle}</h4>
              </div>

              <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-400 text-xs font-bold w-fit">
                <span>Luas: ${boundary.total_area_ha?.toLocaleString('id-ID')} ha</span>
              </div>

              ${propsRows ? `<div class="mt-1 space-y-0.5 max-h-36 overflow-y-auto pr-1">${propsRows}</div>` : ''}
            `;

            const popup = new mapboxgl.Popup({ closeButton: true, maxWidth: '300px' })
              .setLngLat(e.lngLat)
              .setDOMContent(popupNode)
              .addTo(map);

            activePopupsRef.current.push(popup);
          }
        });
      } else {
        // Update existing layer data and visibility
        if (boundary.geojson) {
          source.setData(boundary.geojson);
        }
        if (map.getLayer(fillLayerId)) {
          map.setPaintProperty(fillLayerId, 'fill-opacity', boundary.is_visible ? boundary.opacity || 0.35 : 0);
          map.setPaintProperty(fillLayerId, 'fill-color', boundary.color || '#06b6d4');
        }
        if (map.getLayer(lineLayerId)) {
          map.setPaintProperty(lineLayerId, 'line-opacity', boundary.is_visible ? 0.9 : 0);
          map.setPaintProperty(lineLayerId, 'line-color', boundary.color || '#06b6d4');
        }
      }
    });

    return () => {
      activePopupsRef.current.forEach((p) => p.remove());
      activePopupsRef.current = [];
    };
  }, [boundaries, isMapLoaded, map]);
}
