'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faLink, faCheck, faImages,
  faUsers, faChevronDown, faChevronUp,
  faChevronRight, faPencil, faStar,
} from '@fortawesome/free-solid-svg-icons';
import { useTripStore } from '@/store/tripStore';
import { useAuthStore } from '@/store/authStore';
import { Category } from '@/types';
import { CATEGORY_ICON, CATEGORY_LABEL } from '@/lib/categories';
import StarRating from '@/components/Map/StarRating';
import EditTripModal from './EditTripModal';
import styles from './TripSidebar.module.scss';

const ALL_CATEGORIES: Category[] = ['food', 'spot', 'hotel', 'activity'];

export default function TripSidebar({ tripId }: { tripId: string }) {
  const { trip, pins, activeFilters, toggleFilter, setSelectedPin, setFocusPinId } = useTripStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [mobileTab, setMobileTab] = useState<'info' | 'pins'>('pins');

  const isOwner = !!user && trip?.owner_id === user.id;

  const filteredPins =
    activeFilters.length === 0 ? pins : pins.filter((p) => activeFilters.includes(p.category));

  const ratedPins = pins.filter((p) => p.rating !== null && p.rating !== undefined);
  const avgRating =
    ratedPins.length > 0
      ? ratedPins.reduce((sum, p) => sum + (p.rating ?? 0), 0) / ratedPins.length
      : null;

  function copyInviteLink() {
    if (!trip) return;
    const url = `${window.location.origin}/join/${trip.invite_code}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        alert(`Invite code: ${trip.invite_code}`);
      });
  }

  function handlePinClick(pinId: string) {
    const pin = pins.find((p) => p.id === pinId);
    if (!pin) return;
    setFocusPinId(pinId);
    setSelectedPin(pin);
  }

  const members = trip?.members ?? [];

  return (
    <div className={styles.sidebar}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <button
            type="button"
            className={styles.btnBack}
            onClick={() => router.push('/')}
            aria-label={user ? 'Dashboard' : 'Home'}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <h2 className={styles.tripName}>{trip?.name || 'Loading...'}</h2>
          <div className={styles.headerActions}>
            {isOwner && (
              <button
                type="button"
                className={styles.btnIcon}
                onClick={() => setShowEdit(true)}
                aria-label="Rename trip"
                title="Rename trip"
              >
                <FontAwesomeIcon icon={faPencil} />
              </button>
            )}
            {trip && (
              <button
                type="button"
                className={`${styles.btnInvite} ${copied ? styles.btnInviteCopied : ''}`}
                onClick={copyInviteLink}
                title="Copy invite link"
              >
                <FontAwesomeIcon icon={copied ? faCheck : faLink} />
                <span>{copied ? 'Copied!' : trip.invite_code}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className={styles.tabBar}>
        <button
          type="button"
          className={`${styles.tab} ${mobileTab === 'info' ? styles.tabActive : ''}`}
          onClick={() => setMobileTab('info')}
        >
          Trip
        </button>
        <button
          type="button"
          className={`${styles.tab} ${mobileTab === 'pins' ? styles.tabActive : ''}`}
          onClick={() => setMobileTab('pins')}
        >
          Memories ({filteredPins.length}{activeFilters.length > 0 ? `/${pins.length}` : ''})
        </button>
      </div>

      {/* Info panel */}
      <div className={`${styles.infoContent} ${mobileTab === 'pins' ? styles.mobileHide : ''}`}>
        <Link href={`/trip/${tripId}/gallery`} className={styles.galleryLink}>
          <FontAwesomeIcon icon={faImages} />
          <span>View gallery</span>
        </Link>

        {/* Participants */}
        <div className={styles.participantsSection}>
          <button
            type="button"
            className={styles.participantsToggle}
            onClick={() => setShowParticipants((v) => !v)}
          >
            <span className={styles.participantsLabel}>
              <FontAwesomeIcon icon={faUsers} />
              Participants <em>({members.length})</em>
            </span>
            <FontAwesomeIcon icon={showParticipants ? faChevronUp : faChevronDown} className={styles.chevron} />
          </button>

          {showParticipants && (
            <div className={styles.membersList}>
              {members.map((m) => {
                const name = m.guest_name || m.user?.display_name || 'Unknown';
                return (
                  <div key={m.id} className={styles.memberItem}>
                    <span className={styles.memberAvatar}>{name.charAt(0).toUpperCase()}</span>
                    <span className={styles.memberName}>{name}</span>
                    {m.role === 'owner' && <span className={styles.ownerBadge}>Owner</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pins section */}
      <div className={`${styles.pinsSection} ${mobileTab === 'info' ? styles.mobileHide : ''}`}>
        <div className={styles.pinsSectionHeader}>
          <div className={styles.pinsSectionLeft}>
            <span className={styles.sectionLabel}>
              Memories
              <span className={styles.pinsCount}>
                {filteredPins.length}{activeFilters.length > 0 ? `/${pins.length}` : ''}
              </span>
            </span>
            {avgRating !== null && (
              <div className={styles.avgRating}>
                <FontAwesomeIcon icon={faStar} className={styles.avgStar} />
                <span>{avgRating.toFixed(1)}</span>
              </div>
            )}
          </div>

          <div className={styles.filters}>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`${styles.filterChip} ${activeFilters.includes(cat) ? styles.filterActive : ''}`}
                onClick={() => toggleFilter(cat)}
                title={CATEGORY_LABEL[cat]}
              >
                <FontAwesomeIcon icon={CATEGORY_ICON[cat]} />
              </button>
            ))}
          </div>
        </div>

        <div className={styles.pinsList}>
          {filteredPins.length === 0 ? (
            <div className={styles.empty}>
              {pins.length === 0 ? (
                <><strong>No memories yet.</strong><br />Tap the map to add the first one!</>
              ) : (
                'No pins match the active filter.'
              )}
            </div>
          ) : (
            filteredPins.map((pin) => {
              const author = pin.member?.guest_name || pin.member?.user?.display_name || 'Anonymous';
              return (
                <button
                  key={pin.id}
                  type="button"
                  className={styles.pinItem}
                  onClick={() => handlePinClick(pin.id)}
                >
                  <span className={`${styles.pinIcon} ${styles[`pinIcon_${pin.category}`]}`}>
                    <FontAwesomeIcon icon={CATEGORY_ICON[pin.category]} />
                  </span>
                  <div className={styles.pinInfo}>
                    <div className={styles.pinTitle}>{pin.title}</div>
                    <div className={styles.pinMeta}>
                      <span>{author}</span>
                      {pin.rating !== null && <StarRating value={pin.rating} size="sm" />}
                    </div>
                  </div>
                  <FontAwesomeIcon icon={faChevronRight} className={styles.pinArrow} />
                </button>
              );
            })
          )}
        </div>
      </div>

      {showEdit && <EditTripModal onClose={() => setShowEdit(false)} />}
    </div>
  );
}
