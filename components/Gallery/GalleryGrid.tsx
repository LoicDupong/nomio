'use client';
import { useState } from 'react';
import { GalleryPhoto } from '@/types';
import { photoUrl } from '@/lib/photoUrl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot } from '@fortawesome/free-solid-svg-icons';
import PhotoModal from './PhotoModal';
import styles from './GalleryGrid.module.scss';

interface GalleryGridProps {
  photos: GalleryPhoto[];
  tripId: string;
}

export default function GalleryGrid({ photos, tripId }: GalleryGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);

  return (
    <>
      <div className={styles.grid}>
        {photos.length === 0 && (
          <div className={styles.empty}>No photos yet. Add the first one!</div>
        )}
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            className={styles.item}
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
        ))}
      </div>

      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          tripId={tripId}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </>
  );
}
