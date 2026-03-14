import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

interface LocationMapProps {
  lng?: number;
  lat?: number;
  zoom?: number;
  draggable?: boolean;
  onLocationChange?: (lng: number, lat: number, address: string) => void;
}

export default function LocationMap({
  lng = -76.7936,
  lat = 18.0179,
  zoom = 15,
  draggable = true,
  onLocationChange,
}: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [address, setAddress] = useState("King Street, Downtown Kingston, Jamaica");
  const [coords, setCoords] = useState({ lat, lng });

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [lng, lat],
      zoom,
    });

    const m = map.current;

    marker.current = new mapboxgl.Marker({
      color: "#0d7ff2",
      draggable,
    })
      .setLngLat([lng, lat])
      .addTo(m);

    if (draggable) {
      marker.current.on("dragend", () => {
        const lngLat = marker.current!.getLngLat();
        setCoords({ lat: lngLat.lat, lng: lngLat.lng });
        reverseGeocode(lngLat.lng, lngLat.lat);
      });
    }

    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  async function reverseGeocode(longitude: number, latitude: number) {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}`
      );
      const data = await res.json();
      const place = data.features?.[0]?.place_name ?? "Unknown location";
      setAddress(place);
      onLocationChange?.(longitude, latitude, place);
    } catch {
      setAddress("Unable to fetch address");
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={mapContainer} className="flex-1 min-h-0" />
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
        <p className="text-sm font-medium truncate">{address}</p>
        <p className="text-xs text-slate-500 mt-1">
          Coordinates: {coords.lat.toFixed(4)}° N, {Math.abs(coords.lng).toFixed(4)}° W
        </p>
      </div>
    </div>
  );
}
