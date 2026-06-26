'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  LEAFLET_DARK_TILE,
  LEAFLET_ATTRIBUTION,
} from '@/lib/constants';

interface LeafletMiniMapProps {
  center: [number, number]; // [lat, lng]
  zoom: number;
}

/**
 * Lightweight Leaflet 2D map rendered inside the viewer modal.
 *
 * Uses the vanilla Leaflet API (not react-leaflet) for tighter control
 * over lifecycle — especially the critical `map.remove()` on unmount.
 *
 * This file is loaded via `next/dynamic({ ssr: false })` from ViewerModal.
 */
export default function LeafletMiniMap({ center, zoom }: LeafletMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // ── Create Leaflet map ─────────────────────────────────────────
    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: true,
    });

    mapRef.current = map;

    // ── Dark tile layer ────────────────────────────────────────────
    L.tileLayer(LEAFLET_DARK_TILE, {
      attribution: LEAFLET_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    // ── Custom marker (no default icon path issues) ────────────────
    const markerIcon = L.divIcon({
      className: 'leaflet-custom-marker',
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background: #22d3ee;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(34,211,238,0.5);
        "></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    L.marker(center, { icon: markerIcon }).addTo(map);

    // Invalidate size after render (modal may animate in)
    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    // ── CRITICAL: Destroy Leaflet instance on unmount ───────────────
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center, zoom]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ minHeight: '200px' }}
    />
  );
}
