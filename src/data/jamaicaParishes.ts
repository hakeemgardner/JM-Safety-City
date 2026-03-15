/**
 * Jamaica parish approximate bounding boxes (WGS84) for assigning incident lat/lng to parish.
 * Order: minLat, maxLat, minLng, maxLng. Longitude is negative (west).
 */

export type ParishBounds = { name: string; minLat: number; maxLat: number; minLng: number; maxLng: number };

/** 14 parishes of Jamaica — approximate bounds for point-in-box assignment. */
export const JAMAICA_PARISHES: ParishBounds[] = [
  { name: "Kingston", minLat: 17.935, maxLat: 18.035, minLng: -76.85, maxLng: -76.76 },
  { name: "St. Andrew", minLat: 17.92, maxLat: 18.15, minLng: -76.88, maxLng: -76.65 },
  { name: "St. Catherine", minLat: 17.82, maxLat: 18.18, minLng: -77.22, maxLng: -76.82 },
  { name: "Clarendon", minLat: 17.68, maxLat: 18.22, minLng: -77.62, maxLng: -77.08 },
  { name: "Manchester", minLat: 17.72, maxLat: 18.22, minLng: -77.82, maxLng: -77.28 },
  { name: "St. Elizabeth", minLat: 17.78, maxLat: 18.22, minLng: -78.22, maxLng: -77.58 },
  { name: "Westmoreland", minLat: 18.0, maxLat: 18.38, minLng: -78.42, maxLng: -77.78 },
  { name: "Hanover", minLat: 18.18, maxLat: 18.52, minLng: -78.42, maxLng: -77.98 },
  { name: "St. James", minLat: 18.28, maxLat: 18.56, minLng: -78.02, maxLng: -77.68 },
  { name: "Trelawny", minLat: 18.18, maxLat: 18.56, minLng: -77.82, maxLng: -77.38 },
  { name: "St. Ann", minLat: 18.18, maxLat: 18.52, minLng: -77.52, maxLng: -76.98 },
  { name: "St. Mary", minLat: 17.98, maxLat: 18.42, minLng: -77.22, maxLng: -76.68 },
  { name: "Portland", minLat: 17.72, maxLat: 18.22, minLng: -76.82, maxLng: -76.28 },
  { name: "St. Thomas", minLat: 17.82, maxLat: 18.12, minLng: -76.62, maxLng: -76.18 },
];

/** Return parish name for a point, or "Other" if outside all parish bounds. */
export function getParishForCoord(lat: number, lng: number): string {
  for (const p of JAMAICA_PARISHES) {
    if (lat >= p.minLat && lat <= p.maxLat && lng >= p.minLng && lng <= p.maxLng) return p.name;
  }
  return "Other";
}
