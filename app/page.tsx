'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import styles from './page.module.scss';

export default function LandingPage() {
  const router = useRouter();
  const { token, user, hydrate } = useAuthStore();

  const [tripName, setTripName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    hydrate();
  }, []);

  async function createTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return router.push('/auth/login');
    setCreating(true);
    setError('');
    try {
      const res = await api.post('/trips', { name: tripName });
      router.push(`/trip/${res.data.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to create trip');
    } finally {
      setCreating(false);
    }
  }

  function goJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    router.push(`/join/${joinCode.trim().toUpperCase()}`);
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1>Travel Memory Map</h1>
        <p>Pin memories on a map with your travel crew</p>
      </div>

      <div className={styles.card}>
        {user ? (
          <>
            <p className={styles.sectionTitle}>Create a new trip</p>
            <form onSubmit={createTrip}>
              <div className={styles.field}>
                <input
                  id="trip-name"
                  type="text"
                  placeholder="Trip name (e.g. Portugal 2024)"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  required
                />
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <button className={styles.btnPrimary} type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create trip'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className={styles.sectionTitle}>Create a trip</p>
            <button
              className={styles.btnPrimary}
              type="button"
              onClick={() => router.push('/auth/register')}
            >
              Register to create a trip
            </button>
            <div className={styles.authLinks}>
              Already have an account? <Link href="/auth/login">Sign in</Link>
            </div>
          </>
        )}

        <div className={styles.divider}>or</div>

        <p className={styles.sectionTitle}>Join with an invite code</p>
        <form onSubmit={goJoin}>
          <div className={styles.field}>
            <input
              id="join-code"
              type="text"
              placeholder="Enter invite code (e.g. ABC123)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
            />
          </div>
          <button className={styles.btnSecondary} type="submit">
            Join trip
          </button>
        </form>
      </div>
    </div>
  );
}
