'use client';
import { TripStorage } from '@/types';
import styles from './StorageBar.module.scss';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface StorageBarProps {
  storage: TripStorage;
}

export default function StorageBar({ storage }: StorageBarProps) {
  const { photos_used, photos_limit, bytes_used, bytes_limit } = storage;

  const bytesPercent = Math.min(100, (bytes_used / bytes_limit) * 100);
  const isWarning = bytesPercent >= 80;
  const isFull = photos_used >= photos_limit || bytesPercent >= 100;

  return (
    <div className={`${styles.bar} ${isWarning ? styles.warning : ''} ${isFull ? styles.full : ''}`}>
      <div className={styles.stats}>
        <span className={styles.stat}>
          📷 {photos_used} / {photos_limit} photos
        </span>
        <span className={styles.divider}>·</span>
        <span className={styles.stat}>
          {formatBytes(bytes_used)} / {formatBytes(bytes_limit)}
        </span>
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${bytesPercent}%` }}
          role="progressbar"
          aria-valuenow={bytesPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {isFull && (
        <p className={styles.fullMsg}>
          {photos_used >= photos_limit
            ? 'This trip has reached the maximum of 100 photos.'
            : 'This trip has reached its 1 GB storage limit.'}
        </p>
      )}
    </div>
  );
}
