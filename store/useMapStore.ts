import { create } from 'zustand';
import { type PhotoNode } from '@/lib/data';
import { createClient } from '@/utils/supabase/client';

interface MapState {
  isViewerOpen: boolean;
  activeNode: PhotoNode | null;
  nodes: PhotoNode[];
  geoJSON: GeoJSON.FeatureCollection<GeoJSON.Point, PhotoNode> | null;
  openViewer: (nodeId: string) => void;
  closeViewer: () => void;
  goToNextNode: () => void;
  goToNextNode: () => void;
  goToPrevNode: () => void;
  fetchNodes: () => Promise<void>;
  
  // Filtering state
  searchQuery: string;
  activeSection: string;
  setSearchQuery: (q: string) => void;
  setActiveSection: (s: string) => void;
  isLoading: boolean;
}

export const useMapStore = create<MapState>((set, get) => ({
  isViewerOpen: false,
  activeNode: null,
  nodes: [],
  geoJSON: null,
  isLoading: true,
  
  searchQuery: '',
  activeSection: 'ALL',

  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveSection: (s) => set({ activeSection: s }),

  fetchNodes: async () => {
    set({ isLoading: true });
    const supabase = createClient();
    
    // Query spatial_nodes and join with locations table for the name
    const { data, error } = await supabase
      .from('spatial_nodes')
      .select(`
        id,
        image_url,
        longitude,
        latitude,
        capture_date,
        locations (
          name,
          description
        )
      `);

    if (error) {
      console.error('[MapStore] Failed to fetch spatial nodes from Supabase:', error);
      set({ isLoading: false });
      return;
    }

    const mappedNodes: PhotoNode[] = data.map((item: any) => {
      return {
        id: item.id.toString(),
        locationGroup: item.locations?.name || 'Unknown Location',
        locationName: item.locations?.name || 'Unknown Location',
        section: item.locations?.description || '',
        image_url: item.image_url,
        coordinates: [item.longitude, item.latitude],
        captureDate: item.capture_date || '',
      };
    });

    const geoJSON: GeoJSON.FeatureCollection<GeoJSON.Point, PhotoNode> = {
      type: 'FeatureCollection',
      features: mappedNodes.map((node) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: node.coordinates,
        },
        properties: node,
      })),
    };

    console.log(`[MapStore] Fetched and mapped ${mappedNodes.length} nodes from Supabase.`);
    set({ nodes: mappedNodes, geoJSON, isLoading: false });
  },

  openViewer: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId) || null;
    set({ isViewerOpen: true, activeNode: node });
  },

  closeViewer: () =>
    set({ isViewerOpen: false, activeNode: null }),

  goToNextNode: () => {
    const { activeNode, nodes } = get();
    if (!activeNode || nodes.length <= 1) return;
    
    const currentIndex = nodes.findIndex((n) => n.id === activeNode.id);
    const nextIndex = (currentIndex + 1) % nodes.length;
    
    set({ activeNode: nodes[nextIndex] });
  },

  goToPrevNode: () => {
    const { activeNode, nodes } = get();
    if (!activeNode || nodes.length <= 1) return;
    
    const currentIndex = nodes.findIndex((n) => n.id === activeNode.id);
    const prevIndex = (currentIndex - 1 + nodes.length) % nodes.length;
    
    set({ activeNode: nodes[prevIndex] });
  },
}));
