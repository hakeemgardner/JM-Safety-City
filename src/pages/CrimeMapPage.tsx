import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import mapboxgl from "mapbox-gl";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

const JAMAICA_CENTER: [number, number] = [-73.7934, 40.7025];

const JAMAICA_BOUNDS: [[number, number], [number, number]] = [
  [-73.87, 40.64],
  [-73.72, 40.76],
];

const CRIME_DATA: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.7918, 40.7028] },
      properties: { type: "theft", title: "Robbery — Jamaica Ave", time: "12 mins ago", severity: "high" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.8012, 40.7005] },
      properties: { type: "assault", title: "Assault near Sutphin Blvd", time: "35 mins ago", severity: "high" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.7856, 40.6983] },
      properties: { type: "suspicious", title: "Suspicious Person — 160th St", time: "1 hr ago", severity: "medium" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.7762, 40.7079] },
      properties: { type: "vandalism", title: "Vehicle Break-in — Hillside Ave", time: "2 hrs ago", severity: "medium" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.8058, 40.6912] },
      properties: { type: "theft", title: "Shoplifting — South Jamaica", time: "45 mins ago", severity: "low" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.7693, 40.7115] },
      properties: { type: "traffic", title: "Hit & Run — Braddock Ave", time: "3 hrs ago", severity: "high" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.7945, 40.7091] },
      properties: { type: "suspicious", title: "Loitering — Archer Ave Station", time: "20 mins ago", severity: "low" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.7835, 40.6945] },
      properties: { type: "assault", title: "Altercation — Guy Brewer Blvd", time: "1.5 hrs ago", severity: "medium" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.7988, 40.7055] },
      properties: { type: "vandalism", title: "Graffiti — Parsons Blvd", time: "5 hrs ago", severity: "low" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.7715, 40.7001] },
      properties: { type: "theft", title: "Package Theft — 179th St", time: "4 hrs ago", severity: "medium" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.8101, 40.6958] },
      properties: { type: "suspicious", title: "Suspicious Vehicle — Liberty Ave", time: "25 mins ago", severity: "medium" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.7878, 40.7148] },
      properties: { type: "traffic", title: "Reckless Driving — Hillside Ave", time: "50 mins ago", severity: "low" },
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

type FilterType = "all" | "theft" | "suspicious" | "vandalism" | "assault" | "traffic";

