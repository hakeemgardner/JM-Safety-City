import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import mapboxgl from "mapbox-gl";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

const KINGSTON_CENTER: [number, number] = [-76.7936, 18.0179];

const KINGSTON_BOUNDS: [[number, number], [number, number]] = [
  [-76.92, 17.92],
  [-76.68, 18.12],
];

const CRIME_DATA: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7936, 18.0179] },
      properties: { type: "theft", title: "Robbery — King Street, Downtown", time: "12 mins ago", severity: "high" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7855, 18.0127] },
      properties: { type: "assault", title: "Assault — East Queen Street", time: "35 mins ago", severity: "high" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8012, 18.0245] },
      properties: { type: "suspicious", title: "Suspicious Person — Half Way Tree", time: "1 hr ago", severity: "medium" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7678, 18.0083] },
      properties: { type: "vandalism", title: "Vehicle Break-in — Windward Road", time: "2 hrs ago", severity: "medium" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8105, 18.0155] },
      properties: { type: "theft", title: "Shoplifting — Constant Spring Road", time: "45 mins ago", severity: "low" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7745, 18.0215] },
      properties: { type: "traffic", title: "Hit & Run — Mountain View Ave", time: "3 hrs ago", severity: "high" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7980, 18.0098] },
      properties: { type: "suspicious", title: "Loitering — Parade, Downtown", time: "20 mins ago", severity: "low" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7520, 18.0042] },
      properties: { type: "assault", title: "Altercation — Harbour View", time: "1.5 hrs ago", severity: "medium" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8150, 18.0320] },
      properties: { type: "vandalism", title: "Graffiti — Liguanea", time: "5 hrs ago", severity: "low" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7630, 18.0170] },
      properties: { type: "theft", title: "Phone Snatching — Rockfort", time: "4 hrs ago", severity: "medium" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7890, 18.0290] },
      properties: { type: "suspicious", title: "Suspicious Vehicle — New Kingston", time: "25 mins ago", severity: "medium" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8210, 18.0410] },
      properties: { type: "traffic", title: "Reckless Driving — Barbican Road", time: "50 mins ago", severity: "low" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7948, 18.0135] },
      properties: { type: "theft", title: "Armed Robbery — Orange Street", time: "8 mins ago", severity: "high" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7802, 18.0198] },
      properties: { type: "assault", title: "Stabbing — Slipe Road", time: "1 hr ago", severity: "high" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8065, 18.0278] },
      properties: { type: "theft", title: "Carjacking — Hope Road", time: "18 mins ago", severity: "high" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7710, 18.0055] },
      properties: { type: "suspicious", title: "Armed Men Spotted — Franklyn Town", time: "10 mins ago", severity: "high" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7995, 18.0202] },
      properties: { type: "vandalism", title: "Store Window Smashed — Crossroads", time: "2 hrs ago", severity: "medium" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8132, 18.0188] },
      properties: { type: "traffic", title: "Motorcycle Collision — Hagley Park Rd", time: "40 mins ago", severity: "medium" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7580, 18.0120] },
      properties: { type: "assault", title: "Domestic Dispute — Bull Bay Road", time: "3 hrs ago", severity: "medium" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7870, 18.0065] },
      properties: { type: "theft", title: "Bag Snatching — Victoria Pier", time: "30 mins ago", severity: "medium" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8028, 18.0350] },
      properties: { type: "suspicious", title: "Break-in Attempt — Mona Heights", time: "55 mins ago", severity: "medium" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7755, 18.0310] },
      properties: { type: "vandalism", title: "Car Vandalized — Papine", time: "4 hrs ago", severity: "low" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7920, 18.0225] },
      properties: { type: "traffic", title: "Pedestrian Struck — Torrington Bridge", time: "1.5 hrs ago", severity: "high" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8180, 18.0095] },
      properties: { type: "theft", title: "Home Invasion — Washington Blvd", time: "2 hrs ago", severity: "high" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7685, 18.0255] },
      properties: { type: "suspicious", title: "Gunshots Heard — August Town", time: "5 mins ago", severity: "high" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8045, 18.0115] },
      properties: { type: "assault", title: "Mugging — Spanish Town Road", time: "22 mins ago", severity: "high" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7830, 18.0380] },
      properties: { type: "vandalism", title: "Fence Damaged — Gordon Town Road", time: "6 hrs ago", severity: "low" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7960, 18.0310] },
      properties: { type: "traffic", title: "Bus Accident — Old Hope Road", time: "1 hr ago", severity: "medium" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7550, 18.0185] },
      properties: { type: "theft", title: "Pickpocket — Rockfort Mineral Bath", time: "3 hrs ago", severity: "low" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8095, 18.0380] },
      properties: { type: "suspicious", title: "Trespassing — Stony Hill Road", time: "1 hr ago", severity: "low" },
    },
  ],
};

