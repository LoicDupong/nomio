'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { useTripStore } from '@/store/tripStore';
import styles from './EditTripModal.module.scss';

interface Props {
  onClose: () => void;
}

export default function EditTripModal({ onClose }: Props) {
  const { trip, setTrip } = useTripStore();
  const [name, setName] = useState(trip?.name ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trip || !name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.patch(`/trips/${trip.id}`, { name: name.trim() });
      setTrip({ ...trip, name: res.data.name });
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to update trip');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Edit trip</h2>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="trip-name">Trip name</label>
            <input
              id="trip-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.btnSave} disabled={loading || !name.trim()}>
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
