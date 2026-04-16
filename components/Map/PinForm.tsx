import { useState, useRef } from 'react';
import api from '@/lib/api';
import { Category } from '@/types';
import styles from './PinForm.module.scss';

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'spot', label: 'Spot', emoji: '📍' },
  { value: 'food', label: 'Food', emoji: '🍽️' },
  { value: 'hotel', label: 'Hotel', emoji: '🏨' },
  { value: 'activity', label: 'Activity', emoji: '🎯' },
];

interface PinFormProps {
  tripId: string;
  lat: number;
  lng: number;
  onClose: () => void;
}

export default function PinForm({ tripId, lat, lng, onClose }: PinFormProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('spot');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = new FormData();
    form.append('title', title);
    form.append('category', category);
    form.append('lat', String(lat));
    form.append('lng', String(lng));
    if (note) form.append('note', note);
    if (photo) form.append('photo', photo);

    try {
      await api.post(`/trips/${tripId}/pins`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to create pin');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <h2 className={styles.title}>Add a memory</h2>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="pin-title">Title</label>
            <input
              id="pin-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What is this place?"
              required
              autoFocus
            />
          </div>

          <div className={styles.categories}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                className={`${styles.catBtn} ${category === cat.value ? styles.active : ''}`}
                onClick={() => setCategory(cat.value)}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>

          <div className={styles.field}>
            <label htmlFor="pin-note">Note (optional)</label>
            <textarea
              id="pin-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tell the crew about this spot..."
            />
          </div>

          {preview ? (
            <img src={preview} alt="Preview" className={styles.photoPreview} />
          ) : (
            <label className={styles.photoLabel}>
              📷 Add a photo (optional)
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhoto}
              />
            </label>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={loading}>
              {loading ? 'Saving...' : 'Save memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
