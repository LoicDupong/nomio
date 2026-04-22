'use client';
import { useState } from 'react';
import { GalleryPhoto } from '@/types';
import { photoUrl } from '@/lib/photoUrl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot, faTrash } from '@fortawesome/free-solid-svg-icons';
import PhotoModal from './PhotoModal';
import DeletePhotoModal from './DeletePhotoModal';
import styles from './GalleryGrid.module.scss';

interface GalleryGridProps {
  photos: GalleryPhoto[];
  tripId: string;
  userId?: string | null;
  guestMemberId?: string | null;
  onPhotoDeleted?: (photoId: string, sizeBytes: number) => void;
}

export default function GalleryGrid({
  photos,
  tripId,
  userId,
  guestMemberId,
  onPhotoDeleted,
}: GalleryGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<GalleryPhoto | null>(null);

  function isOwnPhoto(photo: GalleryPhoto): boolean {
    if (guestMemberId) return photo.member_id === guestMemberId;
    if (userId) return photo.member?.user_id === userId;
    return false;
  }

  function handleDeleted(photoId: string, sizeBytes: number) {
    setPhotoToDelete(null);
    if (selectedPhoto?.id === photoId) setSelectedPhoto(null);
    onPhotoDeleted?.(photoId, sizeBytes);
  }

  return (
    <>
      <div className={styles.grid}>
        {photos.length === 0 && (
          <div className={styles.empty}>No photos yet. Add the first one!</div>
        )}
        {photos.map((photo) => (
          <div key={photo.id} className={styles.item}>
            <button
              type="button"
              className={styles.photoBtn}
              onClick={() => setSelectedPhoto(photo)}
              aria-label={photo.pin?.title ?? 'View photo'}
            >
              <img
                src={photoUrl(photo.url)!}
                alt={photo.pin?.title ?? ''}
                className={styles.photo}
                loading="lazy"
              />
              {photo.pin_id && (
                <div className={styles.overlay}>
                  <FontAwesomeIcon icon={faLocationDot} className={styles.overlayIcon} />
                </div>
              )}
            </button>

            {isOwnPhoto(photo) && (
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setPhotoToDelete(photo);
                }}
                aria-label="Delete photo"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            )}
          </div>
        ))}
      </div>

      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          tripId={tripId}
          onClose={() => setSelectedPhoto(null)}
        />
      )}

      {photoToDelete && (
        <DeletePhotoModal
          photo={photoToDelete}
          tripId={tripId}
          onDeleted={handleDeleted}
          onClose={() => setPhotoToDelete(null)}
        />
      )}
    </>
  );
}
