import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router";
import mapboxgl from "mapbox-gl";
import { HAZARD_DATA } from "../data/kingstonHazards";
import { hasEvidenceFromRow } from "../lib/confidenceScore";
import { supabase } from "../lib/supabase";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;
const MAPBOX_DIRECTIONS_BASE = "https://api.mapbox.com/directions/v5/mapbox";

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Offset a lat/lng by meters (N and E). Used to build exclude points around a hazard radius. */
function offsetMeters(
  lat: number,
  lng: number,
  dNorthM: number,
  dEastM: number,
): [number, number] {
  const R = 6371000;
  const lat2 = lat + (dNorthM / R) * (180 / Math.PI);
  const lng2 =
    lng + (dEastM / (R * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);
  return [lng2, lat2];
}

/** Create a GeoJSON Polygon approximating a circle (for 3D fill-extrusion). */
function circlePolygon(
  lng: number,
  lat: number,
  radiusMeters: number,
  segments = 24,
): GeoJSON.Polygon {
  const positions: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    const dNorth = radiusMeters * Math.cos(angle);
    const dEast = radiusMeters * Math.sin(angle);
    const [plng, plat] = offsetMeters(lat, lng, dNorth, dEast);
    positions.push([plng, plat]);
  }
  return { type: "Polygon", coordinates: [positions] };
}

const KINGSTON_CENTER: [number, number] = [-76.7936, 18.0179];

const KINGSTON_BOUNDS: [[number, number], [number, number]] = [
  [-76.92, 17.92],
  [-76.68, 18.12],
];

function formatTimeAgo(reportedDate: string, reportedTime: string): string {
  if (!reportedDate) return "—";
  const reported = new Date(`${reportedDate}T${reportedTime || "00:00"}`);
  const now = new Date();
  const diffMs = now.getTime() - reported.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 0) return "Just now";
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return reported.toLocaleDateString();
}

const CRIME_COLORS: Record<string, string> = {
  theft: "#ef4444",
  suspicious: "#f97316",
  vandalism: "#eab308",
  assault: "#dc2626",
  traffic: "#3b82f6",
  other: "#64748b",
};

const CRIME_ICONS: Record<string, string> = {
  theft: "local_police",
  suspicious: "visibility",
  vandalism: "broken_image",
  assault: "emergency",
  traffic: "directions_car",
  other: "help",
};

/** Single letter shown inside map pin icon per category (reliable on all browsers). */
const CRIME_ICON_LETTER: Record<string, string> = {
  theft: "T",
  assault: "A",
  suspicious: "S",
  vandalism: "V",
  traffic: "C",
  other: "?",
};

const CRIME_CATEGORIES = [
  "theft",
  "assault",
  "suspicious",
  "vandalism",
  "traffic",
  "other",
] as const;

/** Draw a category icon (letter only, transparent bg) to sit inside the map circle. */
function drawCrimeIconImage(
  category: string,
  size = 32,
  pixelRatio = 2,
): HTMLCanvasElement {
  const dpr = pixelRatio;
  const w = size * dpr;
  const h = size * dpr;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const cx = w / 2;
  const cy = h / 2;
  const letter = CRIME_ICON_LETTER[category] ?? "?";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${22 * dpr}px system-ui, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(letter, cx, cy);
  return canvas;
}

/** Register crime category icon images on the map (call after style is loaded). Returns a promise so layers can be added after images are ready. */
function addCrimeIconImages(m: mapboxgl.Map): Promise<void> {
  const promises = CRIME_CATEGORIES.map((cat) => {
    const id = `crime-icon-${cat}`;
    if (m.hasImage(id)) return Promise.resolve();
    const canvas = drawCrimeIconImage(cat);
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          m.addImage(id, img, { pixelRatio: 2 });
        } catch (e) {
          reject(e);
        }
        resolve();
      };
      img.onerror = () => reject(new Error(`Failed to load icon for ${cat}`));
      img.src = canvas.toDataURL("image/png");
    });
  });
  return Promise.all(promises).then(() => {});
}

/** Map label-like or alternate category strings to canonical CrimeType for icon/color lookup. */
const CATEGORY_ALIASES: Record<string, string> = {
  "theft / robbery": "theft",
  "physical assault": "assault",
  "suspicious activity": "suspicious",
  "traffic incident": "traffic",
};

/** Normalize category (trim, lowercase, aliases) to canonical key for color/toggle lookup. */
function getCanonicalCategory(category: string | undefined | null): string {
  const raw = (category ?? "").toString().trim();
  if (!raw) return "other";
  const lower = raw.toLowerCase();
  const key = CATEGORY_ALIASES[lower] ?? lower;
  return key in CRIME_ICONS ? key : "other";
}

/** Return a valid icon name for any category. Never returns empty. */
function getCrimeIcon(category: string | undefined | null): string {
  const key = getCanonicalCategory(category);
  return CRIME_ICONS[key] ?? CRIME_ICONS.other ?? "help";
}

/** Radius in meters per crime type (used for 2D/3D circles and route avoidance). */
const CRIME_RADIUS_METERS: Record<string, number> = {
  assault: 90,
  theft: 80,
  suspicious: 65,
  vandalism: 55,
  traffic: 45,
  other: 40,
};

type CrimeType =
  | "theft"
  | "suspicious"
  | "vandalism"
  | "assault"
  | "traffic"
  | "other";

type MapStyleKey = "dark" | "streets" | "satellite";

const MAP_STYLES: Record<
  MapStyleKey,
  { label: string; icon: string; url: string }
> = {
  dark: {
    label: "Dark",
    icon: "dark_mode",
    url: "mapbox://styles/mapbox/dark-v11",
  },
  streets: {
    label: "Streets",
    icon: "map",
    url: "mapbox://styles/mapbox/streets-v12",
  },
  satellite: {
    label: "Satellite",
    icon: "satellite_alt",
    url: "mapbox://styles/mapbox/satellite-streets-v12",
  },
};

