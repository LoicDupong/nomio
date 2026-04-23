'use client';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useTripStore } from '@/store/tripStore';
import { Pin, Category } from '@/types';
import { CATEGORY_LABEL } from '@/lib/categories';
import PinMarker from './PinMarker';
import PinForm from './PinForm';
import styles from './MapView.module.scss';

interface ClickedPosition {
  lat: number;
  lng: number;
}

interface FlyTarget {
  lat: number;
  lng: number;
  zoom?: number;
}

type PinSuggestion = { kind: 'pin'; pin: Pin };
type AddressSuggestion = { kind: 'address'; label: string; lat: number; lng: number };
type Suggestion = PinSuggestion | AddressSuggestion;

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

// Clustering removed: react-leaflet-cluster@4.1.3 breaks Marker eventHandlers.click
// with react-leaflet@4.2.1 — re-evaluate when a compatible version is released.
function MapClickHandler({ onMapClick }: { onMapClick: (pos: ClickedPosition) => void }) {
  useMapEvents({
    click(e) {
      const target = e.originalEvent.target as HTMLElement;
      if (target.closest('.leaflet-marker-icon')) return;
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function MapController({
  flyTarget,
  fitBoundsKey,
  pins,
  userPos,
}: {
  flyTarget: FlyTarget | null;
  fitBoundsKey: number;
  pins: { lat: number; lng: number }[];
  userPos: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!flyTarget) return;
    map.flyTo([flyTarget.lat, flyTarget.lng], flyTarget.zoom ?? 15, { duration: 1 });
  }, [flyTarget, map]);

  useEffect(() => {
    if (!fitBoundsKey) return;
    if (pins.length === 0) {
      map.flyTo([48.8566, 2.3522], 5, { duration: 1 });
      return;
    }
    const bounds = pins.map((p) => [p.lat, p.lng]) as [number, number][];
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
  }, [fitBoundsKey, map]);

  if (!userPos) return null;
  return (
    <CircleMarker
      center={[userPos.lat, userPos.lng]}
      radius={10}
      color="#2563eb"
      fillColor="#ffffff"
      fillOpacity={1}
      weight={3}
    >
      <Popup>You are here</Popup>
    </CircleMarker>
  );
}

export default function MapView({ tripId }: { tripId: string }) {
  const { pins, activeFilters, setSelectedPin, setFocusPinId } = useTripStore();
  const [clickedPos, setClickedPos] = useState<ClickedPosition | null>(null);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [fitBoundsKey, setFitBoundsKey] = useState(0);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const nominatimDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevFocusPinId = useRef<string | null>(null);

  const { focusPinId } = useTripStore();

  const filteredPins =
    activeFilters.length === 0 ? pins : pins.filter((p) => activeFilters.includes(p.category));

  // Fix Leaflet default marker icons in webpack/Next.js
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/leaflet/marker-icon-2x.png',
      iconUrl: '/leaflet/marker-icon.png',
      shadowUrl: '/leaflet/marker-shadow.png',
    });
  }, []);

  // React to sidebar pin selection — fly to that pin
  useEffect(() => {
    if (!focusPinId || focusPinId === prevFocusPinId.current) return;
    prevFocusPinId.current = focusPinId;
    const pin = pins.find((p) => p.id === focusPinId);
    if (pin) setFlyTarget({ lat: pin.lat, lng: pin.lng, zoom: 15 });
  }, [focusPinId, pins]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (nominatimDebounceRef.current) clearTimeout(nominatimDebounceRef.current);
    };
  }, []);

  function handleLocate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos({ lat: latitude, lng: longitude });
        setFlyTarget({ lat: latitude, lng: longitude, zoom: 13 });
      },
      () => {}
    );
  }

  function handleResetView() {
    setFitBoundsKey((k) => k + 1);
  }

  function handleSearchChange(val: string) {
    setSearchQuery(val);
    const q = val.trim();
    if (nominatimDebounceRef.current) clearTimeout(nominatimDebounceRef.current);

    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    const qLower = q.toLowerCase();
    const localMatches: Suggestion[] = pins
      .filter(
        (p) =>
          p.title.toLowerCase().includes(qLower) ||
          p.category.toLowerCase().includes(qLower) ||
          (p.note && p.note.toLowerCase().includes(qLower))
      )
      .slice(0, 2)
      .map((p) => ({ kind: 'pin' as const, pin: p }));

    setSuggestions(localMatches);

    nominatimDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`
        );
        const data: NominatimResult[] = await res.json();
        const remaining = Math.max(0, 3 - localMatches.length);
        const addressMatches: Suggestion[] = data.slice(0, remaining).map((item) => ({
          kind: 'address' as const,
          label: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        }));
        setSuggestions([...localMatches, ...addressMatches]);
      } catch {
        // keep local matches on error
      }
    }, 400);
  }

  function handleSuggestionClick(s: Suggestion) {
    setSuggestions([]);
    if (nominatimDebounceRef.current) clearTimeout(nominatimDebounceRef.current);
    if (s.kind === 'pin') {
      setSearchQuery(s.pin.title);
      setFlyTarget({ lat: s.pin.lat, lng: s.pin.lng, zoom: 15 });
      setSelectedPin(s.pin);
      setFocusPinId(s.pin.id);
    } else {
      setSearchQuery(s.label);
      setFlyTarget({ lat: s.lat, lng: s.lng, zoom: 14 });
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSuggestions([]);
    const q = searchQuery.trim();
    if (!q) return;

    // Check local pins first
    const localMatch = pins.find((p) => p.title.toLowerCase() === q.toLowerCase());
    if (localMatch) {
      setFlyTarget({ lat: localMatch.lat, lng: localMatch.lng, zoom: 15 });
      setSelectedPin(localMatch);
      return;
    }

    // Fallback: Nominatim geocoding
    setSearchLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`
      );
      const data = await res.json();
      if (data[0]) {
        setFlyTarget({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), zoom: 13 });
      }
    } catch {
      // silent fail
    } finally {
      setSearchLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      {/* Address search bar with suggestions */}
      <div className={styles.searchWrap} ref={searchRef}>
        <form className={styles.searchBar} onSubmit={handleSearch}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search pins or a place..."
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchBtn} disabled={searchLoading}>
            {searchLoading ? '…' : '↵'}
          </button>
        </form>

        {suggestions.length > 0 && (
          <div className={styles.suggestions}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className={styles.suggestionItem}
                onMouseDown={() => handleSuggestionClick(s)}
              >
                <span className={styles.suggestionEmoji}>
                  {s.kind === 'pin' ? CATEGORY_LABEL[s.pin.category].charAt(0) : '⌖'}
                </span>
                <span className={styles.suggestionTitle}>
                  {s.kind === 'pin' ? s.pin.title : s.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map controls */}
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.controlBtn}
          onClick={handleLocate}
          title="My location"
        >
          ⊙
        </button>
      </div>

      <MapContainer
        center={[48.8566, 2.3522]}
        zoom={5}
        className={styles.map}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={(pos) => setClickedPos(pos)} />
        <MapController
          flyTarget={flyTarget}
          fitBoundsKey={fitBoundsKey}
          pins={pins}
          userPos={userPos}
        />
        <>
          {filteredPins.map((pin) => (
            <PinMarker key={pin.id} pin={pin} />
          ))}
        </>
      </MapContainer>

      {!clickedPos && filteredPins.length === 0 && pins.length === 0 && (
        <div className={styles.hint}>Tap anywhere on the map to add a memory</div>
      )}

      {clickedPos && (
        <PinForm
          tripId={tripId}
          lat={clickedPos.lat}
          lng={clickedPos.lng}
          onClose={() => setClickedPos(null)}
        />
      )}
    </div>
  );
}
