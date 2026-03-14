import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

const INCIDENT_DATA: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7936, 18.0179] },
      properties: { type: "theft", title: "Robbery — King Street", time: "2 mins ago" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8012, 18.0245] },
      properties: { type: "suspicious", title: "Suspicious Activity — Half Way Tree", time: "15 mins ago" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7855, 18.0127] },
      properties: { type: "vandalism", title: "Vandalism — East Queen Street", time: "1 hour ago" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7890, 18.0290] },
      properties: { type: "assault", title: "Assault — New Kingston", time: "3 hours ago" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8105, 18.0155] },
      properties: { type: "traffic", title: "Traffic Incident — Constant Spring", time: "30 mins ago" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7520, 18.0042] },
      properties: { type: "suspicious", title: "Suspicious Vehicle — Harbour View", time: "45 mins ago" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7980, 18.0098] },
      properties: { type: "theft", title: "Phone Snatching — Parade", time: "5 mins ago" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8150, 18.0320] },
      properties: { type: "vandalism", title: "Graffiti — Liguanea", time: "2 hours ago" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.7745, 18.0215] },
      properties: { type: "assault", title: "Altercation — Mountain View", time: "4 hours ago" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-76.8210, 18.0410] },
      properties: { type: "traffic", title: "Reckless Driving — Barbican", time: "1 hour ago" },
    },
  ],
};

const INCIDENT_COLORS: Record<string, string> = {
  theft: "#ef4444",
  suspicious: "#f97316",
  vandalism: "#eab308",
  assault: "#dc2626",
  traffic: "#3b82f6",
};

export default function SafetyMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-76.7936, 18.0179],
      zoom: 12.5,
      pitch: 45,
      bearing: -17.6,
      antialias: true,
    });

    const m = map.current;

    m.addControl(new mapboxgl.NavigationControl(), "top-right");
    m.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "top-right"
    );

    m.on("load", () => {
      m.addSource("incidents", {
        type: "geojson",
        data: INCIDENT_DATA,
      });

      m.addLayer({
        id: "incidents-heat",
        type: "heatmap",
        source: "incidents",
        paint: {
          "heatmap-weight": 1,
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 1, 15, 3],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, "rgba(13,127,242,0.3)",
            0.4, "rgba(249,115,22,0.5)",
            0.6, "rgba(239,68,68,0.6)",
            0.8, "rgba(220,38,38,0.8)",
            1, "rgba(220,38,38,1)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 30, 15, 50],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0.8, 16, 0.3],
        },
      });

      m.addLayer({
        id: "incidents-points",
        type: "circle",
        source: "incidents",
        minzoom: 12,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 5, 16, 10],
          "circle-color": [
            "match",
            ["get", "type"],
            "theft", INCIDENT_COLORS.theft,
            "suspicious", INCIDENT_COLORS.suspicious,
            "vandalism", INCIDENT_COLORS.vandalism,
            "assault", INCIDENT_COLORS.assault,
            "traffic", INCIDENT_COLORS.traffic,
            "#0d7ff2",
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.4)",
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0, 13, 0.9],
        },
      });

      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "safecity-popup",
      });

      m.on("mouseenter", "incidents-points", (e) => {
        m.getCanvas().style.cursor = "pointer";
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;

        const coords = feature.geometry.coordinates.slice() as [number, number];
        const { title, time, type } = feature.properties as Record<string, string>;
        const color = INCIDENT_COLORS[type] ?? "#0d7ff2";

        popup
          .setLngLat(coords)
          .setHTML(
            `<div style="font-family:Inter,sans-serif">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block"></span>
                <strong style="font-size:13px">${title}</strong>
              </div>
              <span style="font-size:11px;color:#94a3b8">${time}</span>
            </div>`
          )
          .addTo(m);
      });

      m.on("mouseleave", "incidents-points", () => {
        m.getCanvas().style.cursor = "";
        popup.remove();
      });
    });

    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  return <div ref={mapContainer} className="absolute inset-0" />;
}