export default function CrimeMapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"pending" | "granted" | "denied">("pending");
  const [selectedCrime, setSelectedCrime] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: JAMAICA_CENTER,
      zoom: 14,
      minZoom: 12,
      maxZoom: 18,
      pitch: 40,
      antialias: true,
    });

    const m = map.current;

    m.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    m.addControl(new mapboxgl.ScaleControl(), "bottom-left");

    m.on("moveend", () => {
      const center = m.getCenter();
      const [swLng, swLat] = JAMAICA_BOUNDS[0];
      const [neLng, neLat] = JAMAICA_BOUNDS[1];
      if (
        center.lng < swLng ||
        center.lng > neLng ||
        center.lat < swLat ||
        center.lat > neLat
      ) {
        m.flyTo({ center: JAMAICA_CENTER, zoom: 14, duration: 800 });
      }
    });

    m.on("load", () => {
      m.addSource("crimes", {
        type: "geojson",
        data: CRIME_DATA,
      });

      m.addLayer({
        id: "crimes-heat",
        type: "heatmap",
        source: "crimes",
        paint: {
          "heatmap-weight": [
            "match",
            ["get", "severity"],
            "high", 1,
            "medium", 0.6,
            "low", 0.3,
            0.5,
          ],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 13, 1, 17, 3],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.15, "rgba(13,127,242,0.2)",
            0.35, "rgba(249,115,22,0.4)",
            0.55, "rgba(239,68,68,0.6)",
            0.75, "rgba(220,38,38,0.8)",
            1, "rgba(185,28,28,1)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 13, 40, 17, 60],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.7, 17, 0.25],
        },
      });

      m.addLayer({
        id: "crimes-points",
        type: "circle",
        source: "crimes",
        minzoom: 13.5,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 6, 17, 12],
          "circle-color": [
            "match",
            ["get", "type"],
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

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setLocationStatus("granted");

          if (m) {
            const el = document.createElement("div");
            el.className = "user-location-marker";
            el.innerHTML = `
              <div style="width:18px;height:18px;background:#0d7ff2;border:3px solid white;border-radius:50%;box-shadow:0 0 12px rgba(13,127,242,0.6)"></div>
              <div style="position:absolute;inset:-8px;border:2px solid rgba(13,127,242,0.3);border-radius:50%;animation:pulse 2s infinite"></div>
            `;
            el.style.position = "relative";

            userMarker.current = new mapboxgl.Marker({ element: el })
              .setLngLat([longitude, latitude])
              .setPopup(new mapboxgl.Popup({ offset: 15 }).setHTML(
                `<div style="font-family:Inter,sans-serif;padding:4px 0">
                  <strong style="font-size:13px;color:#0d7ff2">Your Location</strong><br/>
                  <span style="font-size:11px;color:#94a3b8">${latitude.toFixed(4)}°N, ${Math.abs(longitude).toFixed(4)}°W</span>
                </div>`
              ))
              .addTo(m);
          }
        },
        () => {
          setLocationStatus("denied");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;
    const m = map.current;

    if (activeFilter === "all") {
      m.setFilter("crimes-points", null);
      m.setFilter("crimes-heat", null);
      m.setFilter("crimes-pulse", ["==", ["get", "severity"], "high"]);
    } else {
      m.setFilter("crimes-points", ["==", ["get", "type"], activeFilter]);
      m.setFilter("crimes-heat", ["==", ["get", "type"], activeFilter]);
      m.setFilter("crimes-pulse", [
        "all",
        ["==", ["get", "type"], activeFilter],
        ["==", ["get", "severity"], "high"],
      ]);
    }
  }, [activeFilter]);

  function flyToUser() {
    if (userLocation && map.current) {
      map.current.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 16 });
    }
  }

  const filters: { key: FilterType; label: string; color: string }[] = [
    { key: "all", label: "All Crimes", color: "#0d7ff2" },
    { key: "theft", label: "Theft", color: CRIME_COLORS.theft },
    { key: "assault", label: "Assault", color: CRIME_COLORS.assault },
    { key: "suspicious", label: "Suspicious", color: CRIME_COLORS.suspicious },
    { key: "vandalism", label: "Vandalism", color: CRIME_COLORS.vandalism },
    { key: "traffic", label: "Traffic", color: CRIME_COLORS.traffic },
  ];

  const crimeCount = (type: FilterType) =>
    type === "all"
      ? CRIME_DATA.features.length
      : CRIME_DATA.features.filter((f) => f.properties?.type === type).length;

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
            <span className="text-slate-400 text-sm font-semibold">Jamaica, Queens</span>
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

        {/* Filter bar */}
        <div className="absolute top-4 left-4 right-4 md:right-auto md:left-1/2 md:-translate-x-1/2 z-20">
          <div className="flex items-center gap-2 p-1.5 rounded-xl backdrop-blur-md border border-slate-700/50 overflow-x-auto">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  activeFilter === f.key
                    ? "bg-white/10 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ background: f.color }}
                />
                {f.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeFilter === f.key ? "bg-white/15" : "bg-white/5"
                }`}>
                  {crimeCount(f.key)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* User location button */}
        <div className="absolute bottom-24 right-4 z-20 flex flex-col gap-2">
          <button
            onClick={flyToUser}
            disabled={!userLocation}
            className="size-11 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/50 flex items-center justify-center text-primary hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={userLocation ? "Go to your location" : "Location not available"}
          >
            <span className="material-symbols-outlined text-xl">my_location</span>
          </button>
          <button
            onClick={() => map.current?.flyTo({ center: JAMAICA_CENTER, zoom: 14, pitch: 40 })}
            className="size-11 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/50 flex items-center justify-center text-slate-300 hover:bg-slate-800 transition-colors"
            title="Reset view"
          >
            <span className="material-symbols-outlined text-xl">restart_alt</span>
          </button>
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
