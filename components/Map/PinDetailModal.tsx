'use client';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark, faPencil, faTrash, faCheck,
  faUser, faCalendar, faEuroSign,
} from '@fortawesome/free-solid-svg-icons';
import api from '@/lib/api';
import { photoUrl } from '@/lib/photoUrl';
import { Pin, Category } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useTripStore } from '@/store/tripStore';
import { CATEGORY_ICON, CATEGORY_LABEL, CATEGORY_COLOR } from '@/lib/categories';
import StarRating from './StarRating';
import PinForm from './PinForm';
import styles from './PinDetailModal.module.scss';

interface Props {
  pin: Pin;
  onClose: () => void;
}

export default function PinDetailModal({ pin, onClose }: Props) {
  const [showEditForm, setShowEditForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const { user, guestToken } = useAuthStore();
  const { updatePin, removePin } = useTripStore();

  let guestMemberId: string | null = null;
  if (guestToken) {
    try {
      const payload = JSON.parse(atob(guestToken.split('.')[1]));
      guestMemberId = payload.member_id ?? null;
    } catch { /* ignore */ }
  }

  const canEdit = user
    ? pin.member?.user?.id === user.id
    : guestMemberId !== null && guestMemberId === pin.member_id;

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/trips/${pin.trip_id}/pins/${pin.id}`);
      removePin(pin.id);
    } catch {
      setDeleteError('Delete failed. Try again.');
      setDeleting(false);
    }
  }

  const author =
    pin.member?.guest_name ||
    pin.member?.user?.display_name ||
    'Anonymous';

  const date = new Date(pin.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (showEditForm) {
    return (
      <PinForm
        tripId={pin.trip_id}
        lat={Number(pin.lat)}
        lng={Number(pin.lng)}
        pin={pin}
        onClose={() => setShowEditForm(false)}
        onSuccess={(updatedPin) => {
          updatePin(updatedPin);
          setShowEditForm(false);
        }}
      />
    );
  }

  const catColor = CATEGORY_COLOR[pin.category as Category];

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <FontAwesomeIcon icon={faXmark} />
        </button>

        {pin.photo_url && (
          <img
            src={photoUrl(pin.photo_url)!}
            alt={pin.title}
            className={styles.photo}
          />
        )}

        <div className={styles.body}>
          <div className={styles.categoryBadge} style={{ color: catColor, backgroundColor: `${catColor}18` }}>
            <FontAwesomeIcon icon={CATEGORY_ICON[pin.category as Category]} />
            <span>{CATEGORY_LABEL[pin.category as Category]}</span>
          </div>

          <h2 className={styles.title}>{pin.title}</h2>

          {pin.rating !== null && (
            <div className={styles.rating}>
              <StarRating value={pin.rating} size="md" />
              <span className={styles.ratingText}>{pin.rating}/5</span>
            </div>
          )}

          {pin.note && <p className={styles.note}>{pin.note}</p>}

          {pin.budget !== null && (
            <div className={styles.budget}>
              <span className={styles.budgetLabel}>
                <FontAwesomeIcon icon={faEuroSign} />
                Budget
              </span>
              <span className={styles.budgetValue}>{Number(pin.budget).toFixed(2)} €</span>
            </div>
          )}

          <div className={styles.meta}>
            <span className={styles.metaItem}>
              <FontAwesomeIcon icon={faUser} />
              {author}
            </span>
            <span className={styles.metaItem}>
              <FontAwesomeIcon icon={faCalendar} />
              {date}
            </span>
          </div>
        </div>

        {canEdit && !confirmDelete && (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnEdit}
              onClick={() => setShowEditForm(true)}
            >
              <FontAwesomeIcon icon={faPencil} />
              Edit
            </button>
            <button
              type="button"
              className={styles.btnDelete}
              onClick={() => setConfirmDelete(true)}
            >
              <FontAwesomeIcon icon={faTrash} />
              Delete
            </button>
          </div>
        )}

        {confirmDelete && (
          <div className={styles.confirmRow}>
            <span className={styles.confirmText}>Delete this memory?</span>
            <button
              type="button"
              className={styles.btnDeleteConfirm}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : (
                <><FontAwesomeIcon icon={faCheck} /> Yes, delete</>
              )}
            </button>
            <button
              type="button"
              className={styles.btnCancelConfirm}
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
            {deleteError && <span className={styles.deleteError}>{deleteError}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
