import { GalleryPhoto } from '../models';

export const PHOTOS_LIMIT = 100;
export const BYTES_LIMIT = 1_073_741_824; // 1 GB

export interface TripStorage {
  photos_used: number;
  photos_limit: number;
  bytes_used: number;
  bytes_limit: number;
}

export class QuotaError extends Error {
  constructor(
    public readonly code: 'PHOTO_LIMIT' | 'STORAGE_LIMIT',
    message: string
  ) {
    super(message);
    this.name = 'QuotaError';
  }
}

export async function getTripStorage(tripId: string): Promise<TripStorage> {
  const photos = await GalleryPhoto.findAll({
    where: { trip_id: tripId },
    attributes: ['size_bytes'],
  });

  const photos_used = photos.length;
  const bytes_used = photos.reduce((sum, p) => sum + (p.size_bytes ?? 0), 0);

  return {
    photos_used,
    photos_limit: PHOTOS_LIMIT,
    bytes_used,
    bytes_limit: BYTES_LIMIT,
  };
}

export async function checkTripQuota(
  tripId: string,
  additionalBytes = 0
): Promise<void> {
  const storage = await getTripStorage(tripId);

  if (storage.photos_used >= PHOTOS_LIMIT) {
    throw new QuotaError(
      'PHOTO_LIMIT',
      'This trip has reached the maximum of 100 photos.'
    );
  }

  if (storage.bytes_used + additionalBytes > BYTES_LIMIT) {
    throw new QuotaError(
      'STORAGE_LIMIT',
      additionalBytes > 0
        ? 'Upload failed: adding this photo would exceed the storage limit.'
        : 'This trip has reached its 1 GB storage limit.'
    );
  }
}
