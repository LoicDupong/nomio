'use client';
import styles from './StarRating.module.scss';

interface StarRatingProps {
  value: number | null;
  onChange?: (v: number | null) => void;
  size?: 'sm' | 'md';
}

export default function StarRating({ value, onChange, size = 'md' }: StarRatingProps) {
  if (!onChange) {
    return (
      <div className={`${styles.stars} ${styles[size]}`} aria-label={`Rating: ${value ?? 0} stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`${styles.star} ${value !== null && value >= star ? styles.filled : ''}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={`${styles.stars} ${styles[size]}`} role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`${styles.star} ${value !== null && value >= star ? styles.filled : ''}`}
          onClick={() => onChange(star === value ? null : star)}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
