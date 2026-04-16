'use client';
import { useRouter } from 'next/navigation';
import { GalleryPhoto } from '@/types';
import styles from './GalleryGrid.module.scss';

interface GalleryGridProps {
  photos: GalleryPhoto[];
  tripId: string;
}

export default function GalleryGrid({ photos, tripId }: GalleryGridProps) {
  const router = useRouter();

  function handleClick(photo: GalleryPhoto) {
    if (photo.pin_id) {
      router.push(`/trip/${tripId}?pin=${photo.pin_id}`);
    }
  }

  return (
    <div className={styles.grid}>
      {photos.length === 0 && (
        <div className={styles.empty}>No photos yet. Add the first one!</div>
      )}
      {photos.map((photo) => (
        <div
          key={photo.id}
          className={styles.item}
          onClick={() => handleClick(photo)}
          role={photo.pin_id ? 'button' : undefined}
          tabIndex={photo.pin_id ? 0 : undefined}
          onKeyDown={photo.pin_id ? (e) => e.key === 'Enter' && handleClick(photo) : undefined}
          aria-label={photo.pin_id ? 'Go to pin on map' : undefined}
        >
          <img
            src={`${process.env.NEXT_PUBLIC_API_URL}${photo.url}`}
            alt=""
            className={styles.photo}
          />
          {photo.pin_id && (
            <div className={styles.overlay}>
              <span className={styles.overlayIcon}>📍</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
