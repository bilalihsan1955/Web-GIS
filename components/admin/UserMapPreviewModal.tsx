'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { X, Loader2, MapPin } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { MAPBOX_STYLE, INITIAL_CENTER } from '@/lib/constants';
import Modal from '@/components/ui/Modal';

interface UserMapPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
}

export default function UserMapPreviewModal({
  isOpen,
  onClose,
  userId,
  userEmail
}: UserMapPreviewModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [nodesCount, setNodesCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !userId) return;
    
    let isMounted = true;
    const supabase = createClient();
    
    async function fetchUserNodesAndInitMap() {
      setLoading(true);
      setError('');
      try {
        const { data, error: fetchError } = await supabase
          .from('spatial_nodes')
          .select(`
            id,
            longitude,
            latitude,
            locations ( name, description )
          `)
          .eq('created_by', userId);

        if (fetchError) throw fetchError;
        
        if (!isMounted) return;
        
        const nodes = data || [];
        setNodesCount(nodes.length);
        
        if (!mapContainerRef.current) return;
        
        // Initialize Mapbox
        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
        
        // Use a generic center if no nodes, else use the first node's coordinates
        const centerCoords = nodes.length > 0 
          ? [nodes[0].longitude, nodes[0].latitude] as [number, number]
          : INITIAL_CENTER;
          
        const zoomLevel = nodes.length > 0 ? 12 : 4;

        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: MAPBOX_STYLE,
          center: centerCoords,
          zoom: zoomLevel,
          projection: 'globe',
        });
        
        map.on('style.load', () => {
          map.setFog({
            color: 'rgb(10, 10, 20)',
            'high-color': 'rgb(20, 20, 40)',
            'horizon-blend': 0.08,
            'space-color': 'rgb(5, 5, 15)',
            'star-intensity': 0.6,
          });
        });

        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

        // Add markers
        if (nodes.length > 0) {
          const bounds = new mapboxgl.LngLatBounds();
          
          nodes.forEach(node => {
            if (node.longitude && node.latitude) {
              const el = document.createElement('div');
              el.className = 'w-4 h-4 bg-cyan-400 border-2 border-white rounded-full ';
              
              const loc: any = Array.isArray(node.locations) ? node.locations[0] : node.locations;
              
              const popup = new mapboxgl.Popup({ offset: 15, closeButton: false })
                .setHTML(`
                  <div class="px-2 py-1">
                    <div class="text-xs font-bold text-zinc-800">${loc?.name || 'Unnamed'}</div>
                    <div class="text-[10px] text-zinc-500">${loc?.description || ''}</div>
                  </div>
                `);

              const marker = new mapboxgl.Marker({ element: el })
                .setLngLat([node.longitude, node.latitude])
                .setPopup(popup)
                .addTo(map);
                
              markersRef.current.push(marker);
              bounds.extend([node.longitude, node.latitude]);
            }
          });
          
          if (nodes.length > 1) {
            map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 1000 });
          }
        }
        
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to fetch map data');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    fetchUserNodesAndInitMap();
    
    return () => {
      isMounted = false;
      // Cleanup map
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex flex-col text-left pr-4">
          <span className="flex items-center text-zinc-900 dark:text-white">
            <MapPin className="w-5 h-5 mr-2 text-cyan-600 dark:text-cyan-400" />
            Map Preview: {userEmail}
          </span>
          {!loading && (
            <span className="text-xs text-zinc-500 font-normal mt-0.5">Total Nodes: <strong className="text-zinc-700 dark:text-zinc-300">{nodesCount}</strong></span>
          )}
        </div>
      }
      maxWidth="max-w-5xl"
      noPadding={true}
    >
      <div className="w-full h-[65vh] relative bg-zinc-100 dark:bg-zinc-800">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-4" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Loading map data...</p>
          </div>
        )}
        
        {error && !loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-zinc-900">
            <div className="text-center p-6 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20 max-w-sm">
              <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
            </div>
          </div>
        )}
        
        {!loading && !error && nodesCount === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="text-center p-6 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md rounded-[24px] border border-zinc-200 dark:border-white/10 shadow-lg">
              <MapPin className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <h4 className="text-zinc-800 dark:text-white font-semibold">No Spatial Nodes</h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">This user hasn&apos;t uploaded any panoramas yet.</p>
            </div>
          </div>
        )}

        {/* Map Container */}
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      </div>
    </Modal>
  );
}
