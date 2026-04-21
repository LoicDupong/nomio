'use client';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { GalleryPhoto } from '@/types';
import { photoUrl } from '@/lib/photoUrl';
import styles from './PhotoModal.module.scss';

interface Props {
  photo: GalleryPhoto;
  tripId: string;
  onClose: () => void;
}

export default function PhotoModal({ photo, tripId, onClose }: Props) {
  const router = useRouter();

  const author =
    photo.member?.guest_name ||
    photo.member?.user?.display_name ||
    'Anonymous';

  const date = new Date(photo.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  function handleViewOnMap() {
    onClose();
    router.push(`/trip/${tripId}?pin=${photo.pin_id}`);
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <FontAwesomeIcon icon={faXmark} />
        </button>

        <div className={styles.imageWrap}>
          <img
            src={photoUrl(photo.url)!}
            alt={photo.pin?.title ?? 'Photo'}
            className={styles.image}
          />
        </div>

        <div className={styles.info}>
          <div className={styles.meta}>
            <span>by {author}</span>
            <span>{date}</span>
          </div>
          {photo.pin?.title && (
            <div className={styles.pinTitle}><FontAwesomeIcon icon={faLocationDot} /> {photo.pin.title}</div>
          )}
          {photo.pin_id && (
            <button type="button" className={styles.mapBtn} onClick={handleViewOnMap}>
              View on map
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
