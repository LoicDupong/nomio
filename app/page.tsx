'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import styles from './page.module.scss';

interface MyTrip {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  role: 'owner' | 'member';
}

// Extract a 6-char alphanumeric code from either a raw code or a full URL
function parseInviteCode(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  const match = trimmed.match(/\/join\/([A-Za-z0-9]{6})\/?$/i);
  if (match) return match[1].toUpperCase();
  return trimmed.toUpperCase();
}

export default function LandingPage() {
  const router = useRouter();
  const { token, user, hydrate, logout } = useAuthStore();

  const [tripName, setTripName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [myTrips, setMyTrips] = useState<MyTrip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  // Code pending choice when non-authenticated user hits Join
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!token) return;
    setTripsLoading(true);
    api.get('/trips/mine')
      .then((res) => setMyTrips(res.data))
      .catch(() => {})
      .finally(() => setTripsLoading(false));
  }, [token]);

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
    const code = parseInviteCode(joinCode);
    if (!token) {
      // Let the user choose: guest or sign in
      setPendingJoinCode(code);
      return;
    }
    router.push(`/join/${code}`);
  }

  return (
    <div className={styles.page}>
      {/* Top bar — only when logged in */}
      {user && (
        <div className={styles.topBar}>
          <span className={styles.greeting}>Hi, {user.display_name}</span>
          <button
            type="button"
            className={styles.btnTopLogout}
            onClick={() => logout()}
          >
            Logout
          </button>
        </div>
      )}

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
              placeholder="Code (ABC123) or invite link"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              required
            />
          </div>
          <button className={styles.btnSecondary} type="submit">
            Join trip
          </button>
        </form>
      </div>

      {/* My trips — only for logged-in users */}
      {user && (
        <div className={styles.myTrips}>
          <h2 className={styles.myTripsTitle}>My trips</h2>

          {tripsLoading && (
            <p className={styles.tripsEmpty}>Loading...</p>
          )}

          {!tripsLoading && myTrips.length === 0 && (
            <p className={styles.tripsEmpty}>No trips yet. Create or join one above!</p>
          )}

          {!tripsLoading && myTrips.length > 0 && (
            <div className={styles.tripsList}>
              {myTrips.map((trip) => (
                <button
                  key={trip.id}
                  type="button"
                  className={styles.tripCard}
                  onClick={() => router.push(`/trip/${trip.id}`)}
                >
                  <div className={styles.tripCardLeft}>
                    <span className={styles.tripCardName}>{trip.name}</span>
                    <span className={styles.tripCardCode}>{trip.invite_code}</span>
                  </div>
                  <span className={`${styles.tripRole} ${trip.role === 'owner' ? styles.tripRoleOwner : ''}`}>
                    {trip.role}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Join choice modal — shown when non-authenticated user submits join form */}
      {pendingJoinCode && (
        <div className={styles.modalOverlay} onClick={() => setPendingJoinCode(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>How do you want to join?</h2>
            <p className={styles.modalSubtitle}>Code: <strong>{pendingJoinCode}</strong></p>

            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => {
                setPendingJoinCode(null);
                router.push(`/join/${pendingJoinCode}`);
              }}
            >
              Continue as guest
            </button>

            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => {
                setPendingJoinCode(null);
                router.push(`/auth/login?next=/join/${pendingJoinCode}`);
              }}
            >
              Sign in to my account
            </button>

            <button
              type="button"
              className={styles.btnCancel}
              onClick={() => setPendingJoinCode(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
