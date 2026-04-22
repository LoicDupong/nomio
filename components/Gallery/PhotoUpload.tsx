'use client';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera } from '@fortawesome/free-solid-svg-icons';
import api from '@/lib/api';
import { GalleryPhoto, TripStorage } from '@/types';
import styles from './PhotoUpload.module.scss';

interface PhotoUploadProps {
  tripId: string;
  storage: TripStorage | null;
  onUploaded: (photo: GalleryPhoto) => void;
}

function getErrorMessage(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { error?: string } } };
  const status = e.response?.status;
  if (status === 403) return 'This trip has reached the maximum of 100 photos.';
  if (status === 507) return e.response?.data?.error ?? 'This trip has reached its 1 GB storage limit.';
  return 'Upload failed. Please try again.';
}

export default function PhotoUpload({ tripId, storage, onUploaded }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const isFull =
    storage !== null &&
    (storage.photos_used >= storage.photos_limit ||
      storage.bytes_used >= storage.bytes_limit);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const form = new FormData();
    form.append('photo', file);
    try {
      const res = await api.post(`/trips/${tripId}/gallery`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  if (isFull) {
    return (
      <div className={styles.upload}>
        <p className={styles.limitMsg}>
          {storage!.photos_used >= storage!.photos_limit
            ? 'This trip has reached the maximum of 100 photos.'
            : 'This trip has reached its 1 GB storage limit.'}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.upload}>
      {uploading ? (
        <div className={styles.uploading}>Uploading & optimising...</div>
      ) : (
        <label className={styles.label} htmlFor="gallery-upload">
          <FontAwesomeIcon icon={faCamera} /> Upload a photo to gallery
          <input
            id="gallery-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFile}
          />
        </label>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
