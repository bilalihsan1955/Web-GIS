export interface PhotoNode {
  id: string;
  locationGroup: string;
  locationName: string;
  section?: string; // e.g. "Section 1"
  image_url: string; // Updated to match Supabase schema
  coordinates: [number, number];
  captureDate: string;
}

// Static mock data removed for Supabase integration.
// Live data is now fetched via useMapStore.ts -> fetchNodes()
export const spatialNodes: PhotoNode[] = [];
