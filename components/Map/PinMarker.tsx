'use client';
import { useMemo } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { Pin, Category } from '@/types';
import { CATEGORY_COLOR } from '@/lib/categories';
import { useTripStore } from '@/store/tripStore';

// Simplified SVG paths for each category (inline in divIcon, no FA React dep needed)
const CATEGORY_SVG: Record<Category, string> = {
  food: `<svg viewBox="0 0 24 24" fill="white" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-8-15.03-8-15.03 0h15.03z"/></svg>`,
  spot: `<svg viewBox="0 0 24 24" fill="white" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>`,
  hotel: `<svg viewBox="0 0 24 24" fill="white" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"/></svg>`,
  activity: `<svg viewBox="0 0 24 24" fill="white" width="13" height="13" xmlns="http://www.w3.org/2000/svg"><path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z"/></svg>`,
};

function createCategoryIcon(category: Category): L.DivIcon {
  const color = CATEGORY_COLOR[category];
  const svg = CATEGORY_SVG[category];
  return L.divIcon({
    className: '',
    html: `<div style="
      background: ${color};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.22);
      border: 2.5px solid white;
    "><span style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">${svg}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

// Created once per category to prevent Leaflet DOM re-registration on each render
const CATEGORY_ICONS: Record<Category, L.DivIcon> = {
  food: createCategoryIcon('food'),
  spot: createCategoryIcon('spot'),
  hotel: createCategoryIcon('hotel'),
  activity: createCategoryIcon('activity'),
};

export default function PinMarker({ pin }: { pin: Pin }) {
  const { setSelectedPin } = useTripStore();

  const eventHandlers = useMemo(
    () => ({ click: () => setSelectedPin(pin) }),
    [pin, setSelectedPin],
  );

  return (
    <Marker
      position={[pin.lat, pin.lng]}
      icon={CATEGORY_ICONS[pin.category]}
      eventHandlers={eventHandlers}
    />
  );
}
