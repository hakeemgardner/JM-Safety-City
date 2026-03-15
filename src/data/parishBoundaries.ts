/**
 * Jamaica parish boundaries as GeoJSON (approximate rectangles from bounds).
 * For map outline and highlight layers.
 */
import { JAMAICA_PARISHES } from "./jamaicaParishes";

type Position = [number, number];

function boundsToPolygon(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
): Position[] {
  return [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
    [minLng, minLat],
  ];
}

export interface ParishFeature {
  type: "Feature";
  geometry: { type: "Polygon"; coordinates: Position[][] };
  properties: { name: string };
}

export function getParishBoundariesGeoJSON(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = JAMAICA_PARISHES.map((p) => ({
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        boundsToPolygon(p.minLat, p.maxLat, p.minLng, p.maxLng),
      ],
    },
    properties: { name: p.name },
  }));
  return { type: "FeatureCollection", features };
}

/** Parish display names for dropdown (index.json uses "St Andrew", bounds use "St. Andrew") */
export const PARISH_DISPLAY_NAMES = JAMAICA_PARISHES.map((p) => p.name);
