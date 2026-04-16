'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import styles from './page.module.scss';

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { token, guestToken, setGuest, hydrate } = useAuthStore();

  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrate();
    setHydrated(true);
  }, []);

  const joinTrip = useCallback(async (nameOverride?: string) => {
    setLoading(true);
    setError('');
    try {
      const body = nameOverride ? { guest_name: nameOverride } : {};
      const res = await api.post(`/join/${code}`, body);
      const { trip_id, guest_token } = res.data;
      if (guest_token) {
        setGuest(guest_token, nameOverride || '');
      }
      router.push(`/trip/${trip_id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Could not join trip');
      setLoading(false);
    }
  }, [code, setGuest, router]);

  // Auto-join if user already has a valid session (auth or guest)
  useEffect(() => {
    if (!hydrated) return;
    if (token || guestToken) {
      joinTrip();
    }
  }, [hydrated, token, guestToken, joinTrip]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await joinTrip(guestName.trim());
  }

  // Don't show form until we've checked existing session
  if (!hydrated || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.emoji}>🗺️</div>
          <p>Joining trip...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.emoji}>🗺️</div>
        <h1 className={styles.title}>Join trip</h1>
        <p className={styles.subtitle}>Enter your name to pin memories with the crew</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="guest-name">Your name</label>
            <input
              id="guest-name"
              type="text"
              placeholder="e.g. Alice"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              minLength={2}
              required
              autoFocus
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? 'Joining...' : 'Join trip'}
          </button>
        </form>
      </div>
    </div>
  );
}
