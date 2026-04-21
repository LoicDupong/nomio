'use client';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera } from '@fortawesome/free-solid-svg-icons';
import api from '@/lib/api';
import { GalleryPhoto } from '@/types';
import styles from './PhotoUpload.module.scss';

interface PhotoUploadProps {
  tripId: string;
  onUploaded: (photo: GalleryPhoto) => void;
}

export default function PhotoUpload({ tripId, onUploaded }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('photo', file);
    try {
      const res = await api.post(`/trips/${tripId}/gallery`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(res.data);
    } catch {
      // Upload failed — silently ignore for MVP (user can retry)
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className={styles.upload}>
      {uploading ? (
        <div className={styles.uploading}>Uploading...</div>
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
    </div>
  );
}
