import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FaCrosshairs, FaSearch, FaSpinner } from "react-icons/fa";

// Leaflet's default marker icon paths break under Vite's bundling (they
// reference image URLs relative to the package that don't resolve) unless
// re-pointed at the bundled asset URLs explicitly.
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [20.5937, 78.9629]; // India, roughly centered
const DEFAULT_ZOOM = 5;

function buildGoogleMapsLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/**
 * Free (no API key, no billing) location picker built on Leaflet +
 * OpenStreetMap tiles. Search uses Nominatim's free geocoding API.
 * Reports { lat, lng, google_maps_link } via onChange — the parent form
 * just stores google_maps_link exactly as it always has.
 */
export default function LocationPicker({ value, onChange }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState(value?.address || "");
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const reverseGeocodeSeq = useRef(0);

  const reverseGeocode = async (lat, lng) => {
    const seq = ++reverseGeocodeSeq.current; // ignore stale responses if the pin moves again mid-request
    setIsResolvingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`
      );
      const data = await res.json();
      if (seq !== reverseGeocodeSeq.current) return;
      const address = data?.display_name || "";
      setResolvedAddress(address);
      onChange({ lat, lng, google_maps_link: buildGoogleMapsLink(lat, lng), address });
    } catch {
      if (seq !== reverseGeocodeSeq.current) return;
      setResolvedAddress("");
    } finally {
      if (seq === reverseGeocodeSeq.current) setIsResolvingAddress(false);
    }
  };

  const setPin = (lat, lng, zoom) => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const pos = markerRef.current.getLatLng();
        onChange({ lat: pos.lat, lng: pos.lng, google_maps_link: buildGoogleMapsLink(pos.lat, pos.lng) });
        reverseGeocode(pos.lat, pos.lng);
      });
    }

    map.setView([lat, lng], zoom ?? map.getZoom());
    onChange({ lat, lng, google_maps_link: buildGoogleMapsLink(lat, lng) });
    reverseGeocode(lat, lng);
  };

  useEffect(() => {
    if (mapRef.current) return;

    const hasInitial = value?.lat != null && value?.lng != null;
    const map = L.map(mapContainerRef.current).setView(
      hasInitial ? [value.lat, value.lng] : DEFAULT_CENTER,
      hasInitial ? 16 : DEFAULT_ZOOM
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (e) => setPin(e.latlng.lat, e.latlng.lng));

    mapRef.current = map;
    if (hasInitial) setPin(value.lat, value.lng, 16);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setStatusError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery)}`
      );
      const results = await res.json();
      if (!results.length) {
        setStatusError("No matching location found — try a more specific address, or click the map directly.");
        return;
      }
      setPin(parseFloat(results[0].lat), parseFloat(results[0].lon), 16);
    } catch {
      setStatusError("Search failed — check your connection and try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatusError("Your browser doesn't support location detection.");
      return;
    }
    setIsLocating(true);
    setStatusError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPin(pos.coords.latitude, pos.coords.longitude, 17);
        setIsLocating(false);
      },
      () => {
        setStatusError("Couldn't get your location — check your browser's location permission.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch(e);
            }}
            placeholder="Search an address, then fine-tune by dragging the pin..."
            className="flex-1 border border-line rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-ink bg-white"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="inline-flex items-center justify-center border border-line hover:border-ink text-ink-soft px-4 py-2.5 rounded-lg transition disabled:opacity-60"
          >
            {isSearching ? <FaSpinner className="animate-spin text-xs" /> : <FaSearch className="text-xs" />}
          </button>
        </div>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          title="Use my current location"
          className="inline-flex items-center gap-2 bg-ink hover:bg-accent-hover text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition disabled:opacity-60 whitespace-nowrap"
        >
          {isLocating ? <FaSpinner className="animate-spin text-xs" /> : <FaCrosshairs className="text-xs" />}
          <span className="hidden sm:inline">My location</span>
        </button>
      </div>

      {statusError && <p className="text-xs text-red-600">{statusError}</p>}

      <div ref={mapContainerRef} className="h-72 rounded-lg border-2 border-ink overflow-hidden" />

      {value?.lat != null && value?.lng != null ? (
        <div className="rounded-lg border border-line-soft bg-surface px-3.5 py-2.5">
          <p className="text-xs font-semibold text-ink flex items-center gap-1.5">
            {isResolvingAddress && <FaSpinner className="animate-spin text-[10px]" />}
            {resolvedAddress || "Looking up address..."}
          </p>
          <p className="text-[11px] text-faint mt-1">
            {value.lat.toFixed(6)}, {value.lng.toFixed(6)} — drag the marker or click elsewhere to adjust.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted">
          Search an address, tap "My location", or click anywhere on the map to drop a pin.
        </p>
      )}
    </div>
  );
}
