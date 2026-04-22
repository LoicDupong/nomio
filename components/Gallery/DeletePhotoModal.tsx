'use client';
import { useState } from 'react';
import { GalleryPhoto } from '@/types';
import api from '@/lib/api';
import styles from './DeletePhotoModal.module.scss';

interface DeletePhotoModalProps {
  photo: GalleryPhoto;
  tripId: string;
  onDeleted: (photoId: string, sizeBytes: number) => void;
  onClose: () => void;
}

export default function DeletePhotoModal({
  photo,
  tripId,
  onDeleted,
  onClose,
}: DeletePhotoModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/trips/${tripId}/gallery/${photo.id}`);
      onDeleted(photo.id, photo.size_bytes ?? 0);
    } catch {
      setError('Delete failed. Please try again.');
      setDeleting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <h3 className={styles.title}>Delete photo?</h3>

        {photo.pin_id && (
          <p className={styles.warning}>
            ⚠️ This photo is linked to a pin on the map. Deleting it will remove it from the pin
            too. The pin will remain on the map.
          </p>
        )}

        {!photo.pin_id && (
          <p className={styles.body}>This action cannot be undone.</p>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnDelete}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
