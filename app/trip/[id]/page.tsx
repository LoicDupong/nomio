'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useTripStore } from '@/store/tripStore';
import { joinTripRoom, getSocket } from '@/lib/socket';
import { Pin } from '@/types';
import TripSidebar from '@/components/Sidebar/TripSidebar';
import styles from './page.module.scss';

// SSR must be false for Leaflet
const MapView = dynamic(() => import('@/components/Map/MapView'), { ssr: false });

export default function TripPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hydrate, token, guestToken } = useAuthStore();
  const { setTrip, setPins, addPin } = useTripStore();
  const [ready, setReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrate();
    setHydrated(true);
  }, []);

  const loadTrip = useCallback(async () => {
    try {
      const [tripRes, pinsRes] = await Promise.all([
        api.get(`/trips/${id}`),
        api.get(`/trips/${id}/pins`),
      ]);
      setTrip(tripRes.data);
      setPins(pinsRes.data);
      setReady(true);
    } catch {
      router.replace('/');
    }
  }, [id, setTrip, setPins, router]);

  useEffect(() => {
    if (!ready) return;

    joinTripRoom(id);
    const socket = getSocket();

    function onPinAdded(pin: Pin) {
      addPin(pin);
    }

    socket.on('pin:added', onPinAdded);

    return () => {
      socket.off('pin:added', onPinAdded);
    };
  }, [ready, id, addPin]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token && !guestToken) {
      router.replace(`/join/${id}`);
      return;
    }
    loadTrip();
  }, [hydrated, token, guestToken, loadTrip, id, router]);

  if (!ready) {
    return <div className={styles.loading}>Loading trip...</div>;
  }

  return (
    <div className={styles.layout}>
      <div className={styles.mapArea}>
        <MapView tripId={id} />
      </div>
      <div className={styles.sidebarArea}>
        <TripSidebar tripId={id} />
      </div>
    </div>
  );
}
