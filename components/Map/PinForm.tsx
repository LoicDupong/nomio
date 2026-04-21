'use client';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faXmark } from '@fortawesome/free-solid-svg-icons';
import api from '@/lib/api';
import { photoUrl } from '@/lib/photoUrl';
import { Category, Pin } from '@/types';
import { CATEGORY_ICON, CATEGORY_LABEL } from '@/lib/categories';
import StarRating from './StarRating';
import styles from './PinForm.module.scss';

const CATEGORIES: Category[] = ['spot', 'food', 'hotel', 'activity'];

interface PinFormProps {
  tripId: string;
  lat: number;
  lng: number;
  onClose: () => void;
  pin?: Pin;
  onSuccess?: (updatedPin: Pin) => void;
}

export default function PinForm({ tripId, lat, lng, onClose, pin, onSuccess }: PinFormProps) {
  const isEdit = !!pin;

  const [title, setTitle] = useState(pin?.title ?? '');
  const [category, setCategory] = useState<Category>(pin?.category ?? 'spot');
  const [note, setNote] = useState(pin?.note ?? '');
  const [rating, setRating] = useState<number | null>(pin?.rating ?? null);
  const [budget, setBudget] = useState<number | null>(
    pin?.budget != null ? Number(pin.budget) : null
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

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

    try {
      if (isEdit && pin) {
        const body: Record<string, unknown> = {
          title,
          category,
          note: note || null,
          rating,
          budget,
        };
        const res = await api.patch(`/trips/${tripId}/pins/${pin.id}`, body);
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        const form = new FormData();
        form.append('title', title);
        form.append('category', category);
        form.append('lat', String(lat));
        form.append('lng', String(lng));
        if (note) form.append('note', note);
        if (rating !== null) form.append('rating', String(rating));
        if (budget !== null) form.append('budget', String(budget));
        if (photo) form.append('photo', photo);
        await api.post(`/trips/${tripId}/pins`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onClose();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || (isEdit ? 'Failed to update pin' : 'Failed to create pin'));
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

        <div className={styles.sheetHeader}>
          <h2 className={styles.title}>{isEdit ? 'Edit memory' : 'Add a memory'}</h2>
          <button type="button" className={styles.btnClose} onClick={onClose} aria-label="Close">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Category */}
          <div className={styles.categories}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`${styles.catBtn} ${category === cat ? styles.active : ''}`}
                onClick={() => setCategory(cat)}
              >
                <FontAwesomeIcon icon={CATEGORY_ICON[cat]} />
                <span>{CATEGORY_LABEL[cat]}</span>
              </button>
            ))}
          </div>

          {/* Title */}
          <div className={styles.field}>
            <label htmlFor="pin-title">Title *</label>
            <input
              id="pin-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What is this place?"
              required
              autoFocus={!isEdit}
            />
          </div>

          {/* Note */}
          <div className={styles.field}>
            <label htmlFor="pin-note">Note <span className={styles.optional}>(optional)</span></label>
            <textarea
              id="pin-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tell the crew about this spot..."
            />
          </div>

          {/* Rating */}
          <div className={styles.ratingRow}>
            <span className={styles.ratingLabel}>Rating</span>
            <StarRating value={rating} onChange={setRating} />
            {rating !== null && (
              <button
                type="button"
                className={styles.clearRating}
                onClick={() => setRating(null)}
              >
                clear
              </button>
            )}
          </div>

          {/* Budget */}
          <div className={styles.field}>
            <label htmlFor="pin-budget">Budget <span className={styles.optional}>(optional)</span></label>
            <div className={styles.inputWithAddon}>
              <span className={styles.addon}>€</span>
              <input
                id="pin-budget"
                type="number"
                min="0"
                step="0.01"
                value={budget ?? ''}
                onChange={(e) => setBudget(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0.00"
                className={styles.inputAddon}
              />
            </div>
          </div>

          {/* Photo */}
          {isEdit ? (
            pin?.photo_url ? (
              <img
                src={photoUrl(pin.photo_url)!}
                alt="Current photo"
                className={styles.photoPreview}
              />
            ) : null
          ) : preview ? (
            <img src={preview} alt="Preview" className={styles.photoPreview} />
          ) : (
            <label className={styles.photoLabel}>
              <FontAwesomeIcon icon={faCamera} />
              <span>Add a photo <em>(optional)</em></span>
              <input
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
              {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Save memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
