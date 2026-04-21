'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useTripStore } from '@/store/tripStore';
import { joinTripRoom, getSocket } from '@/lib/socket';
import { Pin } from '@/types';
import TripSidebar from '@/components/Sidebar/TripSidebar';
import PinDetailModal from '@/components/Map/PinDetailModal';
import styles from './page.module.scss';

// SSR must be false for Leaflet
const MapView = dynamic(() => import('@/components/Map/MapView'), { ssr: false });

export default function TripPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hydrate, token, guestToken } = useAuthStore();
  const { setTrip, setPins, addPin, updatePin, removePin, selectedPin, setSelectedPin, setFocusPinId } = useTripStore();
  const [ready, setReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    hydrate();
    setHydrated(true);
  }, []);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  const loadTrip = useCallback(async () => {
    try {
      const [tripRes, pinsRes] = await Promise.all([
        api.get(`/trips/${id}`),
        api.get(`/trips/${id}/pins`),
      ]);
      const pins: Pin[] = pinsRes.data;
      setTrip(tripRes.data);
      setPins(pins);
      setReady(true);

      // Handle ?pin= deep-link from gallery
      const pinId = new URLSearchParams(window.location.search).get('pin');
      if (pinId) {
        const pin = pins.find((p) => p.id === pinId);
        if (pin) {
          setSelectedPin(pin);
          setFocusPinId(pinId);
        }
      }
    } catch {
      router.replace('/');
    }
  }, [id, setTrip, setPins, setSelectedPin, setFocusPinId, router]);

  useEffect(() => {
    if (!ready) return;

    joinTripRoom(id);
    const socket = getSocket();

    function onPinAdded(pin: Pin) {
      addPin(pin);
      const author =
        pin.member?.guest_name || pin.member?.user?.display_name || 'someone';
      showToast(`New pin: ${pin.title} — by ${author}`);
    }

    function onPinUpdated(pin: Pin) {
      updatePin(pin);
    }

    function onPinDeleted({ pinId }: { pinId: string }) {
      removePin(pinId);
    }

    socket.on('pin:added', onPinAdded);
    socket.on('pin:updated', onPinUpdated);
    socket.on('pin:deleted', onPinDeleted);

    return () => {
      socket.off('pin:added', onPinAdded);
      socket.off('pin:updated', onPinUpdated);
      socket.off('pin:deleted', onPinDeleted);
    };
  }, [ready, id, addPin, updatePin, removePin]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token && !guestToken) {
      router.replace(`/join/${id}`);
      return;
    }
    loadTrip();
  }, [hydrated, token, guestToken, loadTrip, id, router]);

  // Clean up toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

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

      {selectedPin && (
        <PinDetailModal pin={selectedPin} onClose={() => setSelectedPin(null)} />
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
