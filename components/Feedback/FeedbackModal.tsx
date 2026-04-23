'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import styles from './FeedbackModal.module.scss';
import { FeedbackType } from '@/types';

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'ui', label: 'UX / UI' },
  { value: 'other', label: 'Other' },
];

interface Props {
  onClose: () => void;
}

export default function FeedbackModal({ onClose }: Props) {
  const { user } = useAuthStore();
  const [type, setType] = useState<FeedbackType>('bug');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-close after success
  useEffect(() => {
    if (status !== 'success') return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [status, onClose]);

  // Extract context from URL
  function getContext() {
    const pathname = window.location.pathname;
    const tripMatch = pathname.match(/\/trip\/([^/]+)/);
    const trip_id = tripMatch ? tripMatch[1] : null;
    return { page: pathname, trip_id };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const { page, trip_id } = getContext();

    const formData = new FormData();
    formData.append('type', type);
    formData.append('title', title);
    formData.append('message', message);
    if (email.trim()) formData.append('email', email.trim());
    if (page) formData.append('page', page);
    if (trip_id) formData.append('trip_id', trip_id);
    if (user?.id) formData.append('user_id', user.id);
    formData.append('app_version', 'V1 beta');
    if (screenshot) formData.append('screenshot', screenshot);

    try {
      await api.post('/feedback', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatus('success');
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: string } } };
      const status = e.response?.status;
      if (status === 413) {
        setErrorMsg('Screenshot is too large (max 5 MB).');
      } else if (status === 400) {
        setErrorMsg(e.response?.data?.error ?? 'Please fill in all required fields.');
      } else {
        setErrorMsg('Something went wrong. Please try again.');
      }
      setStatus('error');
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > 5 * 1024 * 1024) {
      setErrorMsg('Screenshot is too large (max 5 MB).');
      if (fileRef.current) fileRef.current.value = '';
      setScreenshot(null);
      return;
    }
    setErrorMsg('');
    setScreenshot(file);
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Send feedback</h2>
          <button className={styles.closeBtn} type="button" onClick={onClose}>✕</button>
        </div>

        {status === 'success' ? (
          <div className={styles.success}>
            <p>Thanks for your feedback!</p>
            <span>We read everything. This will close in a moment.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.typeGroup}>
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`${styles.typeBtn} ${type === t.value ? styles['typeBtn--active'] : ''}`}
                  onClick={() => setType(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className={styles.field}>
              <label htmlFor="fb-title">Title</label>
              <input
                id="fb-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short summary"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="fb-message">Message</label>
              <textarea
                id="fb-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us more..."
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="fb-email">
                Email <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="fb-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="fb-screenshot">
                Screenshot <span className={styles.optional}>(optional, max 5 MB)</span>
              </label>
              <input
                id="fb-screenshot"
                type="file"
                accept="image/jpeg,image/png"
                ref={fileRef}
                onChange={handleFileChange}
                className={styles.fileInput}
              />
            </div>

            {status === 'error' && <p className={styles.error}>{errorMsg}</p>}

            <button className={styles.submitBtn} type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Sending...' : 'Send feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
