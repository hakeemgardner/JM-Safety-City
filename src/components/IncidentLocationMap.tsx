import { useCallback, useEffect, useRef, useState } from "react";
import Map, {
  Marker,
  GeolocateControl,
  type MapMouseEvent,
  type MapRef,
} from "react-map-gl/mapbox";

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? import.meta.env.VITE_MAPBOX_TOKEN) ?? "";

const MAP_HEIGHT = 520;
const MAP_STYLE = "mapbox://styles/mapbox/light-v11";

export type IncidentLocation = {
  longitude: number;
  latitude: number;
  address?: string;
} | null;

const defaultCenter = { longitude: -73.9897, latitude: 40.7411, zoom: 13 };

type IncidentLocationMapProps = {
  value: IncidentLocation;
  onChange: (location: IncidentLocation) => void;
  className?: string;
};

export function IncidentLocationMap({
  value,
  onChange,
  className = "",
}: IncidentLocationMapProps) {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    longitude: number;
    latitude: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // When map is ready, resize it and observe container so it always fills the panel
  useEffect(() => {
    if (!mapReady) return;
    const el = containerRef.current;
    const map = mapRef.current?.getMap?.();
    if (!el || !map) return;
    map.resize();
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapReady]);

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      const { lngLat } = e;
      onChange({
        longitude: lngLat.lng,
        latitude: lngLat.lat,
      });
    },
    [onChange]
  );

  const handleGeolocate = useCallback(
    (e: GeolocationPosition | { coords?: GeolocationCoordinates; latitude?: number; longitude?: number }) => {
      const lat =
        e.coords?.latitude ?? (e as { latitude?: number }).latitude;
      const lng =
        e.coords?.longitude ?? (e as { longitude?: number }).longitude;
      if (typeof lat !== "number" || typeof lng !== "number") {
        setLocating(false);
        return;
      }
      const location = { longitude: lng, latitude: lat };
      setUserLocation(location);
      onChange(location);
      mapRef.current?.getMap()?.flyTo({
        center: [lng, lat],
        zoom: 15,
        duration: 1000,
      });
      setLocating(false);
    },
    [onChange]
  );

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query || !MAPBOX_TOKEN) return;
    setSearching(true);
    setSearchError(null);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      const feature = data.features?.[0];
      if (!feature?.center?.length) {
        setSearchError("Place not found. Try a different search.");
        return;
      }
      const [lng, lat] = feature.center;
      const placeName = feature.place_name ?? "";
      onChange({ longitude: lng, latitude: lat, address: placeName });
      mapRef.current?.getMap()?.flyTo({
        center: [lng, lat],
        zoom: 15,
        duration: 1000,
      });
    } catch {
      setSearchError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [searchQuery, onChange]);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => handleGeolocate(position),
      () => {
        setLocating(false);
        alert(
          "Unable to get your location. Please allow location access or select a spot on the map."
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    );
  }, [handleGeolocate]);

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ${className}`}
        style={{ minHeight: MAP_HEIGHT }}
      >
        <span className="material-symbols-outlined text-4xl mb-2">map</span>
        <p className="font-medium text-center px-4">
          Add{" "}
          <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">
            VITE_MAPBOX_ACCESS_TOKEN
          </code>{" "}
          to your{" "}
          <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">
            .env
          </code>{" "}
          to enable the map.
        </p>
        <p className="text-sm mt-2 text-center px-4">
          Get a free token at{" "}
          <a
            href="https://account.mapbox.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            mapbox.com
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col w-full min-w-0 ${className}`}>
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 w-full min-w-0"
        style={{ minHeight: MAP_HEIGHT, width: "100%" }}
      >
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={MAP_STYLE}
          initialViewState={defaultCenter}
          onClick={handleMapClick}
          onLoad={() => setMapReady(true)}
          style={{ width: "100%", height: MAP_HEIGHT, minWidth: 0 }}
          cursor={value ? "pointer" : "crosshair"}
        >
          {userLocation && (
            <Marker
              longitude={userLocation.longitude}
              latitude={userLocation.latitude}
              anchor="center"
            >
              <div
                className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md"
                title="You are here"
              />
            </Marker>
          )}
          {value && (
            <Marker
              longitude={value.longitude}
              latitude={value.latitude}
              anchor="bottom"
              draggable
              onDragEnd={(e) => {
                const { lng, lat } = e.target.getLngLat();
                onChange({ longitude: lng, latitude: lat });
              }}
            >
              <span className="material-symbols-outlined text-primary text-4xl drop-shadow-lg">
                location_on
              </span>
            </Marker>
          )}
          <GeolocateControl
            position="top-right"
            trackUserLocation={true}
            showAccuracyCircle={false}
            positionOptions={{
              enableHighAccuracy: true,
              maximumAge: 0,
              timeout: 15000,
            }}
            onGeolocate={handleGeolocate}
            onError={() => setLocating(false)}
          />
        </Map>
        <div className="absolute top-3 left-3 right-3 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search address or place..."
            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="rounded-lg bg-primary text-white px-3 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-lg">search</span>
            Search
          </button>
        </div>
        {searchError && (
          <p className="absolute top-14 left-3 right-3 text-xs text-red-600 dark:text-red-400 bg-white/95 dark:bg-slate-800/95 px-2 py-1 rounded shadow">
            {searchError}
          </p>
        )}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-primary text-lg">
            {locating ? "hourglass_empty" : "my_location"}
          </span>
          {locating ? "Locating…" : "Use current location"}
        </button>
      </div>
    </div>
  );
}

export default IncidentLocationMap;
