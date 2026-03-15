/**
 * Generate random crime hotspot points inside each parish from index.json.
 * Output: GeoJSON FeatureCollection for the map (crime_type, date, description, parish).
 *
 * Run: node scripts/generateParishHotspots.js
 * Reads: index.json
 * Writes: public/parish-hotspots.json
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/** Crime types for hotspots; map category is for map pin (assault/theft/other). */
const CRIME_TYPES = [
  { label: "Murder", category: "assault", descriptions: ["Fatal shooting in area.", "Homicide reported.", "Death by violence."] },
  { label: "Shooting", category: "assault", descriptions: ["Shooting incident.", "Firearm discharge reported.", "Gun violence in area."] },
  { label: "Robbery", category: "theft", descriptions: ["Armed robbery.", "Robbery at location.", "Theft under threat."] },
  { label: "Break-in", category: "theft", descriptions: ["Break-in reported.", "Burglary at premises.", "Unauthorized entry."] },
  { label: "Assault", category: "assault", descriptions: ["Aggravated assault.", "Violent altercation.", "Assault reported."] },
  { label: "Larceny", category: "theft", descriptions: ["Larceny reported.", "Theft of property.", "Stolen goods."] },
];

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** ~0.012° ≈ 1.3km; radius so points stay on land. */
const OFFSET_DEG = 0.012;

/** Place a point at an even angle around the centroid (even spatial distribution). */
function pointAtAngle(centerLat, centerLng, angleRad, radiusDeg) {
  const dLat = radiusDeg * Math.cos(angleRad);
  const dLng = radiusDeg * Math.sin(angleRad);
  return [centerLat + dLat, centerLng + dLng];
}

function randomDateInYear(year) {
  const month = Math.floor(randomBetween(1, 12));
  const day = Math.floor(randomBetween(1, 28));
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Same number of hotspots per parish for even distribution. */
const HOTSPOTS_PER_PARISH = 10;

function main() {
  const indexPath = join(ROOT, "index.json");
  const data = JSON.parse(readFileSync(indexPath, "utf8"));
  const { years, parishes } = data;

  const features = [];

  for (const parish of parishes) {
    if (parish.lat == null || parish.lng == null) {
      console.warn("No lat/lng for parish:", parish.name);
      continue;
    }

    const parishLabel = parish.name;
    for (let i = 0; i < HOTSPOTS_PER_PARISH; i++) {
      const angle = (2 * Math.PI * i) / HOTSPOTS_PER_PARISH;
      const [lat, lng] = pointAtAngle(parish.lat, parish.lng, angle, OFFSET_DEG);
      const crime = pickRandom(CRIME_TYPES);
      const year = years[i % years.length];
      const reported_date = randomDateInYear(year);
      const description = `${crime.label}. Reported ${year}. ${pickRandom(crime.descriptions)}`;
      const address = `${parishLabel} Parish, Jamaica`;

      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: {
          category: crime.category,
          description,
          reported_date,
          reported_time: "",
          address,
          parish: parishLabel,
          crime_type: crime.label,
          year,
        },
      });
    }
  }

  const geojson = {
    type: "FeatureCollection",
    features,
  };

  const outPath = join(ROOT, "public", "parish-hotspots.json");
  writeFileSync(outPath, JSON.stringify(geojson, null, 0), "utf8");
  console.log(`Wrote ${features.length} hotspots to ${outPath}`);
}

main();
