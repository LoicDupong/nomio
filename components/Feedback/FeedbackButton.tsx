'use client';
import styles from './FeedbackButton.module.scss';

interface Props {
  onClick: () => void;
}

export default function FeedbackButton({ onClick }: Props) {
  return (
    <button className={styles.button} type="button" onClick={onClick}>
      Feedback
    </button>
  );
}
