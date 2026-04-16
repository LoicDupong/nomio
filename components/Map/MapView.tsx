import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useTripStore } from '@/store/tripStore';
import PinMarker from './PinMarker';
import PinForm from './PinForm';
import styles from './MapView.module.scss';

interface ClickedPosition {
  lat: number;
  lng: number;
}

function MapClickHandler({ onMapClick }: { onMapClick: (pos: ClickedPosition) => void }) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function MapView({ tripId }: { tripId: string }) {
  const { pins } = useTripStore();
  const [clickedPos, setClickedPos] = useState<ClickedPosition | null>(null);

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

  return (
    <div className={styles.container}>
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
        {pins.map((pin) => (
          <PinMarker key={pin.id} pin={pin} />
        ))}
      </MapContainer>

      {!clickedPos && (
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
