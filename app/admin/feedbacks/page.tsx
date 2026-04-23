'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/store/adminStore';
import adminApi from '@/lib/adminApi';
import { Feedback, FeedbackStatus, FeedbackType } from '@/types';
import styles from './page.module.scss';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: 'Bug',
  feature: 'Feature',
  ui: 'UX / UI',
  other: 'Other',
};

const STATUS_TABS: { value: '' | FeedbackStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'archived', label: 'Archived' },
];

export default function AdminFeedbacksPage() {
  const router = useRouter();
  const { token, logout, hydrate } = useAdminStore();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [statusFilter, setStatusFilter] = useState<'' | FeedbackStatus>('');
  const [typeFilter, setTypeFilter] = useState<'' | FeedbackType>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (token === null && !localStorage.getItem('admin_token')) {
      router.replace('/admin/login');
    }
  }, [token, router]);

  const fetchFeedbacks = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      if (search) params.search = search;
      const res = await adminApi.get('/admin/feedbacks', { params });
      setFeedbacks(res.data);
    } catch {
      // 401 handled by interceptor (redirect to login)
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  async function handleSelect(fb: Feedback) {
    setSelected(fb);
    setDeleteConfirm(false);
    if (fb.status === 'new') {
      try {
        await adminApi.patch(`/admin/feedbacks/${fb.id}`, { status: 'read' });
        setFeedbacks((prev) =>
          prev.map((f) => (f.id === fb.id ? { ...f, status: 'read' } : f))
        );
        setSelected((prev) => (prev?.id === fb.id ? { ...prev, status: 'read' } : prev));
      } catch {}
    }
  }

  async function handleStatusChange(status: FeedbackStatus) {
    if (!selected) return;
    try {
      await adminApi.patch(`/admin/feedbacks/${selected.id}`, { status });
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === selected.id ? { ...f, status } : f))
      );
      setSelected((prev) => (prev ? { ...prev, status } : prev));
    } catch {}
  }

  async function handleDelete() {
    if (!selected) return;
    try {
      await adminApi.delete(`/admin/feedbacks/${selected.id}`);
      setFeedbacks((prev) => prev.filter((f) => f.id !== selected.id));
      setSelected(null);
      setDeleteConfirm(false);
    } catch {}
  }

  function handleLogout() {
    logout();
    router.replace('/admin/login');
  }

  const newCount = feedbacks.filter((f) => f.status === 'new').length;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <h1 className={styles.heading}>
          Feedbacks
          {newCount > 0 && <span className={styles.badge}>{newCount}</span>}
        </h1>

        <div className={styles.filterGroup}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`${styles.filterBtn} ${statusFilter === tab.value ? styles['filterBtn--active'] : ''}`}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          className={styles.select}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as '' | FeedbackType)}
        >
          <option value="">All types</option>
          <option value="bug">Bug</option>
          <option value="feature">Feature</option>
          <option value="ui">UX / UI</option>
          <option value="other">Other</option>
        </select>

        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />

        <button className={styles.logoutBtn} type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className={styles.body}>
        {/* List */}
        <div className={styles.list}>
          {loading && <p className={styles.listEmpty}>Loading...</p>}
          {!loading && feedbacks.length === 0 && (
            <p className={styles.listEmpty}>No feedbacks found.</p>
          )}
          {feedbacks.map((fb) => (
            <div
              key={fb.id}
              className={[
                styles.listItem,
                selected?.id === fb.id ? styles['listItem--selected'] : '',
                fb.status === 'new' ? styles['listItem--new'] : '',
              ].join(' ')}
              onClick={() => handleSelect(fb)}
            >
              <div className={styles.itemHeader}>
                <span className={`${styles.typeBadge} ${styles[`typeBadge--${fb.type}`]}`}>
                  {TYPE_LABELS[fb.type]}
                </span>
                <span className={styles.itemTitle}>{fb.title}</span>
              </div>
              <div className={styles.itemMeta}>
                {fb.user?.display_name ?? 'Guest'} · {formatDate(fb.created_at)}
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
        <div className={styles.detail}>
          {!selected ? (
            <p className={styles.detailEmpty}>Select a feedback to read it.</p>
          ) : (
            <div className={styles.detailCard}>
              <div className={styles.detailHeader}>
                <span className={`${styles.typeBadge} ${styles[`typeBadge--${selected.type}`]}`}>
                  {TYPE_LABELS[selected.type]}
                </span>
              </div>

              <h2 className={styles.detailTitle}>{selected.title}</h2>

              <div className={styles.detailMeta}>
                <div className={styles.detailMetaItem}>
                  <span>From:</span>
                  <span>{selected.user?.display_name ?? 'Guest'}</span>
                </div>
                {selected.email && (
                  <div className={styles.detailMetaItem}>
                    <span>Email:</span>
                    <a href={`mailto:${selected.email}`}>{selected.email}</a>
                  </div>
                )}
                <div className={styles.detailMetaItem}>
                  <span>Date:</span>
                  <span>{formatDate(selected.created_at)}</span>
                </div>
                {selected.page && (
                  <div className={styles.detailMetaItem}>
                    <span>Page:</span>
                    <span>{selected.page}</span>
                  </div>
                )}
                {selected.trip_id && (
                  <div className={styles.detailMetaItem}>
                    <span>Trip:</span>
                    <span>{selected.trip_id}</span>
                  </div>
                )}
                <div className={styles.detailMetaItem}>
                  <span>Status:</span>
                  <span>{selected.status}</span>
                </div>
              </div>

              <p className={styles.detailMessage}>{selected.message}</p>

              {selected.screenshot_url && (
                <img
                  src={selected.screenshot_url}
                  alt="Screenshot"
                  className={styles.detailScreenshot}
                />
              )}

              <div className={styles.detailActions}>
                {selected.status !== 'read' && (
                  <button
                    className={styles.actionBtn}
                    type="button"
                    onClick={() => handleStatusChange('read')}
                  >
                    Mark as read
                  </button>
                )}
                {selected.status !== 'archived' && (
                  <button
                    className={styles.actionBtn}
                    type="button"
                    onClick={() => handleStatusChange('archived')}
                  >
                    Archive
                  </button>
                )}
                {!deleteConfirm ? (
                  <button
                    className={`${styles.actionBtn} ${styles['actionBtn--danger']}`}
                    type="button"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    Delete
                  </button>
                ) : (
                  <>
                    <button
                      className={`${styles.actionBtn} ${styles['actionBtn--danger']}`}
                      type="button"
                      onClick={handleDelete}
                    >
                      Confirm delete
                    </button>
                    <button
                      className={styles.actionBtn}
                      type="button"
                      onClick={() => setDeleteConfirm(false)}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
