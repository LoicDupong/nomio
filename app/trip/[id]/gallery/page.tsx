'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { GalleryPhoto } from '@/types';
import GalleryGrid from '@/components/Gallery/GalleryGrid';
import PhotoUpload from '@/components/Gallery/PhotoUpload';
import styles from './page.module.scss';

export default function GalleryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hydrate, token, guestToken } = useAuthStore();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrate();
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!token && !guestToken) {
      router.replace(`/join/${id}`);
      return;
    }
    loadPhotos();
  }, [hydrated, token, guestToken]);

  async function loadPhotos() {
    try {
      const res = await api.get(`/trips/${id}/gallery`);
      setPhotos(res.data);
    } catch {
      router.replace('/');
    } finally {
      setLoading(false);
    }
  }

  function handleUploaded(photo: GalleryPhoto) {
    setPhotos((prev) => [photo, ...prev]);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={`/trip/${id}`} className={styles.back}>
          ←
        </Link>
        <h1 className={styles.title}>Gallery</h1>
      </header>

      <PhotoUpload tripId={id} onUploaded={handleUploaded} />

      {loading ? (
        <div className={styles.loading}>Loading photos...</div>
      ) : (
        <GalleryGrid photos={photos} tripId={id} />
      )}
    </div>
  );
}
