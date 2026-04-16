'use client';
import Link from 'next/link';
import { useTripStore } from '@/store/tripStore';
import { Category } from '@/types';
import styles from './TripSidebar.module.scss';

const CATEGORY_EMOJI: Record<Category, string> = {
  food: '🍽️',
  spot: '📍',
  hotel: '🏨',
  activity: '🎯',
};

export default function TripSidebar({ tripId }: { tripId: string }) {
  const { trip, pins } = useTripStore();

  function copyInviteLink() {
    if (!trip) return;
    const url = `${window.location.origin}/join/${trip.invite_code}`;
    navigator.clipboard.writeText(url).catch(() => {
      // Clipboard API may fail in some browsers — silently ignore
    });
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.tripName}>{trip?.name || 'Loading...'}</h2>
        {trip && (
          <button
            className={styles.inviteCode}
            onClick={copyInviteLink}
            title="Copy invite link"
            type="button"
          >
            {trip.invite_code} 🔗
          </button>
        )}
      </div>

      <Link href={`/trip/${tripId}/gallery`} className={styles.galleryLink}>
        📸 View gallery
      </Link>

      <div className={styles.pinsList}>
        {pins.length === 0 ? (
          <div className={styles.empty}>
            No memories yet.
            <br />
            Tap the map to add the first one!
          </div>
        ) : (
          pins.map((pin) => {
            const author =
              pin.member?.user?.display_name ||
              pin.member?.guest_name ||
              'Someone';
            return (
              <div key={pin.id} className={styles.pinItem}>
                <span className={styles.pinIcon}>{CATEGORY_EMOJI[pin.category]}</span>
                <div className={styles.pinInfo}>
                  <div className={styles.pinTitle}>{pin.title}</div>
                  <div className={styles.pinMeta}>by {author}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
