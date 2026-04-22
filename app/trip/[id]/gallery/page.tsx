'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useTripStore } from '@/store/tripStore';
import { GalleryPhoto } from '@/types';
import GalleryGrid from '@/components/Gallery/GalleryGrid';
import PhotoUpload from '@/components/Gallery/PhotoUpload';
import StorageBar from '@/components/Gallery/StorageBar';
import styles from './page.module.scss';

export default function GalleryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hydrate, token, guestToken, user } = useAuthStore();
  const { storage, setStorage, updateStorageAfterUpload, updateStorageAfterDelete } = useTripStore();

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Derive guest member ID from token
  let guestMemberId: string | null = null;
  if (guestToken) {
    try {
      const payload = JSON.parse(atob(guestToken.split('.')[1]));
      guestMemberId = payload.member_id ?? null;
    } catch { /* ignore */ }
  }

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
    loadAll();
  }, [hydrated, token, guestToken]);

  async function loadAll() {
    try {
      const [photosRes, storageRes] = await Promise.all([
        api.get(`/trips/${id}/gallery`),
        api.get(`/trips/${id}/storage`),
      ]);
      setPhotos(photosRes.data);
      setStorage(storageRes.data);
    } catch {
      router.replace('/');
    } finally {
      setLoading(false);
    }
  }

  function handleUploaded(photo: GalleryPhoto) {
    setPhotos((prev) => [photo, ...prev]);
    updateStorageAfterUpload(photo.size_bytes ?? 0);
  }

  function handlePhotoDeleted(photoId: string, sizeBytes: number) {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    updateStorageAfterDelete(sizeBytes);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={`/trip/${id}`} className={styles.back}>
          ←
        </Link>
        <h1 className={styles.title}>Gallery</h1>
      </header>

      {storage && <StorageBar storage={storage} />}

      <PhotoUpload tripId={id} storage={storage} onUploaded={handleUploaded} />

      {loading ? (
        <div className={styles.loading}>Loading photos...</div>
      ) : (
        <GalleryGrid
          photos={photos}
          tripId={id}
          userId={user?.id ?? null}
          guestMemberId={guestMemberId}
          onPhotoDeleted={handlePhotoDeleted}
        />
      )}
    </div>
  );
}
