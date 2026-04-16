import { Pin } from '@/types';
import styles from './PinDetail.module.scss';

export default function PinDetail({ pin }: { pin: Pin }) {
  const authorName =
    pin.member?.user?.display_name ||
    pin.member?.guest_name ||
    'Someone';

  return (
    <div className={styles.detail}>
      {pin.photo_url && (
        <img
          src={`${process.env.NEXT_PUBLIC_API_URL}${pin.photo_url}`}
          alt={pin.title}
          className={styles.photo}
        />
      )}
      <div className={styles.content}>
        <h3 className={styles.title}>{pin.title}</h3>
        {pin.note && <p className={styles.note}>{pin.note}</p>}
        <span className={styles.author}>by {authorName}</span>
      </div>
    </div>
  );
}
