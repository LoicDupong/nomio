import { Pin } from '@/types';
import { photoUrl } from '@/lib/photoUrl';
import StarRating from './StarRating';
import styles from './PinDetail.module.scss';

export default function PinDetail({ pin }: { pin: Pin }) {
  const authorName =
    pin.member?.guest_name ||
    pin.member?.user?.display_name ||
    'Anonymous';

  return (
    <div className={styles.detail}>
      {pin.photo_url && (
        <img
          src={photoUrl(pin.photo_url)!}
          alt={pin.title}
          className={styles.photo}
        />
      )}
      <div className={styles.content}>
        <h3 className={styles.title}>{pin.title}</h3>
        {pin.rating !== null && (
          <div className={styles.rating}>
            <StarRating value={pin.rating} size="sm" />
          </div>
        )}
        {pin.note && <p className={styles.note}>{pin.note}</p>}
        {pin.budget !== null && (
          <p className={styles.budget}>Budget: {pin.budget} €</p>
        )}
        <span className={styles.author}>by {authorName}</span>
      </div>
    </div>
  );
}
