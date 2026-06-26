import { create } from 'zustand';
import { spatialNodes, type PhotoNode } from '@/lib/data';

interface MapState {
  isViewerOpen: boolean;
  activeNode: PhotoNode | null;
  nodes: PhotoNode[];
  openViewer: (nodeId: string) => void;
  closeViewer: () => void;
  goToNextNode: () => void;
  goToPrevNode: () => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  isViewerOpen: false,
  activeNode: null,
  nodes: spatialNodes, // Loaded directly from our generated data

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
    
    console.log('[Navigation Debug - NEXT] Current Index:', currentIndex, 'Next Index:', nextIndex, 'Total Nodes:', nodes.length);
    
    set({ activeNode: nodes[nextIndex] });
  },

  goToPrevNode: () => {
    const { activeNode, nodes } = get();
    if (!activeNode || nodes.length <= 1) return;
    
    const currentIndex = nodes.findIndex((n) => n.id === activeNode.id);
    const prevIndex = (currentIndex - 1 + nodes.length) % nodes.length;
    
    console.log('[Navigation Debug - PREV] Current Index:', currentIndex, 'Prev Index:', prevIndex, 'Total Nodes:', nodes.length);
    
    set({ activeNode: nodes[prevIndex] });
  },
}));
