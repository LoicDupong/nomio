import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Pin, Category } from '@/types';
import PinDetail from './PinDetail';

const CATEGORY_EMOJI: Record<Category, string> = {
  food: '🍽️',
  spot: '📍',
  hotel: '🏨',
  activity: '🎯',
};

const CATEGORY_COLOR: Record<Category, string> = {
  food: '#f59e0b',
  spot: '#3b82f6',
  hotel: '#8b5cf6',
  activity: '#10b981',
};

function createCategoryIcon(category: Category) {
  const emoji = CATEGORY_EMOJI[category];
  const color = CATEGORY_COLOR[category];
  return L.divIcon({
    className: '',
    html: `<div style="
      background: ${color};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      border: 2px solid white;
    ">
      <span style="transform: rotate(45deg); font-size: 16px; line-height: 1;">${emoji}</span>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

export default function PinMarker({ pin }: { pin: Pin }) {
  const icon = createCategoryIcon(pin.category);

  return (
    <Marker position={[pin.lat, pin.lng]} icon={icon}>
      <Popup maxWidth={280} minWidth={200}>
        <PinDetail pin={pin} />
      </Popup>
    </Marker>
  );
}
