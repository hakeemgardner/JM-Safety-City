/**
 * Generates random crime hotspot points within each parish using index data.
 * Each hotspot has: crime type (e.g. murder), date (year), description.
 * Points are scattered around the parish center so they appear inside the parish.
 */
import { PARISH_CRIME_INDEX } from "./parishCrimeIndex";

/** ~0.012° ≈ 1.3km; keeps points on land near parish center, avoids ocean. */
const OFFSET_DEG = 0.012;

/** Hotspot crime types and their map category + description templates. */
const HOTSPOT_CRIME_TYPES: Array<{
  label: string;
  category: "assault" | "theft" | "other";
  descriptions: string[];
}> = [
  {
    label: "Murder",
    category: "assault",
    descriptions: [
      "Fatal shooting reported in the area.",
      "Homicide investigation; suspect in custody.",
      "Fatal stabbing incident.",
      "Gun violence-related death.",
    ],
  },
  {
    label: "Robbery",
    category: "theft",
    descriptions: [
      "Armed robbery at business premises.",
      "Street robbery; victim injured.",
      "Home invasion and robbery.",
      "Robbery at ATM; suspect fled.",
    ],
  },
  {
    label: "Shooting",
    category: "assault",
    descriptions: [
      "Shooting incident; injuries reported.",
      "Exchange of gunfire; no fatalities.",
      "Drive-by shooting reported.",
    ],
  },
  {
    label: "Assault",
    category: "assault",
    descriptions: [
      "Serious assault; victim hospitalized.",
      "Aggravated assault with weapon.",
      "Domestic violence incident.",
    ],
  },
  {
    label: "Break-in",
    category: "theft",
    descriptions: [
      "Residential break-in; items stolen.",
      "Commercial burglary reported.",
      "Break-in at unoccupied property.",
    ],
  },
  {
    label: "Theft",
    category: "theft",
    descriptions: [
      "Vehicle theft from parking area.",
      "Theft of valuables from premises.",
      "Pickpocketing and bag snatching.",
    ],
  },
];

/** Seeded RNG for deterministic but varied crime types per index. */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/** Place a point at an even angle around the centroid (even spatial distribution). */
function pointAtAngle(centerLat: number, centerLng: number, angleRad: number, radiusDeg: number): [number, number] {
  const dLat = radiusDeg * Math.cos(angleRad);
  const dLng = radiusDeg * Math.sin(angleRad);
  return [centerLat + dLat, centerLng + dLng];
}

/** Number of hotspots per parish (even across all parishes). */
const HOTSPOTS_PER_PARISH = 10;
/** Years to use; one hotspot "slot" per year for even year distribution. */
const YEARS_SAMPLE = [2011, 2013, 2015, 2017, 2019, 2021, 2023];

export function buildParishHotspots(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const { parishes } = PARISH_CRIME_INDEX;

  parishes.forEach((parish, pIdx) => {
    const rng = seededRandom(pIdx + 1);
    for (let i = 0; i < HOTSPOTS_PER_PARISH; i++) {
      const angle = (2 * Math.PI * i) / HOTSPOTS_PER_PARISH;
      const [lat, lng] = pointAtAngle(parish.lat, parish.lng, angle, OFFSET_DEG);
      const year = YEARS_SAMPLE[i % YEARS_SAMPLE.length];
      const typeIdx = Math.floor(rng() * HOTSPOT_CRIME_TYPES.length);
      const crime = HOTSPOT_CRIME_TYPES[typeIdx];
      const descIdx = Math.floor(rng() * crime.descriptions.length);
      const description = crime.descriptions[descIdx];

      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: {
          category: crime.category,
          description: `${crime.label} — ${year}. ${description} (${parish.name})`,
          reported_date: `${year}-01-01`,
          reported_time: "",
          address: `${parish.name} Parish`,
          parish: parish.name,
          crime_type_label: crime.label,
          year: String(year),
          source: "parish_hotspot",
        } as Record<string, string>,
      });
    }
  });

  return { type: "FeatureCollection", features };
}

/** Cached GeoJSON for parish hotspots (stable across renders). */
let cached: GeoJSON.FeatureCollection | null = null;

export function getParishHotspots(): GeoJSON.FeatureCollection {
  if (!cached) cached = buildParishHotspots();
  return cached;
}

/** Clear cache so next getParishHotspots() rebuilds (e.g. after changing constants). */
export function clearParishHotspotsCache(): void {
  cached = null;
}