export default function CrimeMapPage() {
  // --- Crime Prediction States ---
  const [predictMode, setPredictMode] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<{
    probability: number;
    message: string;
    lngLat: [number, number];
  } | null>(null);

  // Refs for Mapbox event listeners
  const predictModeRef = useRef(predictMode);
  predictModeRef.current = predictMode;
  const fetchRiskPrediction = async (lng: number, lat: number) => {
    setPredicting(true);
    setPredictionResult(null);

    try {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
      const is_weekend = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0;
      const month = now.getMonth() + 1; // 1-12

      // Calculate historical nearby crimes (within a 500m radius)
      let c7 = 0,
        c30 = 0,
        c90 = 0;
      const nowMs = Date.now();
      const searchRadiusMeters = 500;

      crimeDataRef.current?.features.forEach((f) => {
        const [cLng, cLat] = (f.geometry as GeoJSON.Point).coordinates;
        const dist = haversineMeters(lat, lng, cLat, cLng);

        if (dist <= searchRadiusMeters) {
          const props = f.properties as Record<string, string>;
          if (props.reported_date) {
            const reportTime = new Date(
              `${props.reported_date}T${props.reported_time || "00:00"}`,
            ).getTime();
            const diffDays = (nowMs - reportTime) / (1000 * 60 * 60 * 24);

            if (diffDays <= 7) c7++;
            if (diffDays <= 30) c30++;
            if (diffDays <= 90) c90++;
          }
        }
      });

      const payload = {
        DayOfWeek: dayOfWeek,
        Month: month,
        is_weekend: is_weekend,
        lat_bin: parseFloat(lat.toFixed(3)), // Simulating your bins
        lon_bin: parseFloat(lng.toFixed(3)),
        crimes_last_7_days: c7,
        crimes_last_30_days: c30,
        crimes_last_90_days: c90,
      };

      // Connect to your local FastAPI endpoint
      const res = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("API request failed");

      const data = await res.json();
      setPredictionResult({
        probability: data.probability_of_crime,
        message: data.message,
        lngLat: [lng, lat],
      });
    } catch (error) {
      console.error("Prediction Error:", error);
      alert("Failed to fetch prediction from API.");
    } finally {
      setPredicting(false);
      setPredictMode(false); // Turn off mode after click
    }
  };
  useEffect(() => {
    document.title = "Live Crime Map — G.R.I.D | Kingston, Jamaica";
  }, []);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const geolocate = useRef<mapboxgl.GeolocateControl | null>(null);
  const personMarker = useRef<mapboxgl.Marker | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [routePanelOpen, setRoutePanelOpen] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("dark");
  const [crimeToggles, setCrimeToggles] = useState<Record<CrimeType, boolean>>({
    theft: true,
    suspicious: true,
    vandalism: true,
    assault: true,
    traffic: true,
    other: true,
  });
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [show3D, setShow3D] = useState(false);
  const [showBuildings, setShowBuildings] = useState(false);
  const [crimeData, setCrimeData] = useState<GeoJSON.FeatureCollection | null>(
    null,
  );
  const [crimeDataLoading, setCrimeDataLoading] = useState(true);
  const [crimeDataError, setCrimeDataError] = useState<string | null>(null);
  const dbDataCacheRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const crimeDataRef = useRef<GeoJSON.FeatureCollection | null>(null);
  crimeDataRef.current = crimeData;
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "pending" | "granted" | "denied"
  >("pending");
  const [selectedCrime, setSelectedCrime] = useState<Record<
    string,
    string
  > | null>(null);

  const [routeOrigin, setRouteOrigin] = useState<[number, number] | null>(null);
  const [routeDestination, setRouteDestination] = useState<
    [number, number] | null
  >(null);
  const [routeMode, setRouteMode] = useState<"fastest" | "safe">("fastest");
  const [routeFastestGeometry, setRouteFastestGeometry] =
    useState<GeoJSON.LineString | null>(null);
  const [routeSafeGeometry, setRouteSafeGeometry] =
    useState<GeoJSON.LineString | null>(null);
  const [routeSamePath, setRouteSamePath] = useState(false);
  const [routeFastestDuration, setRouteFastestDuration] = useState<
    number | null
  >(null);
  const [routeFastestDistance, setRouteFastestDistance] = useState<
    number | null
  >(null);
  const [routeSafeDuration, setRouteSafeDuration] = useState<number | null>(
    null,
  );
  const [routeSafeDistance, setRouteSafeDistance] = useState<number | null>(
    null,
  );
  const [routeHazardCount, setRouteHazardCount] = useState<{
    high: number;
    medium: number;
    low: number;
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeClickMode, setRouteClickMode] = useState<
    "start" | "destination" | null
  >(null);
  const [routeLayerReady, setRouteLayerReady] = useState(0);
  const routeMarkersRef = useRef<{
    start: mapboxgl.Marker | null;
    end: mapboxgl.Marker | null;
  }>({ start: null, end: null });
  const routeClickModeRef = useRef<"start" | "destination" | null>(null);
  const routePopupRef = useRef<mapboxgl.Popup | null>(null);
  const routeStatsRef = useRef<{
    fastestDuration: number | null;
    fastestDistance: number | null;
    safeDuration: number | null;
    safeDistance: number | null;
    samePath: boolean;
  }>({
    fastestDuration: null,
    fastestDistance: null,
    safeDuration: null,
    safeDistance: null,
    samePath: false,
  });
  routeClickModeRef.current = routeClickMode;

  /* Load incidents from database (cached after first fetch). */
  useEffect(() => {
    if (dbDataCacheRef.current) {
      setCrimeData(dbDataCacheRef.current);
      setCrimeDataLoading(false);
      setCrimeDataError(null);
      return;
    }
    if (!supabase) {
      setCrimeData({ type: "FeatureCollection", features: [] });
      setCrimeDataLoading(false);
      setCrimeDataError("Database not configured.");
      return;
    }
    setCrimeData({ type: "FeatureCollection", features: [] });
    setCrimeDataLoading(true);
    setCrimeDataError(null);
    let cancelled = false;
    supabase
      .from("incident_reports")
      .select("*")
      .then(({ data, error }) => {
        if (cancelled) return;
        console.log("[CrimeMap] incident_reports from DB:", {
          data,
          error,
          rowCount: data?.length ?? 0,
        });
        console.log(
          "[CrimeMap] incident categories:",
          (data ?? []).map((row: Record<string, unknown>) => row.category),
        );
        if (error) {
          setCrimeDataError(error.message);
          setCrimeData({ type: "FeatureCollection", features: [] });
          setCrimeDataLoading(false);
          return;
        }
        const features: GeoJSON.Feature[] = (data ?? []).map(
          (row: Record<string, unknown>) => {
            const lat = Number(row.latitude);
            const lng = Number(row.longitude);
            const category = getCanonicalCategory(
              (row.category as string) ?? "",
            );
            const id = row.id as string | number | undefined;
            const hasEvidence = hasEvidenceFromRow(row);
            return {
              type: "Feature" as const,
              ...(id !== undefined && id !== null && { id }),
              geometry: { type: "Point" as const, coordinates: [lng, lat] },
              properties: {
                category,
                description: row.description,
                reported_date: row.reported_date,
                reported_time: row.reported_time,
                address: row.address,
                confirmation_count: row.confirmation_count,
                police_verified: row.police_verified,
                has_evidence: hasEvidence,
              } as Record<string, unknown>,
            };
          },
        );
        const fc: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features,
        };
        dbDataCacheRef.current = fc;
        setCrimeData(fc);
        setCrimeDataError(null);
        setCrimeDataLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: KINGSTON_CENTER,
      zoom: 13,
      minZoom: 10,
      maxZoom: 18,
      pitch: 40,
      antialias: true,
    });

    const m = map.current;

    m.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    m.addControl(new mapboxgl.ScaleControl(), "bottom-left");

    geolocate.current = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    });
    m.addControl(geolocate.current, "bottom-right");

    const personEl = document.createElement("div");
    personEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.5))">
        <div style="width:36px;height:36px;border-radius:50%;background:#0d7ff2;display:flex;align-items:center;justify-content:center;border:3px solid white">
          <span class="material-symbols-outlined" style="font-size:20px;color:white;font-variation-settings:'FILL' 1">person</span>
        </div>
        <div style="width:2px;height:8px;background:white;margin-top:-2px"></div>
        <div style="width:8px;height:8px;border-radius:50%;background:rgba(13,127,242,0.4);margin-top:-2px"></div>
      </div>
    `;
    personMarker.current = new mapboxgl.Marker({
      element: personEl,
      anchor: "bottom",
    });

    const PERSON_MIN_ZOOM = 15;

    function updatePersonVisibility() {
      if (!personMarker.current) return;
      const zoom = m.getZoom();
      personEl.style.display = zoom >= PERSON_MIN_ZOOM ? "block" : "none";
    }

    m.on("zoom", updatePersonVisibility);
    updatePersonVisibility();

    geolocate.current.on("geolocate", (e: GeolocationPosition) => {
      const { latitude, longitude } = e.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      setLocationStatus("granted");

      if (personMarker.current) {
        personMarker.current.setLngLat([longitude, latitude]).addTo(m);
        updatePersonVisibility();
      }
    });

    geolocate.current.on("error", () => {
      setLocationStatus("denied");
    });

    m.on("load", () => {
      geolocate.current?.trigger();
    });

    m.on("dragend", () => {
      const center = m.getCenter();
      const [swLng, swLat] = KINGSTON_BOUNDS[0];
      const [neLng, neLat] = KINGSTON_BOUNDS[1];
      if (
        center.lng < swLng ||
        center.lng > neLng ||
        center.lat < swLat ||
        center.lat > neLat
      ) {
        m.flyTo({ center: KINGSTON_CENTER, zoom: 13, duration: 800 });
      }
    });

    m.on("load", () => {
      addHazardLayers(m);
      addCrimeLayers(m);
      addRouteLayer(m);
      elevateMarkerContainer(m);

      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "safecity-popup",
        offset: 12,
      });

      const getPopupLngLat = (feature: GeoJSON.Feature): [number, number] => {
        const g = feature.geometry;
        if (g.type === "Point")
          return g.coordinates.slice(0, 2) as [number, number];
        if (g.type === "Polygon" && g.coordinates[0]?.length) {
          const ring = g.coordinates[0];
          let sumLng = 0,
            sumLat = 0,
            n = 0;
          for (let i = 0; i < ring.length - 1; i++) {
            sumLng += ring[i][0];
            sumLat += ring[i][1];
            n++;
          }
          return [sumLng / n, sumLat / n];
        }
        return [0, 0];
      };

      const showPopupForFeature = (e: mapboxgl.MapLayerMouseEvent) => {
        const features = e.features ?? [];
        if (features.length === 0) return;
        const cursorLat = e.lngLat.lat;
        const cursorLng = e.lngLat.lng;
        const feature =
          features.reduce(
            (best, f) => {
              if (!f.properties) return best;
              const [lng, lat] = getPopupLngLat(f);
              const d = haversineMeters(lat, lng, cursorLat, cursorLng);
              if (!best) return { f, d };
              return d < best.d ? { f, d } : best;
            },
            null as { f: (typeof features)[0]; d: number } | null,
          )?.f ?? features[0];
        if (!feature?.properties) return;
        const props = feature.properties as Record<string, string>;
        const { category, description, reported_date, reported_time, address } =
          props;
        const cat = getCanonicalCategory(category);
        const color = CRIME_COLORS[cat] ?? "#0d7ff2";
        const timeStr = formatTimeAgo(reported_date ?? "", reported_time ?? "");
        const categoryLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
        const safe = (s: string) =>
          s
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
        const lines: string[] = [];
        if (description)
          lines.push(
            `<div style="font-size:12px;color:#e2e8f0;margin-top:6px">${safe(description)}</div>`,
          );
        lines.push(
          `<div style="font-size:11px;color:#94a3b8;margin-top:4px">${safe(timeStr)}</div>`,
        );
        if (address)
          lines.push(
            `<div style="font-size:11px;color:#94a3b8;margin-top:2px">${safe(address)}</div>`,
          );
        m.getCanvas().style.cursor = "pointer";
        popup
          .setLngLat(getPopupLngLat(feature))
          .setHTML(
            `<div style="font-family:Inter,sans-serif;min-width:200px;max-width:280px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></span>
                <strong style="font-size:13px;color:#f8fafc">${safe(categoryLabel)}</strong>
              </div>
              ${lines.join("")}
            </div>`,
          )
          .addTo(m);
      };

      const hideCrimePopup = () => {
        m.getCanvas().style.cursor = "";
        popup.remove();
      };

      m.on("mouseenter", "crimes-area", showPopupForFeature);
      m.on("mouseenter", "crimes-pins-bg", showPopupForFeature);
      m.on("mouseenter", "crimes-3d-extrusion", showPopupForFeature);

      m.on("mouseleave", "crimes-area", hideCrimePopup);
      m.on("mouseleave", "crimes-pins-bg", hideCrimePopup);
      m.on("mouseleave", "crimes-3d-extrusion", hideCrimePopup);

      m.on("click", "crimes-area", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        setSelectedCrime(feature.properties as Record<string, string>);
      });
      m.on("click", "crimes-pins-bg", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        setSelectedCrime(feature.properties as Record<string, string>);
      });
      m.on("click", "crimes-3d-extrusion", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        setSelectedCrime(feature.properties as Record<string, string>);
      });

      m.on("click", (e) => {
        // --- ADD THIS PREDICTION INTERCEPT ---
        if (predictModeRef.current) {
          fetchRiskPrediction(e.lngLat.lng, e.lngLat.lat);
          return; // Stop routing logic from firing
        }
        // -------------------------------------

        const mode = routeClickModeRef.current;
        if (!mode) return;
        const { lng, lat } = e.lngLat;
        if (mode === "start") {
          setRouteOrigin([lng, lat]);
          setRouteClickMode(null);
        } else {
          setRouteDestination([lng, lat]);
          setRouteClickMode(null);
        }
      });

      const routeHoverPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "safecity-popup",
        offset: 12,
      });
      routePopupRef.current = routeHoverPopup;

      m.on("mouseenter", "route-line-fastest", (e) => {
        const s = routeStatsRef.current;
        if (s.fastestDuration == null) return;
        m.getCanvas().style.cursor = "pointer";
        const min = Math.round(s.fastestDuration / 60);
        const km =
          s.fastestDistance != null
            ? (s.fastestDistance / 1000).toFixed(1)
            : "—";
        routeHoverPopup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:Inter,sans-serif;min-width:160px;padding:4px 0">
              <div style="font-size:12px;font-weight:700;color:#3b82f6;margin-bottom:4px">Fastest</div>
              <div style="font-size:11px;color:#94a3b8">${min} min · ${km} km</div>
              <div style="font-size:10px;color:#64748b;margin-top:2px">Shortest time route</div>
            </div>`,
          )
          .addTo(m);
      });
      m.on("mouseleave", "route-line-fastest", () => {
        m.getCanvas().style.cursor = "";
        routeHoverPopup.remove();
      });

      m.on("mouseenter", "route-line-safe", (e) => {
        const s = routeStatsRef.current;
        if (s.safeDuration == null) return;
        m.getCanvas().style.cursor = "pointer";
        const min = Math.round(s.safeDuration / 60);
        const km =
          s.safeDistance != null ? (s.safeDistance / 1000).toFixed(1) : "—";
        routeHoverPopup
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:Inter,sans-serif;min-width:160px;padding:4px 0">
              <div style="font-size:12px;font-weight:700;color:#22c55e;margin-bottom:4px">Safest</div>
              <div style="font-size:11px;color:#94a3b8">${min} min · ${km} km</div>
              <div style="font-size:10px;color:#64748b;margin-top:2px">Avoids hazard zones</div>
            </div>`,
          )
          .addTo(m);
      });
      m.on("mouseleave", "route-line-safe", () => {
        m.getCanvas().style.cursor = "";
        routeHoverPopup.remove();
      });

      setRouteLayerReady((v) => v + 1);
    });

    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      if (!m.isStyleLoaded()) return;
      const enabledTypes = Object.entries(crimeToggles)
        .filter(([, on]) => on)
        .map(([type]) => type);
      const typeFilter: mapboxgl.FilterSpecification | null =
        enabledTypes.length === 6
          ? null
          : ["in", ["get", "category"], ["literal", enabledTypes]];
      const showCircles = showPoints;
      if (m.getLayer("crimes-heat")) {
        m.setLayoutProperty(
          "crimes-heat",
          "visibility",
          showHeatmap ? "visible" : "none",
        );
        m.setFilter("crimes-heat", typeFilter);
      }
      if (m.getLayer("crimes-area")) {
        m.setLayoutProperty(
          "crimes-area",
          "visibility",
          showCircles ? "visible" : "none",
        );
        m.setFilter("crimes-area", typeFilter);
      }
      if (m.getLayer("crimes-pins-bg")) {
        m.setLayoutProperty(
          "crimes-pins-bg",
          "visibility",
          showCircles ? "visible" : "none",
        );
        m.setFilter("crimes-pins-bg", typeFilter);
      }
      if (m.getLayer("crimes-pins-icon")) {
        m.setLayoutProperty(
          "crimes-pins-icon",
          "visibility",
          showCircles ? "visible" : "none",
        );
        m.setFilter("crimes-pins-icon", typeFilter);
      }
      if (m.getLayer("crimes-3d-extrusion")) {
        m.setFilter(
          "crimes-3d-extrusion",
          typeFilter as mapboxgl.FilterSpecification | null,
        );
      }
    };
    requestAnimationFrame(apply);
  }, [crimeToggles, showHeatmap, showPoints, routeLayerReady]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      if (!m.isStyleLoaded() || !m.getSource("crimes")) return;
      const raw = crimeData ?? {
        type: "FeatureCollection" as const,
        features: [],
      };
      const normalized: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: raw.features.map((f) => ({
          ...f,
          properties: {
            ...(f.properties as Record<string, string>),
            category: getCanonicalCategory(
              (f.properties as Record<string, string>)?.category,
            ),
          },
        })),
      };
      (m.getSource("crimes") as mapboxgl.GeoJSONSource).setData(normalized);
    };
    requestAnimationFrame(apply);
  }, [crimeData, routeLayerReady]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      if (!m.isStyleLoaded() || !show3D || !m.getSource("crimes-3d")) return;
      const raw = crimeData ?? {
        type: "FeatureCollection" as const,
        features: [],
      };
      const crimePolygons: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: raw.features.map((f) => {
          const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
          const props = (f.properties as Record<string, string>) ?? {};
          const category = props?.category ?? "other";
          const radiusM =
            CRIME_RADIUS_METERS[category] ?? CRIME_RADIUS_METERS.other;
          return {
            type: "Feature" as const,
            geometry: circlePolygon(lng, lat, radiusM),
            properties: props,
          };
        }),
      };
      (m.getSource("crimes-3d") as mapboxgl.GeoJSONSource).setData(
        crimePolygons,
      );
    };
    requestAnimationFrame(apply);
  }, [crimeData, show3D, routeLayerReady]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      if (!m.isStyleLoaded() || !m.getSource("route-fastest")) return;
      const srcFastest = m.getSource("route-fastest") as mapboxgl.GeoJSONSource;
      const srcSafe = m.getSource("route-safe") as mapboxgl.GeoJSONSource;
      if (routeFastestGeometry) {
        srcFastest.setData({
          type: "Feature",
          properties: {},
          geometry: routeFastestGeometry,
        });
        if (!routeSamePath && routeSafeGeometry) {
          srcSafe.setData({
            type: "Feature",
            properties: {},
            geometry: routeSafeGeometry,
          });
        } else {
          srcSafe.setData({ type: "FeatureCollection", features: [] });
        }
      } else {
        srcFastest.setData({ type: "FeatureCollection", features: [] });
        srcSafe.setData({ type: "FeatureCollection", features: [] });
      }
    };
    requestAnimationFrame(apply);
  }, [routeFastestGeometry, routeSafeGeometry, routeSamePath, routeLayerReady]);

  useEffect(() => {
    const m = map.current;
    if (
      !m ||
      !m.getLayer("route-line-fastest") ||
      !m.getLayer("route-line-safe")
    )
      return;
    const showFastest = !!routeFastestGeometry;
    const showSafe = !!routeSafeGeometry && !routeSamePath;
    m.setLayoutProperty(
      "route-line-fastest",
      "visibility",
      showFastest ? "visible" : "none",
    );
    m.setLayoutProperty(
      "route-line-safe",
      "visibility",
      showSafe ? "visible" : "none",
    );
  }, [routeFastestGeometry, routeSamePath, routeSafeGeometry, routeLayerReady]);

  useEffect(() => {
    routeStatsRef.current = {
      fastestDuration: routeFastestDuration,
      fastestDistance: routeFastestDistance,
      safeDuration: routeSafeDuration,
      safeDistance: routeSafeDistance,
      samePath: routeSamePath,
    };
  }, [
    routeFastestDuration,
    routeFastestDistance,
    routeSafeDuration,
    routeSafeDistance,
    routeSamePath,
  ]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const { start: startM, end: endM } = routeMarkersRef.current;
    if (routeOrigin) {
      if (!startM) {
        const el = document.createElement("div");
        el.innerHTML = `<span class="material-symbols-outlined" style="font-size:28px;color:#22c55e;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8))">trip_origin</span>`;
        routeMarkersRef.current.start = new mapboxgl.Marker({ element: el })
          .setLngLat(routeOrigin)
          .addTo(m);
      } else startM.setLngLat(routeOrigin).addTo(m);
    } else {
      startM?.remove();
      routeMarkersRef.current.start = null;
    }
    if (routeDestination) {
      if (!endM) {
        const el = document.createElement("div");
        el.innerHTML = `<span class="material-symbols-outlined" style="font-size:28px;color:#ef4444;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8))">location_on</span>`;
        routeMarkersRef.current.end = new mapboxgl.Marker({ element: el })
          .setLngLat(routeDestination)
          .addTo(m);
      } else endM.setLngLat(routeDestination).addTo(m);
    } else {
      endM?.remove();
      routeMarkersRef.current.end = null;
    }
  }, [routeOrigin, routeDestination, routeLayerReady]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const styleUrl = MAP_STYLES[mapStyle].url;
    m.setStyle(styleUrl);
    m.once("style.load", () => {
      addCrimeLayers(m);
      const rawCrime = crimeDataRef.current ?? {
        type: "FeatureCollection" as const,
        features: [],
      };
      const normalizedCrime: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: rawCrime.features.map((f) => ({
          ...f,
          properties: {
            ...(f.properties as Record<string, string>),
            category: getCanonicalCategory(
              (f.properties as Record<string, string>)?.category,
            ),
          },
        })),
      };
      (m.getSource("crimes") as mapboxgl.GeoJSONSource).setData(
        normalizedCrime,
      );
      addHazardLayers(m);
      addCrimePinLayers(m);
      addCrimeIconImages(m).then(() => {
        if (m.getSource("crimes")) addCrimePinIconLayer(m);
        addRouteLayer(m);
        elevateMarkerContainer(m);
        if (show3D) {
          apply3DTerrain(m);
          add3DCircleLayers(
            m,
            crimeDataRef.current ?? { type: "FeatureCollection", features: [] },
          );
          if (m.getLayer("crimes-area"))
            m.setLayoutProperty("crimes-area", "visibility", "none");
        }
        if (showBuildings) addBuildingsLayer(m);
        requestAnimationFrame(() => {
          setRouteLayerReady((v) => v + 1);
        });
      });
    });
  }, [mapStyle]);
  useEffect(() => {
    if (map.current) {
      map.current.getCanvas().style.cursor = predictMode ? "crosshair" : "";
    }
  }, [predictMode]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      if (!m.isStyleLoaded()) return;
      if (show3D) {
        apply3DTerrain(m);
        add3DCircleLayers(
          m,
          crimeData ?? { type: "FeatureCollection", features: [] },
        );
        if (m.getLayer("crimes-area"))
          m.setLayoutProperty("crimes-area", "visibility", "none");
      } else {
        m.setTerrain(null);
        if (m.getLayer("sky-layer")) m.removeLayer("sky-layer");
        m.setPitch(40);
        remove3DCircleLayers(m);
        const showCircles = showPoints;
        if (m.getLayer("crimes-area"))
          m.setLayoutProperty(
            "crimes-area",
            "visibility",
            showCircles ? "visible" : "none",
          );
        if (m.getLayer("crimes-pins-bg"))
          m.setLayoutProperty(
            "crimes-pins-bg",
            "visibility",
            showCircles ? "visible" : "none",
          );
        if (m.getLayer("crimes-pins-icon"))
          m.setLayoutProperty(
            "crimes-pins-icon",
            "visibility",
            showCircles ? "visible" : "none",
          );
      }
    };
    requestAnimationFrame(apply);
  }, [show3D, showPoints, showHeatmap, crimeData]);

  function add3DCircleLayers(
    m: mapboxgl.Map,
    incidentData: GeoJSON.FeatureCollection,
  ) {
    if (m.getSource("crimes-3d")) return;
    const crimePolygons: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: incidentData.features.map((f) => {
        const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
        const props = f.properties as Record<string, string>;
        const category = props?.category ?? "other";
        const radiusM =
          CRIME_RADIUS_METERS[category] ?? CRIME_RADIUS_METERS.other;
        return {
          type: "Feature" as const,
          geometry: circlePolygon(lng, lat, radiusM),
          properties: props,
        };
      }),
    };
    const hazardRadiusM: Record<string, number> = {
      high: 150,
      medium: 100,
      low: 50,
    };
    const hazardPolygons: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: HAZARD_DATA.features.map((f) => {
        const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
        const props = f.properties as Record<string, string>;
        const severity = props?.severity ?? "low";
        return {
          type: "Feature" as const,
          geometry: circlePolygon(lng, lat, hazardRadiusM[severity] ?? 50),
          properties: props,
        };
      }),
    };
    m.addSource("crimes-3d", { type: "geojson", data: crimePolygons });
    m.addSource("hazards-3d", { type: "geojson", data: hazardPolygons });
    m.addLayer({
      id: "crimes-3d-extrusion",
      type: "fill-extrusion",
      source: "crimes-3d",
      paint: {
        "fill-extrusion-color": [
          "match",
          ["get", "category"],
          "theft",
          CRIME_COLORS.theft,
          "suspicious",
          CRIME_COLORS.suspicious,
          "vandalism",
          CRIME_COLORS.vandalism,
          "assault",
          CRIME_COLORS.assault,
          "traffic",
          CRIME_COLORS.traffic,
          "other",
          CRIME_COLORS.other,
          "#0d7ff2",
        ],
        "fill-extrusion-height": 40,
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": 0.7,
      },
    });
    m.addLayer({
      id: "hazards-3d-extrusion",
      type: "fill-extrusion",
      source: "hazards-3d",
      paint: {
        "fill-extrusion-color": [
          "match",
          ["get", "severity"],
          "high",
          "rgba(239,68,68,0.9)",
          "medium",
          "rgba(249,115,22,0.85)",
          "low",
          "rgba(234,179,8,0.8)",
          "rgba(148,163,184,0.7)",
        ],
        "fill-extrusion-height": [
          "match",
          ["get", "severity"],
          "high",
          50,
          "medium",
          35,
          "low",
          25,
          25,
        ],
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": 0.75,
      },
    });
  }

  function remove3DCircleLayers(m: mapboxgl.Map) {
    if (m.getLayer("hazards-3d-extrusion"))
      m.removeLayer("hazards-3d-extrusion");
    if (m.getLayer("crimes-3d-extrusion")) m.removeLayer("crimes-3d-extrusion");
    if (m.getSource("hazards-3d")) m.removeSource("hazards-3d");
    if (m.getSource("crimes-3d")) m.removeSource("crimes-3d");
  }

  function apply3DTerrain(m: mapboxgl.Map) {
    if (!m.getSource("mapbox-dem")) {
      m.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
    }
    m.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
    if (!m.getLayer("sky-layer")) {
      m.addLayer({
        id: "sky-layer",
        type: "sky",
        paint: {
          "sky-type": "atmosphere",
          "sky-atmosphere-sun": [0.0, 0.0],
          "sky-atmosphere-sun-intensity": 15,
        },
      });
    }
    m.setPitch(60);
  }

  useEffect(() => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) return;
    if (showBuildings) {
      addBuildingsLayer(m);
    } else {
      if (m.getLayer("3d-buildings")) m.removeLayer("3d-buildings");
    }
  }, [showBuildings]);

  function addBuildingsLayer(m: mapboxgl.Map) {
    if (m.getLayer("3d-buildings")) return;

    const defaultColor =
      mapStyle === "dark"
        ? "#1e293b"
        : mapStyle === "satellite"
          ? "#94a3b8"
          : "#d1d5db";

    m.addLayer({
      id: "3d-buildings",
      source: "composite",
      "source-layer": "building",
      type: "fill-extrusion",
      minzoom: 14,
      paint: {
        "fill-extrusion-color": [
          "case",
          ["boolean", ["feature-state", "clicked"], false],
          "#0d7ff2",
          ["boolean", ["feature-state", "hovered"], false],
          "#38bdf8",
          defaultColor,
        ],
        "fill-extrusion-height": [
          "case",
          ["boolean", ["feature-state", "clicked"], false],
          ["*", ["get", "height"], 1.15],
          ["get", "height"],
        ],
        "fill-extrusion-base": ["get", "min_height"],
        "fill-extrusion-opacity": 0.75,
      },
    });

    let hoveredId: string | number | null = null;
    let clickedId: string | number | null = null;

    m.on("mousemove", "3d-buildings", (e) => {
      const feature = e.features?.[0];
      if (!feature || feature.id == null) return;

      if (hoveredId !== null && hoveredId !== clickedId) {
        m.setFeatureState(
          { source: "composite", sourceLayer: "building", id: hoveredId },
          { hovered: false },
        );
      }

      hoveredId = feature.id;
      m.getCanvas().style.cursor = "pointer";
      m.setFeatureState(
        { source: "composite", sourceLayer: "building", id: hoveredId },
        { hovered: true },
      );
    });

    m.on("mouseleave", "3d-buildings", () => {
      if (hoveredId !== null && hoveredId !== clickedId) {
        m.setFeatureState(
          { source: "composite", sourceLayer: "building", id: hoveredId },
          { hovered: false },
        );
      }
      hoveredId = null;
      m.getCanvas().style.cursor = "";
    });

    m.on("click", "3d-buildings", (e) => {
      const feature = e.features?.[0];
      if (!feature || feature.id == null) return;

      if (clickedId !== null) {
        m.setFeatureState(
          { source: "composite", sourceLayer: "building", id: clickedId },
          { clicked: false, hovered: false },
        );
      }

      if (clickedId === feature.id) {
        clickedId = null;
        return;
      }

      clickedId = feature.id;
      m.setFeatureState(
        { source: "composite", sourceLayer: "building", id: clickedId },
        { clicked: true },
      );
    });
  }

  function elevateMarkerContainer(m: mapboxgl.Map) {
    const container = m.getContainer();
    if (!container) return;
    const markerContainer = container.querySelector(
      ".mapboxgl-marker-container",
    ) as HTMLElement | null;
    if (markerContainer) {
      markerContainer.style.zIndex = "5";
    }
  }

  function addCrimeLayers(m: mapboxgl.Map) {
    if (m.getSource("crimes")) return;
    m.addSource("crimes", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    /* Heatmap: only when zoomed OUT (low zoom) — general density */
    m.addLayer({
      id: "crimes-heat",
      type: "heatmap",
      source: "crimes",
      minzoom: 10,
      maxzoom: 11.99,
      paint: {
        "heatmap-weight": 0.6,
        "heatmap-intensity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          0.8,
          12,
          1.4,
        ],
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(0,0,0,0)",
          0.12,
          "rgba(13,127,242,0.15)",
          0.28,
          "rgba(249,115,22,0.35)",
          0.45,
          "rgba(239,68,68,0.5)",
          0.65,
          "rgba(220,38,38,0.65)",
          0.85,
          "rgba(185,28,28,0.85)",
          1,
          "rgba(185,28,28,1)",
        ],
        "heatmap-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          60,
          12,
          140,
        ],
        "heatmap-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          0.5,
          12,
          0.7,
        ],
      },
    });

    /* Area circles: zoom must be top-level; at each zoom stop use match on category for radius */
    m.addLayer({
      id: "crimes-area",
      type: "circle",
      source: "crimes",
      minzoom: 0,
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          [
            "match",
            ["get", "category"],
            "assault",
            2.7,
            "theft",
            2.5,
            "suspicious",
            2.2,
            "vandalism",
            2,
            "traffic",
            1.7,
            "other",
            1.5,
            2,
          ],
          8,
          [
            "match",
            ["get", "category"],
            "assault",
            5.4,
            "theft",
            5,
            "suspicious",
            4.4,
            "vandalism",
            4,
            "traffic",
            3.4,
            "other",
            3,
            4,
          ],
          10,
          [
            "match",
            ["get", "category"],
            "assault",
            10.8,
            "theft",
            10,
            "suspicious",
            8.8,
            "vandalism",
            8,
            "traffic",
            6.8,
            "other",
            6,
            8,
          ],
          12,
          [
            "match",
            ["get", "category"],
            "assault",
            34,
            "theft",
            31,
            "suspicious",
            28,
            "vandalism",
            25,
            "traffic",
            21,
            "other",
            19,
            25,
          ],
          14,
          [
            "match",
            ["get", "category"],
            "assault",
            61,
            "theft",
            56,
            "suspicious",
            50,
            "vandalism",
            45,
            "traffic",
            38,
            "other",
            34,
            45,
          ],
          16,
          [
            "match",
            ["get", "category"],
            "assault",
            108,
            "theft",
            100,
            "suspicious",
            88,
            "vandalism",
            80,
            "traffic",
            68,
            "other",
            60,
            80,
          ],
          18,
          [
            "match",
            ["get", "category"],
            "assault",
            162,
            "theft",
            150,
            "suspicious",
            132,
            "vandalism",
            120,
            "traffic",
            102,
            "other",
            90,
            120,
          ],
        ],
        "circle-color": [
          "match",
          ["get", "category"],
          "theft",
          CRIME_COLORS.theft,
          "suspicious",
          CRIME_COLORS.suspicious,
          "vandalism",
          CRIME_COLORS.vandalism,
          "assault",
          CRIME_COLORS.assault,
          "traffic",
          CRIME_COLORS.traffic,
          "other",
          CRIME_COLORS.other,
          "#0d7ff2",
        ],
        "circle-opacity": 0.22,
        "circle-stroke-width": 0,
      },
    });
  }

  function addCrimePinLayers(m: mapboxgl.Map) {
    if (m.getLayer("crimes-pins-bg")) return;
    m.addLayer({
      id: "crimes-pins-bg",
      type: "circle",
      source: "crimes",
      minzoom: 10,
      paint: {
        "circle-radius": 14,
        "circle-color": [
          "match",
          ["get", "category"],
          "theft",
          CRIME_COLORS.theft,
          "suspicious",
          CRIME_COLORS.suspicious,
          "vandalism",
          CRIME_COLORS.vandalism,
          "assault",
          CRIME_COLORS.assault,
          "traffic",
          CRIME_COLORS.traffic,
          "other",
          CRIME_COLORS.other,
          "#0d7ff2",
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "rgba(255,255,255,0.6)",
        "circle-opacity": 0.95,
      },
    });
    /* crimes-pins-icon is added in style.load after addCrimeIconImages() resolves, so images exist */
  }

  function addCrimePinIconLayer(m: mapboxgl.Map) {
    if (m.getLayer("crimes-pins-icon")) return;
    m.addLayer({
      id: "crimes-pins-icon",
      type: "symbol",
      source: "crimes",
      minzoom: 10,
      layout: {
        "icon-image": [
          "match",
          ["get", "category"],
          "theft",
          "crime-icon-theft",
          "assault",
          "crime-icon-assault",
          "suspicious",
          "crime-icon-suspicious",
          "vandalism",
          "crime-icon-vandalism",
          "traffic",
          "crime-icon-traffic",
          "other",
          "crime-icon-other",
          "crime-icon-other",
        ],
        "icon-size": 0.36,
        "icon-anchor": "center",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    });
  }

  /** Hazards are not drawn on the map; HAZARD_DATA is still used for safe-route exclusion in buildExcludeParamForRoute. */
  function addHazardLayers(_m: mapboxgl.Map) {
    /* No layer — avoids 50 extra circles; route logic uses HAZARD_DATA from import. */
  }

  function addRouteLayer(m: mapboxgl.Map) {
    if (m.getSource("route-fastest")) return;
    m.addSource("route-fastest", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    m.addSource("route-safe", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    m.addLayer({
      id: "route-line-fastest",
      type: "line",
      source: "route-fastest",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#3b82f6",
        "line-width": 5,
        "line-opacity": 0.9,
      },
    });
    m.addLayer({
      id: "route-line-safe",
      type: "line",
      source: "route-safe",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#22c55e",
        "line-width": 5,
        "line-opacity": 0.9,
      },
    });
  }

  /** True if the two routes are effectively the same path (within ~30m). */
  function routesAreSame(
    a: GeoJSON.LineString,
    b: GeoJSON.LineString,
  ): boolean {
    const coordsA = a.coordinates;
    const coordsB = b.coordinates;
    if (
      Math.abs(coordsA.length - coordsB.length) >
      Math.max(coordsA.length, coordsB.length) * 0.1
    )
      return false;
    const len = Math.min(coordsA.length, coordsB.length);
    const step = Math.max(1, Math.floor(len / 20));
    for (let i = 0; i < len; i += step) {
      const [lngA, latA] = coordsA[i];
      const [lngB, latB] = coordsB[Math.min(i, coordsB.length - 1)];
      if (haversineMeters(latA, lngA, latB, lngB) > 30) return false;
    }
    return true;
  }

  /** Min distance from point (lat,lng) to the route line (meters). Samples route at ~every 15m. */
  function minDistanceToRoute(
    lat: number,
    lng: number,
    routeCoords: GeoJSON.Position[],
  ): number {
    let min = Infinity;
    const step = Math.max(1, Math.floor(routeCoords.length / 200));
    for (let i = 0; i < routeCoords.length; i += step) {
      const pos = routeCoords[i];
      const rlng = pos[0];
      const rlat = pos[1];
      const d = haversineMeters(lat, lng, rlat, rlng);
      if (d < min) min = d;
    }
    return min;
  }

  /** Build exclude param only for zones that the route passes through or near (within zone radius + buffer). So the safe route actually avoids danger zones on the path. */
  const buildExcludeParamForRoute = useCallback(
    (routeGeometry: GeoJSON.LineString) => {
      const severityRadiusM: Record<string, number> = {
        high: 150,
        medium: 100,
        low: 50,
      };
      const routeCoords = routeGeometry.coordinates;
      const points: string[] = [];
      const maxPoints = 50;
      const pointsPerZone = 5;
      const routeBufferM = 40;

      const addZonePoints = (lng: number, lat: number, r: number) => {
        if (points.length + pointsPerZone > maxPoints) return;
        points.push(`point(${lng} ${lat})`);
        const [nLng, nLat] = offsetMeters(lat, lng, r, 0);
        points.push(`point(${nLng} ${nLat})`);
        const [sLng, sLat] = offsetMeters(lat, lng, -r, 0);
        points.push(`point(${sLng} ${sLat})`);
        const [eLng, eLat] = offsetMeters(lat, lng, 0, r);
        points.push(`point(${eLng} ${eLat})`);
        const [wLng, wLat] = offsetMeters(lat, lng, 0, -r);
        points.push(`point(${wLng} ${wLat})`);
      };

      const allHazards = [...HAZARD_DATA.features].map((f) => {
        const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
        const severity =
          (f.properties as { severity?: string })?.severity ?? "low";
        const r = severityRadiusM[severity] ?? 100;
        const dist = minDistanceToRoute(lat, lng, routeCoords);
        return {
          lng,
          lat,
          r,
          dist,
          order: severity === "high" ? 0 : severity === "medium" ? 1 : 2,
        };
      });
      allHazards.sort((a, b) => {
        const nearA = a.dist <= a.r + routeBufferM ? 0 : 1;
        const nearB = b.dist <= b.r + routeBufferM ? 0 : 1;
        if (nearA !== nearB) return nearA - nearB;
        if (a.order !== b.order) return a.order - b.order;
        return a.dist - b.dist;
      });
      for (const z of allHazards) {
        if (z.dist > z.r + routeBufferM) break;
        if (points.length + pointsPerZone > maxPoints) break;
        addZonePoints(z.lng, z.lat, z.r);
      }

      const enabledTypes = new Set(
        (Object.entries(crimeToggles) as [CrimeType, boolean][])
          .filter(([, on]) => on)
          .map(([t]) => t),
      );
      const features = crimeData?.features ?? [];
      const crimesNearRoute = features
        .filter((f) =>
          enabledTypes.has(
            (f.properties as Record<string, string>)?.category as CrimeType,
          ),
        )
        .map((f) => {
          const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
          const cat =
            (f.properties as Record<string, string>)?.category ?? "other";
          const r = CRIME_RADIUS_METERS[cat] ?? CRIME_RADIUS_METERS.other;
          const dist = minDistanceToRoute(lat, lng, routeCoords);
          const priority = cat === "assault" ? 0 : cat === "theft" ? 1 : 2;
          return { lng, lat, r, dist, priority };
        })
        .filter((z) => z.dist <= z.r + routeBufferM)
        .sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return a.dist - b.dist;
        });
      for (const z of crimesNearRoute) {
        if (points.length + pointsPerZone > maxPoints) break;
        addZonePoints(z.lng, z.lat, z.r);
      }
      return points.length ? points.join(",") : null;
    },
    [crimeToggles, crimeData],
  );

  const fetchDirections = useCallback(
    async (origin: [number, number], destination: [number, number]) => {
      setRouteLoading(true);
      setRouteError(null);
      const coords = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
      const urlFastest = `${MAPBOX_DIRECTIONS_BASE}/driving/${coords}?access_token=${MAPBOX_TOKEN}&geometries=geojson`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const fetchOpts = { signal: controller.signal };

        const resFastest = await fetch(urlFastest, fetchOpts);
        const dataFastest = await resFastest.json().catch(() => ({}));
        clearTimeout(timeoutId);

        if (!resFastest.ok) {
          const msg =
            (dataFastest as { message?: string }).message ??
            resFastest.statusText ??
            "Request failed";
          setRouteError(`Route error: ${msg}`);
          return;
        }
        if (dataFastest.code !== "Ok" || !dataFastest.routes?.length) {
          const msg =
            (dataFastest as { message?: string }).message ??
            "No route found. Try different points.";
          setRouteError(msg);
          setRouteFastestGeometry(null);
          setRouteSafeGeometry(null);
          setRouteSamePath(false);
          setRouteFastestDuration(null);
          setRouteFastestDistance(null);
          setRouteSafeDuration(null);
          setRouteSafeDistance(null);
          setRouteHazardCount(null);
          return;
        }

        const routeF = dataFastest.routes[0];
        const geomFastest = routeF.geometry as GeoJSON.LineString;
        setRouteFastestGeometry(geomFastest);
        setRouteFastestDuration(routeF.duration ?? null);
        setRouteFastestDistance(routeF.distance ?? null);

        const exclude = buildExcludeParamForRoute(geomFastest);
        const urlSafe =
          exclude && exclude.length > 0
            ? `${MAPBOX_DIRECTIONS_BASE}/driving/${coords}?access_token=${MAPBOX_TOKEN}&geometries=geojson&exclude=${encodeURIComponent(exclude)}`
            : urlFastest;

        const resSafe = await fetch(urlSafe, { signal: controller.signal });
        const dataSafe = await resSafe.json().catch(() => ({}));

        if (dataSafe.code !== "Ok" || !dataSafe.routes?.length) {
          setRouteSafeGeometry(null);
          setRouteSamePath(true);
          setRouteSafeDuration(null);
          setRouteSafeDistance(null);
          setRouteHazardCount(null);
          return;
        }
        const routeS = dataSafe.routes[0];
        const geomSafe = routeS.geometry as GeoJSON.LineString;
        const same = routesAreSame(geomFastest, geomSafe);
        setRouteSafeGeometry(same ? null : geomSafe);
        setRouteSamePath(same);
        setRouteSafeDuration(same ? null : (routeS.duration ?? null));
        setRouteSafeDistance(same ? null : (routeS.distance ?? null));

        const coordsAlongRoute = geomSafe.coordinates;
        const counts = { high: 0, medium: 0, low: 0 };
        const severityRadiusMeters: Record<string, number> = {
          high: 150,
          medium: 100,
          low: 50,
        };
        const seen = new Set<number>();
        for (
          let i = 0;
          i < coordsAlongRoute.length;
          i += Math.max(1, Math.floor(coordsAlongRoute.length / 50))
        ) {
          const [lng, lat] = coordsAlongRoute[i];
          HAZARD_DATA.features.forEach((f, idx) => {
            if (seen.has(idx)) return;
            const [hlng, hlat] = (f.geometry as GeoJSON.Point).coordinates;
            const severity =
              (f.properties as { severity?: string })?.severity ?? "low";
            const distM = haversineMeters(lat, lng, hlat, hlng);
            if (distM <= (severityRadiusMeters[severity] ?? 50)) {
              seen.add(idx);
              if (severity === "high") counts.high++;
              else if (severity === "medium") counts.medium++;
              else counts.low++;
            }
          });
        }
        setRouteHazardCount(counts);
      } catch (e) {
        const message =
          e instanceof Error
            ? e.name === "AbortError"
              ? "Request timed out. Try again."
              : e.message
            : "Failed to load route.";
        setRouteError(message);
        setRouteFastestGeometry(null);
        setRouteSafeGeometry(null);
        setRouteSamePath(false);
        setRouteFastestDuration(null);
        setRouteFastestDistance(null);
        setRouteSafeDuration(null);
        setRouteSafeDistance(null);
        setRouteHazardCount(null);
      } finally {
        setRouteLoading(false);
      }
    },
    [buildExcludeParamForRoute],
  );

  const prevCrimeDataForRouteRef = useRef<GeoJSON.FeatureCollection | null>(
    null,
  );
  useEffect(() => {
    if (!routeFastestGeometry) {
      prevCrimeDataForRouteRef.current = null;
      return;
    }
    if (!routeOrigin || !routeDestination || routeLoading) return;
    const prev = prevCrimeDataForRouteRef.current;
    if (prev === null) {
      prevCrimeDataForRouteRef.current = crimeData ?? null;
      return;
    }
    if (prev === crimeData) return;
    prevCrimeDataForRouteRef.current = crimeData ?? null;
    fetchDirections(routeOrigin, routeDestination);
  }, [
    crimeData,
    routeOrigin,
    routeDestination,
    routeFastestGeometry,
    routeLoading,
    fetchDirections,
  ]);

  function toggleCrimeType(type: CrimeType) {
    setCrimeToggles((prev) => ({ ...prev, [type]: !prev[type] }));
  }

  const crimeTypes: {
    key: CrimeType;
    label: string;
    icon: string;
    color: string;
  }[] = [
    {
      key: "theft",
      label: "Theft",
      icon: "local_police",
      color: CRIME_COLORS.theft,
    },
    {
      key: "assault",
      label: "Assault",
      icon: "emergency",
      color: CRIME_COLORS.assault,
    },
    {
      key: "suspicious",
      label: "Suspicious",
      icon: "visibility",
      color: CRIME_COLORS.suspicious,
    },
    {
      key: "vandalism",
      label: "Vandalism",
      icon: "broken_image",
      color: CRIME_COLORS.vandalism,
    },
    {
      key: "traffic",
      label: "Traffic",
      icon: "directions_car",
      color: CRIME_COLORS.traffic,
    },
    { key: "other", label: "Other", icon: "help", color: CRIME_COLORS.other },
  ];

  const crimeCount = (type: CrimeType) =>
    (crimeData?.features ?? []).filter(
      (f) => (f.properties as Record<string, string>)?.category === type,
    ).length;

  return (
    <div
      className="flex flex-col bg-background-dark overflow-hidden"
      style={{ height: "100dvh", width: "100vw" }}
    >
      <header className="flex items-center justify-between px-6 py-3 bg-background-dark/90 backdrop-blur-md border-b border-slate-800 z-30 shrink-0">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-white font-bold text-xl">G.R.I.D</span>
          </Link>
          <div className="hidden md:flex items-center gap-1 ml-4">
            <span className="material-symbols-outlined text-primary text-lg">
              location_on
            </span>
            <span className="text-slate-400 text-sm font-semibold">
              Kingston, Jamaica
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-safe-green"></span>
            </span>
            <span className="text-slate-400 font-semibold">Live</span>
          </div>
          <button
            onClick={() => {
              setPredictMode(!predictMode);
              setRouteClickMode(null); // Clear routing modes
              setPredictionResult(null);
            }}
            className={`flex items-center gap-2 rounded-lg h-9 px-4 text-sm font-bold transition-all ${
              predictMode
                ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {predicting ? "hourglass_empty" : "online_prediction"}
            </span>
            <span className="hidden sm:inline">
              {predicting
                ? "Analyzing..."
                : predictMode
                  ? "Click Map..."
                  : "Predict Risk"}
            </span>
          </button>

          <Link
            to="/IncidentReportPage"
            className="flex items-center gap-2 rounded-lg h-9 px-4 bg-alert-red text-white text-sm font-bold hover:bg-alert-red/90 transition-all"
          >
            <span className="material-symbols-outlined text-base">report</span>
            <span className="hidden sm:inline">Report</span>
          </Link>
          <Link
            to="/"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">home</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 relative min-h-0">
        <div
          ref={mapContainer}
          className="absolute inset-0 z-0"
          style={{ width: "100%", height: "100%" }}
        />

        {/* Layer panel toggle */}
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className="absolute top-4 left-4 z-30 size-11 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/50 flex items-center justify-center text-slate-200 hover:bg-slate-800 transition-colors"
          title="Layers & Filters"
        >
          <span className="material-symbols-outlined text-xl">
            {panelOpen ? "close" : "layers"}
          </span>
        </button>

        {/* Safe Routes panel toggle — same style as Layers */}
        <button
          onClick={() => setRoutePanelOpen((v) => !v)}
          className="absolute top-4 left-16 z-30 size-11 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/50 flex items-center justify-center text-slate-200 hover:bg-slate-800 transition-colors"
          title="Safe Routes"
        >
          <span className="material-symbols-outlined text-xl">
            {routePanelOpen ? "close" : "route"}
          </span>
        </button>

        {/* Side panel (Layers) */}
        <div
          className={`absolute top-4 left-28 z-20 w-64 transition-all duration-300 ${panelOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"}`}
        >
          <div className="rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/50 overflow-hidden shadow-2xl">
            {/* Map Style */}
            <div className="p-4 border-b border-slate-700/50">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                Map Style
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  Object.entries(MAP_STYLES) as [
                    MapStyleKey,
                    (typeof MAP_STYLES)[MapStyleKey],
                  ][]
                ).map(([key, style]) => (
                  <button
                    key={key}
                    onClick={() => setMapStyle(key)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg text-xs font-semibold transition-all ${
                      mapStyle === key
                        ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {style.icon}
                    </span>
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Layers */}
            <div className="p-4 border-b border-slate-700/50">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                Layers
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setShowHeatmap((v) => !v)}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    showHeatmap
                      ? "bg-white/10 text-white"
                      : "text-slate-500 hover:bg-white/5"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    thermostat
                  </span>
                  Heatmap
                  <span
                    className={`ml-auto size-4 rounded border-2 flex items-center justify-center transition-colors ${
                      showHeatmap
                        ? "bg-primary border-primary"
                        : "border-slate-600"
                    }`}
                  >
                    {showHeatmap && (
                      <span className="material-symbols-outlined text-[10px] text-white">
                        check
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => setShowPoints((v) => !v)}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    showPoints
                      ? "bg-white/10 text-white"
                      : "text-slate-500 hover:bg-white/5"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    location_on
                  </span>
                  Crime Points
                  <span
                    className={`ml-auto size-4 rounded border-2 flex items-center justify-center transition-colors ${
                      showPoints
                        ? "bg-primary border-primary"
                        : "border-slate-600"
                    }`}
                  >
                    {showPoints && (
                      <span className="material-symbols-outlined text-[10px] text-white">
                        check
                      </span>
                    )}
                  </span>
                </button>
                {crimeDataLoading && (
                  <p className="px-3 py-1 text-[10px] text-slate-500">
                    Loading incidents…
                  </p>
                )}
                {crimeDataError && (
                  <p
                    className="px-3 py-1 text-[10px] text-amber-500"
                    title={crimeDataError}
                  >
                    DB: {crimeDataError}
                  </p>
                )}
                <button
                  onClick={() => setShow3D((v) => !v)}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    show3D
                      ? "bg-white/10 text-white"
                      : "text-slate-500 hover:bg-white/5"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    3d_rotation
                  </span>
                  3D Terrain
                  <span
                    className={`ml-auto size-4 rounded border-2 flex items-center justify-center transition-colors ${
                      show3D ? "bg-primary border-primary" : "border-slate-600"
                    }`}
                  >
                    {show3D && (
                      <span className="material-symbols-outlined text-[10px] text-white">
                        check
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => setShowBuildings((v) => !v)}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    showBuildings
                      ? "bg-white/10 text-white"
                      : "text-slate-500 hover:bg-white/5"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    apartment
                  </span>
                  3D Buildings
                  <span
                    className={`ml-auto size-4 rounded border-2 flex items-center justify-center transition-colors ${
                      showBuildings
                        ? "bg-primary border-primary"
                        : "border-slate-600"
                    }`}
                  >
                    {showBuildings && (
                      <span className="material-symbols-outlined text-[10px] text-white">
                        check
                      </span>
                    )}
                  </span>
                </button>
              </div>
            </div>

            {/* Crime Types */}
            <div className="p-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                Crime Types
              </p>
              <div className="space-y-1.5">
                {crimeTypes.map((ct) => (
                  <button
                    key={ct.key}
                    onClick={() => toggleCrimeType(ct.key)}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      crimeToggles[ct.key]
                        ? "bg-white/10 text-white"
                        : "text-slate-500 hover:bg-white/5"
                    }`}
                  >
                    <span
                      className="size-3 rounded-full shrink-0 transition-opacity"
                      style={{
                        background: ct.color,
                        opacity: crimeToggles[ct.key] ? 1 : 0.3,
                      }}
                    />
                    <span
                      className="material-symbols-outlined text-base"
                      style={{
                        color: crimeToggles[ct.key] ? ct.color : undefined,
                      }}
                    >
                      {ct.icon}
                    </span>
                    {ct.label}
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/5">
                      {crimeCount(ct.key)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Safe Routes panel — toggled by Safe Routes button */}
        <div
          className={`absolute top-4 right-4 z-20 w-72 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/50 shadow-xl overflow-hidden transition-all duration-300 ${routePanelOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"}`}
        >
          <div className="p-3 border-b border-slate-700/50 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              route
            </span>
            <span className="text-sm font-bold text-white">Safe Routes</span>
          </div>
          <div className="p-3 space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setRouteClickMode((m) => (m === "start" ? null : "start"))
                }
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  routeClickMode === "start"
                    ? "bg-primary text-white ring-1 ring-primary/50"
                    : "bg-white/10 text-slate-300 hover:bg-white/15"
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  trip_origin
                </span>
                Set start
              </button>
              <button
                type="button"
                onClick={() =>
                  setRouteClickMode((m) =>
                    m === "destination" ? null : "destination",
                  )
                }
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  routeClickMode === "destination"
                    ? "bg-primary text-white ring-1 ring-primary/50"
                    : "bg-white/10 text-slate-300 hover:bg-white/15"
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  location_on
                </span>
                Set end
              </button>
            </div>
            {locationStatus === "granted" && userLocation && (
              <button
                type="button"
                onClick={() => {
                  setRouteOrigin([userLocation.lng, userLocation.lat]);
                  setRouteClickMode(null);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold bg-safe-green/20 text-safe-green hover:bg-safe-green/30 transition-all"
              >
                <span className="material-symbols-outlined text-sm">
                  my_location
                </span>
                Use my location (start)
              </button>
            )}
            <div className="flex rounded-lg overflow-hidden border border-slate-700/50">
              <button
                type="button"
                onClick={() => setRouteMode("fastest")}
                className={`flex-1 py-2 text-xs font-semibold transition-all ${routeMode === "fastest" ? "bg-white/15 text-white" : "text-slate-500 hover:bg-white/5"}`}
              >
                Fastest
              </button>
              <button
                type="button"
                onClick={() => setRouteMode("safe")}
                className={`flex-1 py-2 text-xs font-semibold transition-all ${routeMode === "safe" ? "bg-safe-green/20 text-safe-green" : "text-slate-500 hover:bg-white/5"}`}
              >
                Safe
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!routeOrigin || !routeDestination || routeLoading}
                onClick={() =>
                  routeOrigin &&
                  routeDestination &&
                  fetchDirections(routeOrigin, routeDestination)
                }
                className="flex-1 py-2 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                {routeLoading ? "Loading…" : "Get route"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRouteOrigin(null);
                  setRouteDestination(null);
                  setRouteFastestGeometry(null);
                  setRouteSafeGeometry(null);
                  setRouteSamePath(false);
                  setRouteFastestDuration(null);
                  setRouteFastestDistance(null);
                  setRouteSafeDuration(null);
                  setRouteSafeDistance(null);
                  setRouteHazardCount(null);
                  setRouteError(null);
                  setRouteClickMode(null);
                }}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-white/10 hover:text-white transition-all"
              >
                Clear
              </button>
            </div>
            {routeError && (
              <p className="text-xs text-alert-red">{routeError}</p>
            )}
            {(routeFastestDuration != null || routeSafeDuration != null) && (
              <div className="pt-2 border-t border-slate-700/50 space-y-2 text-xs text-slate-400">
                {routeSamePath ? (
                  <>
                    <p>
                      <span className="text-primary font-semibold">Route</span>{" "}
                      —{" "}
                      {routeFastestDuration != null &&
                        `${Math.round(routeFastestDuration / 60)} min`}
                      {routeFastestDistance != null &&
                        ` · ${(routeFastestDistance / 1000).toFixed(1)} km`}
                    </p>
                  </>
                ) : (
                  <>
                    {routeFastestDuration != null && (
                      <p>
                        <span className="text-blue-400 font-semibold">
                          Fastest
                        </span>{" "}
                        — {Math.round(routeFastestDuration / 60)} min
                        {routeFastestDistance != null &&
                          ` · ${(routeFastestDistance / 1000).toFixed(1)} km`}
                      </p>
                    )}
                    {routeSafeDuration != null && (
                      <p>
                        <span className="text-safe-green font-semibold">
                          Safest
                        </span>{" "}
                        — {Math.round(routeSafeDuration / 60)} min
                        {routeSafeDistance != null &&
                          ` · ${(routeSafeDistance / 1000).toFixed(1)} km`}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
            {routeHazardCount && (
              <div className="pt-2 border-t border-slate-700/50 text-xs">
                <p className="text-slate-500 font-semibold mb-1">
                  Hazards along route
                </p>
                <div className="flex gap-3 text-slate-400">
                  {routeHazardCount.high > 0 && (
                    <span className="text-alert-red">
                      High: {routeHazardCount.high}
                    </span>
                  )}
                  {routeHazardCount.medium > 0 && (
                    <span className="text-warning-orange">
                      Medium: {routeHazardCount.medium}
                    </span>
                  )}
                  {routeHazardCount.low > 0 && (
                    <span className="text-slate-400">
                      Low: {routeHazardCount.low}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legend — only items that are toggled on */}
        {(() => {
          const enabledCrimeTypes = crimeTypes.filter(
            (ct) => crimeToggles[ct.key],
          );
          const hasRoutes = !!routeFastestGeometry;
          return (
            <div className="absolute bottom-20 right-4 z-20 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/50 px-3 py-2 shadow-lg max-h-[50vh] overflow-y-auto mt-10">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Legend
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-700/50">
                  <span className="material-symbols-outlined text-slate-400 text-sm">
                    database
                  </span>
                  <span className="text-slate-400 font-medium">
                    Incidents
                    <span className="text-slate-500 font-normal">
                      {" "}
                      ({crimeData?.features?.length ?? 0})
                    </span>
                  </span>
                </div>
                {showHeatmap && (
                  <div className="flex items-center gap-2">
                    <span className="block w-6 h-1.5 rounded-full bg-gradient-to-r from-primary/40 to-primary" />
                    <span className="text-slate-300 font-medium">Heatmap</span>
                  </div>
                )}
                {showPoints &&
                  enabledCrimeTypes.map((ct) => (
                    <div key={ct.key} className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full shrink-0"
                        style={{ background: ct.color }}
                      />
                      <span className="text-slate-300 font-medium">
                        {ct.label}
                      </span>
                    </div>
                  ))}
                {show3D && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-base">
                      3d_rotation
                    </span>
                    <span className="text-slate-300 font-medium">
                      3D Terrain
                    </span>
                  </div>
                )}
                {showBuildings && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-base">
                      apartment
                    </span>
                    <span className="text-slate-300 font-medium">
                      3D Buildings
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3 flex-wrap text-slate-500">
                  <span className="font-medium shrink-0">
                    Hazards (safe route):
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2.5 rounded-full bg-alert-red shrink-0" />{" "}
                    High
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2.5 rounded-full bg-warning-orange shrink-0" />{" "}
                    Medium
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2.5 rounded-full bg-slate-400 shrink-0" />{" "}
                    Low
                  </span>
                </div>
                {hasRoutes && (
                  <>
                    {routeSamePath ? (
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-700/50">
                        <span className="block w-8 h-1 rounded-full bg-blue-400" />
                        <span className="text-slate-300 font-medium">
                          Route (same path)
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-700/50">
                          <span className="block w-8 h-1 rounded-full bg-blue-400" />
                          <span className="text-slate-300 font-medium">
                            Fastest
                          </span>
                        </div>
                        {routeSafeGeometry && (
                          <div className="flex items-center gap-2">
                            <span className="block w-8 h-1 rounded-full bg-safe-green" />
                            <span className="text-slate-300 font-medium">
                              Safest
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    <p className="text-[10px] text-slate-500">
                      Hover route for time & distance
                    </p>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Location status */}
        <div className="absolute bottom-4 left-4 z-20">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-xs">
            <span
              className={`material-symbols-outlined text-sm ${
                locationStatus === "granted"
                  ? "text-safe-green"
                  : locationStatus === "denied"
                    ? "text-alert-red"
                    : "text-warning-orange"
              }`}
            >
              {locationStatus === "granted"
                ? "check_circle"
                : locationStatus === "denied"
                  ? "cancel"
                  : "pending"}
            </span>
            <span className="text-slate-400 font-medium">
              {locationStatus === "granted" && userLocation
                ? `${userLocation.lat.toFixed(4)}°N, ${Math.abs(userLocation.lng).toFixed(4)}°W`
                : locationStatus === "denied"
                  ? "Location access denied"
                  : "Requesting location..."}
            </span>
          </div>
        </div>
        {/* ---> PASTE THE PREDICTION RESULT OVERLAY HERE <--- */}
        {predictionResult && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-sm pointer-events-auto">
            <div className="rounded-xl bg-slate-900/95 backdrop-blur-xl border border-purple-500/50 p-4 shadow-[0_10px_40px_rgba(147,51,234,0.2)]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/30">
                    <span className="text-lg font-black text-purple-400">
                      {(predictionResult.probability * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">
                      AI Risk Assessment
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {predictionResult.message}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPredictionResult(null)}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    close
                  </span>
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-700/50 flex gap-4 text-[10px] text-slate-500 font-mono">
                <span>Lat: {predictionResult.lngLat[1].toFixed(4)}</span>
                <span>Lng: {predictionResult.lngLat[0].toFixed(4)}</span>
              </div>
            </div>
          </div>
        )}
        {/* -------------------------------------------------- */}

        {/* Selected crime detail */}
        {selectedCrime && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-md">
            <div className="rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="size-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: `${CRIME_COLORS[getCanonicalCategory(selectedCrime.category)] ?? "#0d7ff2"}20`,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        color:
                          CRIME_COLORS[
                            getCanonicalCategory(selectedCrime.category)
                          ] ?? "#0d7ff2",
                      }}
                    >
                      {getCrimeIcon(selectedCrime.category)}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">
                      {selectedCrime.address ||
                        selectedCrime.description ||
                        selectedCrime.category ||
                        "Incident"}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {formatTimeAgo(
                        selectedCrime.reported_date ?? "",
                        selectedCrime.reported_time ?? "",
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCrime(null)}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    close
                  </span>
                </button>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-700/50">
                <span
                  className="text-[10px] px-2 py-1 rounded-full font-bold uppercase"
                  style={{
                    background: `${CRIME_COLORS[getCanonicalCategory(selectedCrime.category)] ?? "#0d7ff2"}20`,
                    color:
                      CRIME_COLORS[
                        getCanonicalCategory(selectedCrime.category)
                      ] ?? "#0d7ff2",
                  }}
                >
                  {selectedCrime.category}
                </span>
                {selectedCrime.description && (
                  <p className="text-slate-400 text-xs flex-1 line-clamp-2">
                    {selectedCrime.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
