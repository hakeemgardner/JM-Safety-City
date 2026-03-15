import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import mapboxgl from "mapbox-gl";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

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

function minutesAgo(m: number) {
  const d = new Date(Date.now() - m * 60 * 1000);
  const reported_date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const reported_time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { reported_date, reported_time };
}
function hoursAgo(h: number) {
  const d = new Date(Date.now() - h * 60 * 60 * 1000);
  const reported_date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const reported_time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { reported_date, reported_time };
}

/** Mock incident data */
const CRIME_DATA: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7936, 18.0179] },
      properties: {
        category: "theft",
        description: "Robbery at store.",
        ...minutesAgo(12),
        address: "King Street, Downtown, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7855, 18.0127] },
      properties: {
        category: "assault",
        description: "Physical altercation.",
        ...minutesAgo(35),
        address: "East Queen Street, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8012, 18.0245] },
      properties: {
        category: "suspicious",
        description: "Person acting suspiciously.",
        ...hoursAgo(1),
        address: "Half Way Tree, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7678, 18.0083] },
      properties: {
        category: "vandalism",
        description: "Vehicle break-in.",
        ...hoursAgo(2),
        address: "Windward Road, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8105, 18.0155] },
      properties: {
        category: "theft",
        description: "Shoplifting incident.",
        ...minutesAgo(45),
        address: "Constant Spring Road, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7745, 18.0215] },
      properties: {
        category: "traffic",
        description: "Hit and run.",
        ...hoursAgo(3),
        address: "Mountain View Ave, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.798, 18.0098] },
      properties: {
        category: "suspicious",
        description: "Loitering.",
        ...minutesAgo(20),
        address: "Parade, Downtown Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.752, 18.0042] },
      properties: {
        category: "assault",
        description: "Altercation.",
        ...minutesAgo(90),
        address: "Harbour View, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.815, 18.032] },
      properties: {
        category: "vandalism",
        description: "Graffiti on wall.",
        ...hoursAgo(5),
        address: "Liguanea, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.763, 18.017] },
      properties: {
        category: "theft",
        description: "Phone snatched.",
        ...hoursAgo(4),
        address: "Rockfort, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.789, 18.029] },
      properties: {
        category: "suspicious",
        description: "Suspicious vehicle circling.",
        ...minutesAgo(25),
        address: "New Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.821, 18.041] },
      properties: {
        category: "traffic",
        description: "Reckless driving.",
        ...minutesAgo(50),
        address: "Barbican Road, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7948, 18.0135] },
      properties: {
        category: "theft",
        description: "Armed robbery.",
        ...minutesAgo(8),
        address: "Orange Street, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7802, 18.0198] },
      properties: {
        category: "assault",
        description: "Stabbing incident.",
        ...hoursAgo(1),
        address: "Slipe Road, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8065, 18.0278] },
      properties: {
        category: "theft",
        description: "Carjacking.",
        ...minutesAgo(18),
        address: "Hope Road, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.771, 18.0055] },
      properties: {
        category: "suspicious",
        description: "Armed men spotted.",
        ...minutesAgo(10),
        address: "Franklyn Town, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7995, 18.0202] },
      properties: {
        category: "vandalism",
        description: "Store window smashed.",
        ...hoursAgo(2),
        address: "Crossroads, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8132, 18.0188] },
      properties: {
        category: "traffic",
        description: "Motorcycle collision.",
        ...minutesAgo(40),
        address: "Hagley Park Rd, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.758, 18.012] },
      properties: {
        category: "assault",
        description: "Domestic dispute.",
        ...hoursAgo(3),
        address: "Bull Bay Road, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.787, 18.0065] },
      properties: {
        category: "theft",
        description: "Bag snatching.",
        ...minutesAgo(30),
        address: "Victoria Pier, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8028, 18.035] },
      properties: {
        category: "suspicious",
        description: "Break-in attempt.",
        ...minutesAgo(55),
        address: "Mona Heights, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7755, 18.031] },
      properties: {
        category: "vandalism",
        description: "Car vandalized.",
        ...hoursAgo(4),
        address: "Papine, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.792, 18.0225] },
      properties: {
        category: "traffic",
        description: "Pedestrian struck.",
        ...minutesAgo(90),
        address: "Torrington Bridge, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.818, 18.0095] },
      properties: {
        category: "theft",
        description: "Home invasion.",
        ...hoursAgo(2),
        address: "Washington Blvd, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7685, 18.0255] },
      properties: {
        category: "suspicious",
        description: "Gunshots heard.",
        ...minutesAgo(5),
        address: "August Town, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8045, 18.0115] },
      properties: {
        category: "assault",
        description: "Mugging.",
        ...minutesAgo(22),
        address: "Spanish Town Road, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.783, 18.038] },
      properties: {
        category: "vandalism",
        description: "Fence damaged.",
        ...hoursAgo(6),
        address: "Gordon Town Road, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.796, 18.031] },
      properties: {
        category: "traffic",
        description: "Bus accident.",
        ...hoursAgo(1),
        address: "Old Hope Road, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.755, 18.0185] },
      properties: {
        category: "theft",
        description: "Pickpocket.",
        ...hoursAgo(3),
        address: "Rockfort Mineral Bath, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8095, 18.038] },
      properties: {
        category: "suspicious",
        description: "Trespassing.",
        ...hoursAgo(1),
        address: "Stony Hill Road, Kingston",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.788, 18.014] },
      properties: {
        category: "other",
        description: "Unusual noise and activity.",
        ...minutesAgo(15),
        address: "Downtown Kingston",
      },
    },
  ],
};

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
  useEffect(() => {
    document.title = "Live Crime Map — G.R.I.D | Kingston, Jamaica";
  }, []);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const geolocate = useRef<mapboxgl.GeolocateControl | null>(null);
  const personMarker = useRef<mapboxgl.Marker | null>(null);
  const crimeMarkers = useRef<
    { marker: mapboxgl.Marker; category: string; el: HTMLElement }[]
  >([]);
  const [panelOpen, setPanelOpen] = useState(false);
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

  // --- NEW API STATE VARIABLES ---
  const [areaRisk, setAreaRisk] = useState<string | null>(null);

  // ADD THESE TWO LINES:
  const [riskFactors, setRiskFactors] = useState<string[]>([]); // Stores the "Why"
  const [showRiskDetails, setShowRiskDetails] = useState(false); // Controls the dropdown

  const [isCalculatingRisk, setIsCalculatingRisk] = useState(true);

  // --- NEW LIVE API FEED FUNCTION ---
  const fetchRiskForLocation = async (lat: number, lng: number) => {
    setIsCalculatingRisk(true);
    try {
      const now = new Date();
      // Adjust JS Day (0=Sun) to match Pandas DayOfWeek (0=Mon, 6=Sun)
      const jsDay = now.getDay();
      const pandasDay = jsDay === 0 ? 6 : jsDay - 1;

      const payload = {
        DayOfWeek: pandasDay,
        Month: now.getMonth() + 1,
        is_weekend: pandasDay === 5 || pandasDay === 6 ? 1 : 0,

        lat_bin: lat,
        lon_bin: lng,

        crimes_last_7_days: Math.random() * 50,
        crimes_last_30_days: Math.random() * 120,
        crimes_last_90_days: Math.random() * 300,
      };

      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("API Error");

      const data = await response.json();
      setAreaRisk((data.probability_of_crime * 100).toFixed(1) + "%");
    } catch (err) {
      console.error("Failed to fetch risk", err);
      setAreaRisk("N/A");
    } finally {
      setIsCalculatingRisk(false);
    }
  };

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

      // --- TRIGGER API ON GEOLOCATION ---
      fetchRiskForLocation(latitude, longitude);

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
      // --- TRIGGER INITIAL API CALL ---
      fetchRiskForLocation(KINGSTON_CENTER[1], KINGSTON_CENTER[0]);
    });

    // --- TRIGGER API ON MAP DRAG ---
    m.on("moveend", () => {
      const center = m.getCenter();
      fetchRiskForLocation(center.lat, center.lng);
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
      addCrimeLayers(m);
      createCrimeIconMarkers(m);

      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "safecity-popup",
        offset: 12,
      });

      const showPopupForFeature = (e: mapboxgl.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const coords = feature.geometry.coordinates.slice() as [number, number];
        const props = feature.properties as Record<string, string>;
        const { category, description, reported_date, reported_time, address } =
          props;
        const color = CRIME_COLORS[category] ?? "#0d7ff2";
        const title = (address || description || category) ?? "";
        const timeStr = formatTimeAgo(reported_date ?? "", reported_time ?? "");
        m.getCanvas().style.cursor = "pointer";
        popup
          .setLngLat(coords)
          .setHTML(
            `<div style="font-family:Inter,sans-serif;min-width:180px">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                <span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
                <strong style="font-size:13px;color:#f8fafc">${title}</strong>
              </div>
              <div style="font-size:11px;color:#94a3b8">${timeStr}</div>
              ${description ? `<div style="font-size:11px;color:#cbd5e1;margin-top:4px">${description}</div>` : ""}
            </div>`,
          )
          .addTo(m);
      };

      m.on("mouseenter", "crimes-points", showPopupForFeature);
      m.on("mouseenter", "crimes-area", showPopupForFeature);

      m.on("mouseleave", "crimes-points", () => {
        m.getCanvas().style.cursor = "";
        popup.remove();
      });
      m.on("mouseleave", "crimes-area", () => {
        m.getCanvas().style.cursor = "";
        popup.remove();
      });

      m.on("click", "crimes-points", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        setSelectedCrime(feature.properties as Record<string, string>);
      });
      m.on("click", "crimes-area", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;

        // 1. Show the crime info popup (your existing code)
        setSelectedCrime(feature.properties as Record<string, string>);

        // 2. Extract the exact Lat/Lng of the circle they clicked
        if (feature.geometry.type === "Point") {
          const [lng, lat] = feature.geometry.coordinates;

          // 3. Send it to the API!
          fetchRiskForLocation(lat, lng);

          // 4. Auto-open the Risk Factors dropdown in the header so they see the result
          setShowRiskDetails(true);
        }
      });
    });

    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) return;

    const enabledTypes = Object.entries(crimeToggles)
      .filter(([, on]) => on)
      .map(([type]) => type);

    const typeFilter: mapboxgl.FilterSpecification | null =
      enabledTypes.length === 6
        ? null
        : ["in", ["get", "category"], ["literal", enabledTypes]];

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
        showPoints ? "visible" : "none",
      );
      m.setFilter("crimes-area", typeFilter);
    }
    if (m.getLayer("crimes-points")) {
      m.setLayoutProperty(
        "crimes-points",
        "visibility",
        showPoints ? "visible" : "none",
      );
      m.setFilter("crimes-points", typeFilter);
    }
    if (m.getLayer("crimes-pulse")) {
      m.setLayoutProperty(
        "crimes-pulse",
        "visibility",
        showPoints ? "visible" : "none",
      );
      m.setFilter("crimes-pulse", ["literal", false]);
    }

    const zoom = m.getZoom();
    crimeMarkers.current.forEach(({ el, category }) => {
      const visible = zoom >= 15 && crimeToggles[category as CrimeType];
      el.style.display = visible ? "block" : "none";
    });
  }, [crimeToggles, showHeatmap, showPoints]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const styleUrl = MAP_STYLES[mapStyle].url;
    m.setStyle(styleUrl);
    m.once("style.load", () => {
      addCrimeLayers(m);
      createCrimeIconMarkers(m);
      if (show3D) apply3DTerrain(m);
      if (showBuildings) addBuildingsLayer(m);
    });
  }, [mapStyle]);

  useEffect(() => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) return;
    if (show3D) {
      apply3DTerrain(m);
    } else {
      m.setTerrain(null);
      if (m.getLayer("sky-layer")) m.removeLayer("sky-layer");
      m.setPitch(40);
    }
  }, [show3D]);

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

  function createCrimeIconMarkers(m: mapboxgl.Map) {
    crimeMarkers.current.forEach(({ marker }) => marker.remove());
    crimeMarkers.current = [];

    CRIME_DATA.features.forEach((feature) => {
      if (feature.geometry.type !== "Point") return;
      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties as Record<string, string>;
      const cat = props.category ?? "other";
      const color = CRIME_COLORS[cat] ?? "#0d7ff2";
      const icon = CRIME_ICONS[cat] ?? "warning";

      const el = document.createElement("div");
      el.style.cursor = "pointer";
      el.style.display = "none";
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5))">
          <div style="width:32px;height:32px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.5)">
            <span class="material-symbols-outlined" style="font-size:16px;color:white;font-variation-settings:'FILL' 1">${icon}</span>
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${color};margin-top:-1px"></div>
        </div>
      `;

      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([lng, lat])
        .addTo(m);

      crimeMarkers.current.push({ marker, category: cat, el });
    });

    function updateIconVisibility() {
      const zoom = m.getZoom();
      crimeMarkers.current.forEach(({ el, category }) => {
        const visible =
          zoom >= 10 && zoom < 12 && crimeToggles[category as CrimeType];
        el.style.display = visible ? "block" : "none";
      });
    }

    m.on("zoom", updateIconVisibility);
    updateIconVisibility();
  }

  function addCrimeLayers(m: mapboxgl.Map) {
    if (m.getSource("crimes")) return;

    m.addSource("crimes", { type: "geojson", data: CRIME_DATA });

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

    /* Area circles: only when zoomed IN — rough estimate (~4 buildings wide), not precise location */
    m.addLayer({
      id: "crimes-area",
      type: "circle",
      source: "crimes",
      minzoom: 12,
      maxzoom: 18,
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12,
          55,
          15,
          95,
          18,
          150,
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

    /* Precise points: hidden when zoomed in (only rough circles shown); show only when zoomed out for interaction */
    m.addLayer({
      id: "crimes-points",
      type: "circle",
      source: "crimes",
      minzoom: 10,
      maxzoom: 11.99,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 8, 12, 14],
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
        "circle-stroke-color": "rgba(255,255,255,0.4)",
        "circle-opacity": 0.85,
      },
    });

    m.addLayer({
      id: "crimes-pulse",
      type: "circle",
      source: "crimes",
      minzoom: 10,
      maxzoom: 11.99,
      filter: ["literal", false],
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          45,
          13,
          85,
          16,
          150,
        ],
        "circle-color": "transparent",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ef4444",
        "circle-stroke-opacity": 0.25,
      },
    });
  }

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
    CRIME_DATA.features.filter(
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
            <img
              src="/grid-logo.png"
              alt="G.R.I.D Logo"
              className="h-8 w-auto"
            />
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

          {/* --- API BADGE ADDED HERE --- */}
          <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <span className="material-symbols-outlined text-[14px] text-primary">
              my_location
            </span>
            <span className="text-slate-300 font-semibold">
              Area Risk:{" "}
              <span className="text-white ml-1">
                {isCalculatingRisk ? "..." : areaRisk}
              </span>
            </span>
          </div>

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

      <div className="flex-1 relative h-screen">
        <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

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

        {/* Side panel */}
        <div
          className={`absolute top-4 left-16 z-20 w-64 transition-all duration-300 ${panelOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"}`}
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

        {/* Selected crime detail */}
        {selectedCrime && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-md">
            <div className="rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="size-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: `${CRIME_COLORS[selectedCrime.category] ?? "#0d7ff2"}20`,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        color:
                          CRIME_COLORS[selectedCrime.category] ?? "#0d7ff2",
                      }}
                    >
                      {CRIME_ICONS[selectedCrime.category] ?? "warning"}
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
                    background: `${CRIME_COLORS[selectedCrime.category] ?? "#0d7ff2"}20`,
                    color: CRIME_COLORS[selectedCrime.category] ?? "#0d7ff2",
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
