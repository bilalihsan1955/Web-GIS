import { spatialNodes, type PhotoNode } from './data';

export type SpatialNodeProperties = PhotoNode;

export const sampleGeoJSON: GeoJSON.FeatureCollection<
  GeoJSON.Point,
  SpatialNodeProperties
> = {
  type: 'FeatureCollection',
  features: spatialNodes.map((node) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: node.coordinates,
    },
    properties: node,
  })),
};