const CRIME_COLORS: Record<string, string> = {
  theft: "#ef4444",
  suspicious: "#f97316",
  vandalism: "#eab308",
  assault: "#dc2626",
  traffic: "#3b82f6",
};

const CRIME_ICONS: Record<string, string> = {
  theft: "local_police",
  suspicious: "visibility",
  vandalism: "broken_image",
  assault: "emergency",
  traffic: "directions_car",
};

type CrimeType = "theft" | "suspicious" | "vandalism" | "assault" | "traffic";

type MapStyleKey = "dark" | "streets" | "satellite";

const MAP_STYLES: Record<MapStyleKey, { label: string; icon: string; url: string }> = {
  dark: { label: "Dark", icon: "dark_mode", url: "mapbox://styles/mapbox/dark-v11" },
  streets: { label: "Streets", icon: "map", url: "mapbox://styles/mapbox/streets-v12" },
  satellite: { label: "Satellite", icon: "satellite_alt", url: "mapbox://styles/mapbox/satellite-streets-v12" },
};

export default function CrimeMapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const geolocate = useRef<mapboxgl.GeolocateControl | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("dark");
  const [crimeToggles, setCrimeToggles] = useState<Record<CrimeType, boolean>>({
    theft: true, suspicious: true, vandalism: true, assault: true, traffic: true,
  });
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [show3D, setShow3D] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"pending" | "granted" | "denied">("pending");
  const [selectedCrime, setSelectedCrime] = useState<Record<string, string> | null>(null);

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

    geolocate.current.on("geolocate", (e: GeolocationPosition) => {
      const { latitude, longitude } = e.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      setLocationStatus("granted");
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
      addCrimeLayers(m);

      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "safecity-popup",
        offset: 12,
      });

      m.on("mouseenter", "crimes-points", (e) => {
        m.getCanvas().style.cursor = "pointer";
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const coords = feature.geometry.coordinates.slice() as [number, number];
        const { title, time, type, severity } = feature.properties as Record<string, string>;
        const color = CRIME_COLORS[type] ?? "#0d7ff2";

        popup
          .setLngLat(coords)
          .setHTML(
            `<div style="font-family:Inter,sans-serif;min-width:180px">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                <span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
                <strong style="font-size:13px;color:#f8fafc">${title}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:11px;color:#94a3b8">${time}</span>
                <span style="font-size:10px;padding:2px 8px;border-radius:99px;background:${
                  severity === "high" ? "rgba(239,68,68,0.2)" : severity === "medium" ? "rgba(249,115,22,0.2)" : "rgba(34,197,94,0.2)"
                };color:${
                  severity === "high" ? "#ef4444" : severity === "medium" ? "#f97316" : "#22c55e"
                };font-weight:700;text-transform:uppercase">${severity}</span>
              </div>
            </div>`
          )
          .addTo(m);
      });

      m.on("mouseleave", "crimes-points", () => {
        m.getCanvas().style.cursor = "";
        popup.remove();
      });

      m.on("click", "crimes-points", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        setSelectedCrime(feature.properties as Record<string, string>);
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
      enabledTypes.length === 5
        ? null
        : ["in", ["get", "type"], ["literal", enabledTypes]];

    if (m.getLayer("crimes-heat")) {
      m.setLayoutProperty("crimes-heat", "visibility", showHeatmap ? "visible" : "none");
      m.setFilter("crimes-heat", typeFilter);
    }
    if (m.getLayer("crimes-points")) {
      m.setLayoutProperty("crimes-points", "visibility", showPoints ? "visible" : "none");
      m.setFilter("crimes-points", typeFilter);
    }
    if (m.getLayer("crimes-pulse")) {
      m.setLayoutProperty("crimes-pulse", "visibility", showPoints ? "visible" : "none");
      m.setFilter("crimes-pulse", enabledTypes.length === 5
        ? ["==", ["get", "severity"], "high"]
        : ["all", ["in", ["get", "type"], ["literal", enabledTypes]], ["==", ["get", "severity"], "high"]]);
    }
  }, [crimeToggles, showHeatmap, showPoints]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const styleUrl = MAP_STYLES[mapStyle].url;
    m.setStyle(styleUrl);
    m.once("style.load", () => {
      addCrimeLayers(m);
      if (show3D) apply3DTerrain(m);
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

  function addCrimeLayers(m: mapboxgl.Map) {
    if (m.getSource("crimes")) return;

    m.addSource("crimes", { type: "geojson", data: CRIME_DATA });

    m.addLayer({
      id: "crimes-heat",
      type: "heatmap",
      source: "crimes",
      paint: {
        "heatmap-weight": ["match", ["get", "severity"], "high", 1, "medium", 0.6, "low", 0.3, 0.5],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 13, 1, 17, 3],
        "heatmap-color": [
          "interpolate", ["linear"], ["heatmap-density"],
          0, "rgba(0,0,0,0)",
          0.15, "rgba(13,127,242,0.2)",
          0.35, "rgba(249,115,22,0.4)",
          0.55, "rgba(239,68,68,0.6)",
          0.75, "rgba(220,38,38,0.8)",
          1, "rgba(185,28,28,1)",
        ],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 50, 13, 70, 17, 100],
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.7, 17, 0.25],
      },
    });

    m.addLayer({
      id: "crimes-points",
      type: "circle",
      source: "crimes",
      minzoom: 13.5,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 10, 17, 18],
        "circle-color": [
          "match", ["get", "type"],
          "theft", CRIME_COLORS.theft,
          "suspicious", CRIME_COLORS.suspicious,
          "vandalism", CRIME_COLORS.vandalism,
          "assault", CRIME_COLORS.assault,
          "traffic", CRIME_COLORS.traffic,
          "#0d7ff2",
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "rgba(255,255,255,0.3)",
        "circle-opacity": ["interpolate", ["linear"], ["zoom"], 13.5, 0, 14.5, 1],
      },
    });

    m.addLayer({
      id: "crimes-pulse",
      type: "circle",
      source: "crimes",
      minzoom: 13.5,
      filter: ["==", ["get", "severity"], "high"],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 14, 17, 22],
        "circle-color": "transparent",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ef4444",
        "circle-stroke-opacity": 0.4,
      },
    });
  }

  function toggleCrimeType(type: CrimeType) {
    setCrimeToggles((prev) => ({ ...prev, [type]: !prev[type] }));
  }

  const crimeTypes: { key: CrimeType; label: string; icon: string; color: string }[] = [
    { key: "theft", label: "Theft", icon: "local_police", color: CRIME_COLORS.theft },
    { key: "assault", label: "Assault", icon: "emergency", color: CRIME_COLORS.assault },
    { key: "suspicious", label: "Suspicious", icon: "visibility", color: CRIME_COLORS.suspicious },
    { key: "vandalism", label: "Vandalism", icon: "broken_image", color: CRIME_COLORS.vandalism },
    { key: "traffic", label: "Traffic", icon: "directions_car", color: CRIME_COLORS.traffic },
  ];

  const crimeCount = (type: CrimeType) =>
    CRIME_DATA.features.filter((f) => f.properties?.type === type).length;

  return (
    <div className="flex flex-col bg-background-dark overflow-hidden" style={{ height: "100dvh", width: "100vw" }}>
      <header className="flex items-center justify-between px-6 py-3 bg-background-dark/90 backdrop-blur-md border-b border-slate-800 z-30 shrink-0">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 text-primary">
            <span
              className="material-symbols-outlined text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shield_with_heart
            </span>
            <h2 className="text-white text-lg font-black tracking-tight">SafeCity</h2>
          </Link>
          <div className="hidden md:flex items-center gap-1 ml-4">
            <span className="material-symbols-outlined text-primary text-lg">location_on</span>
            <span className="text-slate-400 text-sm font-semibold">Kingston, Jamaica</span>
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
        <div className={`absolute top-4 left-16 z-20 w-64 transition-all duration-300 ${panelOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"}`}>
          <div className="rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/50 overflow-hidden shadow-2xl">
            {/* Map Style */}
            <div className="p-4 border-b border-slate-700/50">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Map Style</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(MAP_STYLES) as [MapStyleKey, typeof MAP_STYLES[MapStyleKey]][]).map(([key, style]) => (
                  <button
                    key={key}
                    onClick={() => setMapStyle(key)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg text-xs font-semibold transition-all ${
                      mapStyle === key
                        ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{style.icon}</span>
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Layers */}
            <div className="p-4 border-b border-slate-700/50">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Layers</p>
              <div className="space-y-2">
                <button
                  onClick={() => setShowHeatmap((v) => !v)}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    showHeatmap ? "bg-white/10 text-white" : "text-slate-500 hover:bg-white/5"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">thermostat</span>
                  Heatmap
                  <span className={`ml-auto size-4 rounded border-2 flex items-center justify-center transition-colors ${
                    showHeatmap ? "bg-primary border-primary" : "border-slate-600"
                  }`}>
                    {showHeatmap && <span className="material-symbols-outlined text-[10px] text-white">check</span>}
                  </span>
                </button>
                <button
                  onClick={() => setShowPoints((v) => !v)}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    showPoints ? "bg-white/10 text-white" : "text-slate-500 hover:bg-white/5"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">location_on</span>
                  Crime Points
                  <span className={`ml-auto size-4 rounded border-2 flex items-center justify-center transition-colors ${
                    showPoints ? "bg-primary border-primary" : "border-slate-600"
                  }`}>
                    {showPoints && <span className="material-symbols-outlined text-[10px] text-white">check</span>}
                  </span>
                </button>
                <button
                  onClick={() => setShow3D((v) => !v)}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    show3D ? "bg-white/10 text-white" : "text-slate-500 hover:bg-white/5"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">3d_rotation</span>
                  3D Terrain
                  <span className={`ml-auto size-4 rounded border-2 flex items-center justify-center transition-colors ${
                    show3D ? "bg-primary border-primary" : "border-slate-600"
                  }`}>
                    {show3D && <span className="material-symbols-outlined text-[10px] text-white">check</span>}
                  </span>
                </button>
              </div>
            </div>

            {/* Crime Types */}
            <div className="p-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Crime Types</p>
              <div className="space-y-1.5">
                {crimeTypes.map((ct) => (
                  <button
                    key={ct.key}
                    onClick={() => toggleCrimeType(ct.key)}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      crimeToggles[ct.key] ? "bg-white/10 text-white" : "text-slate-500 hover:bg-white/5"
                    }`}
                  >
                    <span
                      className="size-3 rounded-full shrink-0 transition-opacity"
                      style={{ background: ct.color, opacity: crimeToggles[ct.key] ? 1 : 0.3 }}
                    />
                    <span className="material-symbols-outlined text-base" style={{ color: crimeToggles[ct.key] ? ct.color : undefined }}>
                      {ct.icon}
                    </span>
                    {ct.label}
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/5">{crimeCount(ct.key)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Location status */}
        <div className="absolute bottom-4 left-4 z-20">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/50 text-xs">
            <span className={`material-symbols-outlined text-sm ${
              locationStatus === "granted" ? "text-safe-green" : locationStatus === "denied" ? "text-alert-red" : "text-warning-orange"
            }`}>
              {locationStatus === "granted" ? "check_circle" : locationStatus === "denied" ? "cancel" : "pending"}
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
                    style={{ background: `${CRIME_COLORS[selectedCrime.type] ?? "#0d7ff2"}20` }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ color: CRIME_COLORS[selectedCrime.type] ?? "#0d7ff2" }}
                    >
                      {CRIME_ICONS[selectedCrime.type] ?? "warning"}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">{selectedCrime.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{selectedCrime.time}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCrime(null)}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-700/50">
                <span
                  className="text-[10px] px-2 py-1 rounded-full font-bold uppercase"
                  style={{
                    background: `${CRIME_COLORS[selectedCrime.type] ?? "#0d7ff2"}20`,
                    color: CRIME_COLORS[selectedCrime.type] ?? "#0d7ff2",
                  }}
                >
                  {selectedCrime.type}
                </span>
                <span
                  className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                    selectedCrime.severity === "high"
                      ? "bg-alert-red/20 text-alert-red"
                      : selectedCrime.severity === "medium"
                      ? "bg-warning-orange/20 text-warning-orange"
                      : "bg-safe-green/20 text-safe-green"
                  }`}
                >
                  {selectedCrime.severity} severity
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
