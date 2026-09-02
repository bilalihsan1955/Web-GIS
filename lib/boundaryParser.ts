import shp from 'shpjs';
import { kml } from '@tmcw/togeojson';
import JSZip from 'jszip';
import area from '@turf/area';

export interface ParsedBoundaryLayer {
  name: string;
  geojson: any;
  featureCount: number;
  totalAreaHa: number;
  color?: string;
}

const DEFAULT_COLORS = [
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#3b82f6', // blue
  '#f97316', // orange
  '#84cc16', // lime
];

export async function parseBoundaryFile(file: File): Promise<ParsedBoundaryLayer[]> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase();

  const results: ParsedBoundaryLayer[] = [];

  if (ext === 'zip') {
    const arrayBuffer = await file.arrayBuffer();
    const parsed = await shp(arrayBuffer);

    // shpjs can return a single FeatureCollection or an array of FeatureCollections
    const layers = Array.isArray(parsed) ? parsed : [parsed];

    layers.forEach((layerData: any, idx: number) => {
      let layerName = layerData.fileName || fileName.replace(/\.zip$/i, '');
      if (layers.length > 1 && !layerData.fileName) {
        layerName = `${layerName} Layer ${idx + 1}`;
      }
      
      const featureCollection = normalizeToFeatureCollection(layerData);
      const totalAreaM2 = calculateTotalArea(featureCollection);
      const totalAreaHa = Math.round((totalAreaM2 / 10000) * 100) / 100;

      results.push({
        name: layerName,
        geojson: featureCollection,
        featureCount: featureCollection.features.length,
        totalAreaHa,
        color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
      });
    });
  } else if (ext === 'kml') {
    const text = await file.text();
    const dom = new DOMParser().parseFromString(text, 'text/xml');
    const geojson = kml(dom);
    const featureCollection = normalizeToFeatureCollection(geojson);
    const totalAreaM2 = calculateTotalArea(featureCollection);
    const totalAreaHa = Math.round((totalAreaM2 / 10000) * 100) / 100;

    results.push({
      name: fileName.replace(/\.kml$/i, ''),
      geojson: featureCollection,
      featureCount: featureCollection.features.length,
      totalAreaHa,
      color: DEFAULT_COLORS[0],
    });
  } else if (ext === 'kmz') {
    const zip = await JSZip.loadAsync(file);
    const kmlFile = Object.keys(zip.files).find(f => f.endsWith('.kml'));
    if (!kmlFile) {
      throw new Error('Berkas KMZ tidak memiliki berkas .kml di dalamnya.');
    }
    const kmlText = await zip.files[kmlFile].async('text');
    const dom = new DOMParser().parseFromString(kmlText, 'text/xml');
    const geojson = kml(dom);
    const featureCollection = normalizeToFeatureCollection(geojson);
    const totalAreaM2 = calculateTotalArea(featureCollection);
    const totalAreaHa = Math.round((totalAreaM2 / 10000) * 100) / 100;

    results.push({
      name: fileName.replace(/\.kmz$/i, ''),
      geojson: featureCollection,
      featureCount: featureCollection.features.length,
      totalAreaHa,
      color: DEFAULT_COLORS[0],
    });
  } else if (ext === 'geojson' || ext === 'json') {
    const text = await file.text();
    const json = JSON.parse(text);
    const featureCollection = normalizeToFeatureCollection(json);
    const totalAreaM2 = calculateTotalArea(featureCollection);
    const totalAreaHa = Math.round((totalAreaM2 / 10000) * 100) / 100;

    results.push({
      name: fileName.replace(/\.(geojson|json)$/i, ''),
      geojson: featureCollection,
      featureCount: featureCollection.features.length,
      totalAreaHa,
      color: DEFAULT_COLORS[0],
    });
  } else {
    throw new Error('Format berkas tidak didukung. Gunakan .zip (Shapefile), .kml, .kmz, atau .geojson');
  }

  return results;
}

function normalizeToFeatureCollection(data: any): any {
  if (!data) {
    return { type: 'FeatureCollection', features: [] };
  }
  if (data.type === 'FeatureCollection') {
    return data;
  }
  if (data.type === 'Feature') {
    return { type: 'FeatureCollection', features: [data] };
  }
  if (data.type === 'Polygon' || data.type === 'MultiPolygon' || data.type === 'LineString' || data.type === 'Point') {
    return {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: data, properties: {} }],
    };
  }
  return { type: 'FeatureCollection', features: [] };
}

function calculateTotalArea(featureCollection: any): number {
  try {
    let total = 0;
    if (featureCollection && Array.isArray(featureCollection.features)) {
      featureCollection.features.forEach((feat: any) => {
        if (feat && feat.geometry && (feat.geometry.type === 'Polygon' || feat.geometry.type === 'MultiPolygon')) {
          total += area(feat);
        }
      });
    }
    return total;
  } catch (e) {
    console.warn('Error calculating area:', e);
    return 0;
  }
}
