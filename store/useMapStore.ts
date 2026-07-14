import { create } from 'zustand';
import { type PhotoNode } from '@/lib/data';
import { createClient } from '@/utils/supabase/client';

export interface CompanyProfile {
  name: string;
  description: string;
  iconUrl: string;
}

interface MapState {
  isViewerOpen: boolean;
  activeNode: PhotoNode | null;
  nodes: PhotoNode[];
  geoJSON: GeoJSON.FeatureCollection<GeoJSON.Point, PhotoNode> | null;
  openViewer: (nodeId: string) => void;
  closeViewer: () => void;
  goToNextNode: () => void;
  goToPrevNode: () => void;
  fetchNodes: (adminId?: string) => Promise<void>;

  // Filtering state
  searchQuery: string;
  activeSection: string;
  setSearchQuery: (q: string) => void;
  setActiveSection: (s: string) => void;
  isLoading: boolean;

  // Company Profiles
  companyProfiles: Record<string, CompanyProfile>;
  updateCompanyProfile: (slug: string, profile: Partial<CompanyProfile>) => void;
}

export const ADMIN_SLUG_MAP: Record<string, string> = {
  'pt-mencari-cinta-sejati': '25535c41-d9f4-4063-bd71-41f2b8dd0a35',
  'admin-ub': '25535c41-d9f4-4063-bd71-41f2b8dd0a35',
  'universitas-brawijaya': '25535c41-d9f4-4063-bd71-41f2b8dd0a35',
  'admin-um': '68cdb7da-3590-4040-ae38-af9fb01a589c',
  'universitas-negeri-malang': '68cdb7da-3590-4040-ae38-af9fb01a589c',
};

const getInitialProfiles = (): Record<string, CompanyProfile> => {
  const defaults: Record<string, CompanyProfile> = {
    'pt-mencari-cinta-sejati': {
      name: 'PT Mencari Cinta Sejati',
      description: 'Menemukan titik koordinat cinta sejati Anda',
      iconUrl: '',
    },
    'admin-ub': {
      name: 'Universitas Brawijaya',
      description: 'GeoSpatial Map UB',
      iconUrl: '',
    },
    'universitas-brawijaya': {
      name: 'Universitas Brawijaya',
      description: 'GeoSpatial Map UB',
      iconUrl: '',
    },
    'admin-um': {
      name: 'Universitas Negeri Malang',
      description: 'GeoSpatial Map UM',
      iconUrl: '',
    },
    'universitas-negeri-malang': {
      name: 'Universitas Negeri Malang',
      description: 'GeoSpatial Map UM',
      iconUrl: '',
    },
  };

  if (typeof window !== 'undefined') {
    const profiles = { ...defaults };
    Object.keys(defaults).forEach((slug) => {
      const saved = localStorage.getItem(`company_profile_${slug}`);
      if (saved) {
        try {
          profiles[slug] = JSON.parse(saved);
        } catch (e) {
          console.error('[MapStore] Failed to parse company profile:', e);
        }
      }
    });
    return profiles;
  }

  return defaults;
};

export const useMapStore = create<MapState>((set, get) => ({
  isViewerOpen: false,
  activeNode: null,
  nodes: [],
  geoJSON: null,
  isLoading: true,

  searchQuery: '',
  activeSection: 'ALL',

  companyProfiles: getInitialProfiles(),

  updateCompanyProfile: (slug, profile) => {
    const current = get().companyProfiles[slug] || {
      name: slug,
      description: 'GeoSpatial Map',
      iconUrl: '',
    };
    const updated = { ...current, ...profile };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`company_profile_${slug}`, JSON.stringify(updated));
      } catch (err) {
        console.error('[MapStore] LocalStorage write failed:', err);
      }
    }
    set((state) => ({
      companyProfiles: {
        ...state.companyProfiles,
        [slug]: updated,
      },
    }));
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveSection: (s) => set({ activeSection: s }),

  fetchNodes: async (adminId) => {
    set({ isLoading: true });
    const supabase = createClient();

    let fetchedData: any[] = [];
    let fetchError: any = null;

    const resolvedAdminId = adminId ? (ADMIN_SLUG_MAP[adminId] || adminId) : undefined;

    if (resolvedAdminId) {
      // Fetch via RPC for specific admin group
      const { data, error } = await supabase.rpc('get_nodes_for_admin_group', {
        admin_uuid: resolvedAdminId,
      });
      fetchedData = data || [];
      fetchError = error;
    } else {
      // Query all published spatial_nodes (public default or authenticated view)
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
        `)
        .order('created_at', { ascending: false });
      fetchedData = data || [];
      fetchError = error;
    }

    if (fetchError) {
      console.error('[MapStore] Failed to fetch spatial nodes:', fetchError);
      set({ isLoading: false });
      return;
    }

    const mappedNodes: PhotoNode[] = fetchedData.map((item: any) => {
      // Handle difference between direct table select and RPC return formats
      const locationName = adminId ? item.location_name : (item.locations?.name || 'Unknown Location');
      const locationDesc = adminId ? item.location_description : (item.locations?.description || '');

      return {
        id: item.id.toString(),
        locationGroup: locationName,
        locationName: locationName,
        section: locationDesc,
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

    console.log(`[MapStore] Fetched and mapped ${mappedNodes.length} nodes (adminId: ${adminId || 'none'}).`);
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
