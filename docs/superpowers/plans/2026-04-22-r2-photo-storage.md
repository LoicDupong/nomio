# R2 Photo Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ephemeral local disk storage with Cloudflare R2, add sharp image optimisation, enforce per-trip quotas (100 photos / 1 GB), and surface usage in the UI with gallery photo deletion.

**Architecture:** multer memoryStorage → sharp (resize → WebP) → quota check → R2 upload → DB write. Backend is the single source of truth. R2 client validates env vars at call time so the app boots without keys configured.

**Tech Stack:** `@aws-sdk/client-s3`, `sharp`, Sequelize, Next.js App Router, Zustand, SCSS Modules

**Spec:** `docs/superpowers/specs/2026-04-22-r2-photo-storage-design.md`

---

## File Map

### New files
| Path | Responsibility |
|------|---------------|
| `server/src/lib/processImage.ts` | sharp pipeline: resize → WebP → buffer |
| `server/src/lib/r2.ts` | S3Client + uploadToR2, deleteFromR2, buildStorageKey |
| `server/src/lib/quotas.ts` | getTripStorage, checkTripQuota, QuotaError |
| `components/Gallery/StorageBar.tsx` | trip storage usage display |
| `components/Gallery/StorageBar.module.scss` | StorageBar styles |
| `components/Gallery/DeletePhotoModal.tsx` | delete confirmation with pin-link warning |
| `components/Gallery/DeletePhotoModal.module.scss` | DeletePhotoModal styles |

### Modified files
| Path | What changes |
|------|-------------|
| `server/src/models/GalleryPhoto.ts` | + storage_key, size_bytes fields |
| `server/src/middleware/upload.ts` | diskStorage → memoryStorage, limit 15 MB |
| `server/src/routes/pins.ts` | POST: full pipeline; DELETE: R2 cleanup |
| `server/src/routes/gallery.ts` | POST: full pipeline; + DELETE endpoint; + GET /storage |
| `server/.env.example` | + R2 variables |
| `types/index.ts` | + size_bytes on GalleryPhoto; + TripStorage interface |
| `store/tripStore.ts` | + storage state + setStorage, updateStorageAfterUpload, updateStorageAfterDelete |
| `components/Gallery/GalleryGrid.tsx` | + delete button + DeletePhotoModal |
| `components/Gallery/PhotoUpload.tsx` | quota awareness + human error messages |
| `app/trip/[id]/gallery/page.tsx` | fetch storage, handle delete, pass userId/guestMemberId |
| `components/Map/PinForm.tsx` | quota awareness for photo field |

---

## Task 1 — Install server dependencies

**Files:** `server/package.json` (modified by npm)

- [ ] **Step 1: Install packages**

```bash
cd server && npm install @aws-sdk/client-s3 sharp
```

Expected: both packages appear under `dependencies` in `server/package.json`. Sharp installs a native binary — on Railway (Linux) this works fine.

- [ ] **Step 2: Verify installation**

```bash
cd server && node -e "require('@aws-sdk/client-s3'); require('sharp'); console.log('OK')"
```

Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore(server): add @aws-sdk/client-s3 and sharp"
```

---

## Task 2 — Update GalleryPhoto model

**Files:**
- Modify: `server/src/models/GalleryPhoto.ts`

- [ ] **Step 1: Replace the file with updated model**

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

interface GalleryPhotoAttributes {
  id: string;
  trip_id: string;
  member_id: string;
  pin_id: string | null;
  url: string;
  storage_key: string | null;
  size_bytes: number | null;
  created_at?: Date;
}

interface GalleryPhotoCreationAttributes
  extends Optional<GalleryPhotoAttributes, 'id' | 'created_at' | 'storage_key' | 'size_bytes'> {}

export class GalleryPhoto
  extends Model<GalleryPhotoAttributes, GalleryPhotoCreationAttributes>
  implements GalleryPhotoAttributes
{
  public id!: string;
  public trip_id!: string;
  public member_id!: string;
  public pin_id!: string | null;
  public url!: string;
  public storage_key!: string | null;
  public size_bytes!: number | null;
  public created_at!: Date;
}

GalleryPhoto.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    trip_id: { type: DataTypes.UUID, allowNull: false },
    member_id: { type: DataTypes.UUID, allowNull: false },
    pin_id: { type: DataTypes.UUID, allowNull: true },
    url: { type: DataTypes.STRING, allowNull: false },
    storage_key: { type: DataTypes.STRING, allowNull: true },
    size_bytes: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'gallery_photos', timestamps: false }
);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors related to GalleryPhoto.

- [ ] **Step 3: Commit**

```bash
git add server/src/models/GalleryPhoto.ts
git commit -m "feat(db): add storage_key and size_bytes to gallery_photos"
```

---

## Task 3 — Switch upload middleware to memoryStorage

**Files:**
- Modify: `server/src/middleware/upload.ts`

- [ ] **Step 1: Replace the file**

```typescript
import multer from 'multer';
import { Request } from 'express';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 15 * 1024 * 1024; // 15 MB raw limit before processing

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only jpeg, png, and webp images are allowed'));
  }
}

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/upload.ts
git commit -m "feat(server): switch multer to memoryStorage (15 MB limit)"
```

---

## Task 4 — Create processImage.ts

**Files:**
- Create: `server/src/lib/processImage.ts`

- [ ] **Step 1: Create the file**

```typescript
import sharp from 'sharp';

const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 82;

export interface ProcessedImage {
  buffer: Buffer;
  size: number;
  contentType: 'image/webp';
}

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const buffer = await sharp(input)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return {
    buffer,
    size: buffer.length,
    contentType: 'image/webp',
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server/src/lib/processImage.ts
git commit -m "feat(server): add sharp image processing pipeline (1920px max, WebP q82)"
```

---

## Task 5 — Create r2.ts

**Files:**
- Create: `server/src/lib/r2.ts`

- [ ] **Step 1: Create the file**

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

function getConfig() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    throw new Error(
      'R2 not configured: one or more R2_* environment variables are missing. ' +
      'Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL'
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

function createClient() {
  const { accountId, accessKeyId, secretAccessKey } = getConfig();
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { bucket, publicBaseUrl } = getConfig();
  const client = createClient();

  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType })
  );

  return `${publicBaseUrl}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  const { bucket } = getConfig();
  const client = createClient();

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function buildStorageKey(tripId: string, filename: string): string {
  return `trips/${tripId}/${filename}`;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server/src/lib/r2.ts
git commit -m "feat(server): add Cloudflare R2 client (uploadToR2, deleteFromR2)"
```

---

## Task 6 — Create quotas.ts

**Files:**
- Create: `server/src/lib/quotas.ts`

- [ ] **Step 1: Create the file**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server/src/lib/quotas.ts
git commit -m "feat(server): add quota system (100 photos / 1 GB per trip)"
```

---

## Task 7 — Update server/.env.example

**Files:**
- Modify: `server/.env.example`

- [ ] **Step 1: Append R2 variables to the file**

Replace the full content of `server/.env.example` with:

```
# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@localhost:5432/travel_map

# JWT secret for authenticated users (generate with: openssl rand -hex 64)
JWT_SECRET=your_jwt_secret_here

# JWT secret for guest tokens (generate with: openssl rand -hex 32)
GUEST_JWT_SECRET=your_guest_jwt_secret_here

# Frontend URL — used for CORS (Express + Socket.io)
CLIENT_URL=http://localhost:3000

# Server port
PORT=4000

# Cloudflare R2 — object storage for photo uploads
# Get these from: Cloudflare Dashboard → R2 → Manage R2 API Tokens
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_bucket_name
# Public base URL for serving R2 objects (custom domain or r2.dev URL)
R2_PUBLIC_BASE_URL=https://assets.your-domain.com
```

- [ ] **Step 2: Commit**

```bash
git add server/.env.example
git commit -m "docs(server): add R2 environment variables to .env.example"
```

---

## Task 8 — Update pins.ts routes

**Files:**
- Modify: `server/src/routes/pins.ts`

- [ ] **Step 1: Replace the full file**

```typescript
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { anyMember, MemberRequest } from '../middleware/anyMember';
import { upload } from '../middleware/upload';
import { Pin, TripMember, GalleryPhoto, User } from '../models';
import { processImage } from '../lib/processImage';
import { uploadToR2, deleteFromR2, buildStorageKey } from '../lib/r2';
import { checkTripQuota, QuotaError } from '../lib/quotas';
import { getIO } from '../socket';

const router = Router();

const VALID_CATEGORIES = ['food', 'spot', 'hotel', 'activity'] as const;
type ValidCategory = typeof VALID_CATEGORIES[number];

function pinInclude() {
  return [
    {
      model: TripMember,
      as: 'member',
      attributes: ['id', 'guest_name', 'user_id', 'role'],
      include: [{ model: User, as: 'user', attributes: ['id', 'display_name'] }],
    },
  ];
}

// GET /trips/:id/pins
router.get('/:id/pins', anyMember, async (req: MemberRequest, res: Response) => {
  try {
    const pins = await Pin.findAll({
      where: { trip_id: req.params.id },
      include: pinInclude(),
      order: [['created_at', 'DESC']],
    });
    res.json(pins);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /trips/:id/pins
router.post(
  '/:id/pins',
  anyMember,
  (req, res, next) => {
    upload.single('photo')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'File upload error' });
      next();
    });
  },
  async (req: MemberRequest, res: Response) => {
    const { title, note } = req.body;
    const category = String(req.body.category || '').trim().toLowerCase();
    const lat = parseFloat(req.body.lat);
    const lng = parseFloat(req.body.lng);
    const rating = req.body.rating ? parseInt(req.body.rating, 10) : null;
    const budget = req.body.budget ? parseFloat(req.body.budget) : null;

    if (!title || !category || isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'title, category, lat, lng are required' });
    }
    if (!VALID_CATEGORIES.includes(category as ValidCategory)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    if (rating !== null && (isNaN(rating) || rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'rating must be between 1 and 5' });
    }
    if (budget !== null && (isNaN(budget) || budget < 0)) {
      return res.status(400).json({ error: 'budget must be a positive number' });
    }

    const tripId = String(req.params.id);

    try {
      let photo_url: string | null = null;
      let storage_key: string | null = null;
      let size_bytes: number | null = null;

      if (req.file) {
        // Check quota (count only — fast, before processing)
        await checkTripQuota(tripId);

        // Process image
        const processed = await processImage(req.file.buffer);

        // Check quota with actual size
        await checkTripQuota(tripId, processed.size);

        // Upload to R2
        const key = buildStorageKey(tripId, `${uuidv4()}.webp`);
        photo_url = await uploadToR2(key, processed.buffer, processed.contentType);
        storage_key = key;
        size_bytes = processed.size;
      }

      let pin: Pin;
      try {
        pin = await Pin.create({
          trip_id: tripId,
          member_id: req.memberId!,
          lat,
          lng,
          title: String(title).trim(),
          note: note ? String(note).trim() : null,
          category: category as ValidCategory,
          photo_url,
          rating,
          budget,
        });
      } catch (dbErr) {
        // Rollback R2 upload if DB write fails
        if (storage_key) {
          await deleteFromR2(storage_key).catch((e) =>
            console.error('R2 rollback failed:', e)
          );
        }
        throw dbErr;
      }

      if (photo_url && storage_key && size_bytes !== null) {
        await GalleryPhoto.create({
          trip_id: tripId,
          member_id: req.memberId!,
          pin_id: pin.id,
          url: photo_url,
          storage_key,
          size_bytes,
        });
      }

      const pinWithMember = await Pin.findByPk(pin.id, { include: pinInclude() });

      try {
        getIO().to(`trip:${tripId}`).emit('pin:added', pinWithMember);
      } catch {}

      res.status(201).json(pinWithMember);
    } catch (err) {
      if (err instanceof QuotaError) {
        const status = err.code === 'PHOTO_LIMIT' ? 403 : 507;
        return res.status(status).json({ error: err.message, code: err.code });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /trips/:id/pins/:pinId
router.patch('/:id/pins/:pinId', anyMember, async (req: MemberRequest, res: Response) => {
  try {
    const pin = await Pin.findOne({
      where: { id: req.params.pinId, trip_id: req.params.id },
    });

    if (!pin) return res.status(404).json({ error: 'Pin not found' });
    if (pin.member_id !== req.memberId) return res.status(403).json({ error: 'Not allowed' });

    const { title, note } = req.body;
    const category = req.body.category !== undefined
      ? String(req.body.category).trim().toLowerCase()
      : undefined;

    let rating: number | null | undefined;
    if (req.body.rating === null || req.body.rating === '') {
      rating = null;
    } else if (req.body.rating !== undefined) {
      rating = parseInt(req.body.rating, 10);
    }

    let budget: number | null | undefined;
    if (req.body.budget === null || req.body.budget === '') {
      budget = null;
    } else if (req.body.budget !== undefined) {
      budget = parseFloat(req.body.budget);
    }

    if (title !== undefined && !String(title).trim()) {
      return res.status(400).json({ error: 'title cannot be empty' });
    }
    if (category !== undefined && !VALID_CATEGORIES.includes(category as ValidCategory)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    if (rating !== undefined && rating !== null && (isNaN(rating) || rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'rating must be between 1 and 5' });
    }
    if (budget !== undefined && budget !== null && (isNaN(budget) || budget < 0)) {
      return res.status(400).json({ error: 'budget must be a positive number' });
    }

    const updates: Partial<{
      title: string;
      note: string | null;
      category: ValidCategory;
      rating: number | null;
      budget: number | null;
    }> = {};

    if (title !== undefined) updates.title = String(title).trim();
    if (note !== undefined) updates.note = note ? String(note).trim() : null;
    if (category !== undefined) updates.category = category as ValidCategory;
    if (rating !== undefined) updates.rating = rating;
    if (budget !== undefined) updates.budget = budget;

    await pin.update(updates);

    const updatedPin = await Pin.findByPk(pin.id, { include: pinInclude() });

    try {
      getIO().to(`trip:${req.params.id}`).emit('pin:updated', updatedPin);
    } catch {}

    res.json(updatedPin);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /trips/:id/pins/:pinId
router.delete('/:id/pins/:pinId', anyMember, async (req: MemberRequest, res: Response) => {
  try {
    const pin = await Pin.findOne({
      where: { id: req.params.pinId, trip_id: req.params.id },
    });

    if (!pin) return res.status(404).json({ error: 'Pin not found' });
    if (pin.member_id !== req.memberId) return res.status(403).json({ error: 'Not allowed' });

    // Find gallery entry to get storage_key before destroying
    const galleryPhoto = await GalleryPhoto.findOne({ where: { pin_id: pin.id } });

    // Delete from R2 if storage_key exists (null = legacy disk-stored photo)
    if (galleryPhoto?.storage_key) {
      await deleteFromR2(galleryPhoto.storage_key).catch((e) =>
        console.error('R2 delete failed, continuing DB cleanup:', e)
      );
    }

    await GalleryPhoto.destroy({ where: { pin_id: pin.id } });

    const pinId = pin.id;
    const tripId = req.params.id;
    await pin.destroy();

    try {
      getIO().to(`trip:${tripId}`).emit('pin:deleted', { pinId });
    } catch {}

    res.status(200).json({ pinId });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/pins.ts
git commit -m "feat(server): integrate R2 + sharp + quota into pin upload/delete"
```

---

## Task 9 — Update gallery.ts routes

**Files:**
- Modify: `server/src/routes/gallery.ts`

- [ ] **Step 1: Replace the full file**

```typescript
import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { anyMember, MemberRequest } from '../middleware/anyMember';
import { upload } from '../middleware/upload';
import { GalleryPhoto, TripMember, Pin, User } from '../models';
import { processImage } from '../lib/processImage';
import { uploadToR2, deleteFromR2, buildStorageKey } from '../lib/r2';
import { checkTripQuota, getTripStorage, QuotaError } from '../lib/quotas';
import { getIO } from '../socket';

const router = Router();

// GET /trips/:id/gallery
router.get('/:id/gallery', anyMember, async (req: MemberRequest, res: Response) => {
  try {
    const tripId = String(req.params.id);

    // Lazy-migrate: create gallery_photos for pins that have photo_url but no gallery entry
    const pinsWithPhotos = await Pin.findAll({
      where: { trip_id: tripId, photo_url: { [Op.ne]: null } },
      attributes: ['id', 'trip_id', 'member_id', 'photo_url'],
    });

    if (pinsWithPhotos.length > 0) {
      const existingLinked = await GalleryPhoto.findAll({
        where: {
          trip_id: tripId,
          pin_id: { [Op.in]: pinsWithPhotos.map((p) => p.id) },
        },
        attributes: ['pin_id'],
      });
      const linkedPinIds = new Set(existingLinked.map((g) => g.pin_id));
      const missing = pinsWithPhotos.filter((p) => !linkedPinIds.has(p.id));
      if (missing.length > 0) {
        await GalleryPhoto.bulkCreate(
          missing.map((pin) => ({
            trip_id: pin.trip_id,
            member_id: pin.member_id,
            pin_id: pin.id,
            url: pin.photo_url as string,
            storage_key: null,
            size_bytes: null,
          }))
        );
      }
    }

    const photos = await GalleryPhoto.findAll({
      where: { trip_id: tripId },
      include: [
        {
          model: TripMember,
          as: 'member',
          attributes: ['id', 'guest_name', 'user_id'],
          include: [{ model: User, as: 'user', attributes: ['id', 'display_name'] }],
        },
        { model: Pin, as: 'pin', attributes: ['id', 'lat', 'lng', 'title'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(photos);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /trips/:id/storage
router.get('/:id/storage', anyMember, async (req: MemberRequest, res: Response) => {
  try {
    const storage = await getTripStorage(String(req.params.id));
    res.json(storage);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /trips/:id/gallery
router.post(
  '/:id/gallery',
  anyMember,
  (req, res, next) => {
    upload.single('photo')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'File upload error' });
      next();
    });
  },
  async (req: MemberRequest, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'photo is required' });

    const tripId = String(req.params.id);

    try {
      // Check quota (count — before processing)
      await checkTripQuota(tripId);

      // Process image
      const processed = await processImage(req.file.buffer);

      // Check quota with actual size
      await checkTripQuota(tripId, processed.size);

      // Upload to R2
      const key = buildStorageKey(tripId, `${uuidv4()}.webp`);
      const url = await uploadToR2(key, processed.buffer, processed.contentType);

      let photo: GalleryPhoto;
      try {
        photo = await GalleryPhoto.create({
          trip_id: tripId,
          member_id: req.memberId!,
          pin_id: null,
          url,
          storage_key: key,
          size_bytes: processed.size,
        });
      } catch (dbErr) {
        await deleteFromR2(key).catch((e) => console.error('R2 rollback failed:', e));
        throw dbErr;
      }

      res.status(201).json(photo);
    } catch (err) {
      if (err instanceof QuotaError) {
        const status = err.code === 'PHOTO_LIMIT' ? 403 : 507;
        return res.status(status).json({ error: err.message, code: err.code });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /trips/:id/gallery/:photoId
router.delete('/:id/gallery/:photoId', anyMember, async (req: MemberRequest, res: Response) => {
  try {
    const photo = await GalleryPhoto.findOne({
      where: { id: req.params.photoId, trip_id: req.params.id },
    });

    if (!photo) return res.status(404).json({ error: 'Photo not found' });
    if (photo.member_id !== req.memberId) return res.status(403).json({ error: 'Not allowed' });

    const tripId = req.params.id;
    const photoId = photo.id;
    const pinId = photo.pin_id;

    // If linked to a pin, clear pin.photo_url
    if (pinId) {
      await Pin.update({ photo_url: null }, { where: { id: pinId } });
      const updatedPin = await Pin.findByPk(pinId);
      try {
        getIO().to(`trip:${tripId}`).emit('pin:updated', updatedPin);
      } catch {}
    }

    // Delete from R2 — log failure but continue so DB stays clean
    if (photo.storage_key) {
      await deleteFromR2(photo.storage_key).catch((e) =>
        console.error('R2 delete failed, continuing DB cleanup:', e)
      );
    }

    await photo.destroy();

    try {
      getIO().to(`trip:${tripId}`).emit('gallery:photo_deleted', { photoId, pinId });
    } catch {}

    res.status(200).json({ photoId, pinId });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

- [ ] **Step 3: Manual verification — start the server**

```bash
cd server && npm run dev
```

Expected: server starts, DB syncs (Sequelize will ALTER TABLE to add storage_key + size_bytes). Check logs for `DB sync OK`.

- [ ] **Step 4: Test GET /storage returns correct shape**

```bash
# Replace TOKEN and TRIP_ID with real values from your DB
curl -H "Authorization: Bearer TOKEN" http://localhost:4000/trips/TRIP_ID/storage
```

Expected response shape:
```json
{"photos_used":0,"photos_limit":100,"bytes_used":0,"bytes_limit":1073741824}
```

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/gallery.ts
git commit -m "feat(server): add R2 pipeline, DELETE gallery photo, GET storage endpoint"
```

---

## Task 10 — Update frontend types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add size_bytes to GalleryPhoto and add TripStorage interface**

Add `size_bytes: number | null;` to the `GalleryPhoto` interface, and add the `TripStorage` interface at the bottom of the file.

Full updated `types/index.ts`:

```typescript
export type Category = 'food' | 'spot' | 'hotel' | 'activity';

export interface User {
  id: string;
  email: string;
  display_name: string;
}

export interface Trip {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  members?: TripMember[];
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string | null;
  guest_name: string | null;
  role: 'owner' | 'member';
  joined_at: string;
  user?: User;
}

export interface Pin {
  id: string;
  trip_id: string;
  member_id: string;
  lat: number;
  lng: number;
  title: string;
  note: string | null;
  category: Category;
  photo_url: string | null;
  rating: number | null;
  budget: number | null;
  created_at: string;
  member?: TripMember;
}

export interface GalleryPhoto {
  id: string;
  trip_id: string;
  member_id: string;
  pin_id: string | null;
  url: string;
  size_bytes: number | null;
  created_at: string;
  member?: TripMember;
  pin?: {
    id: string;
    lat: number;
    lng: number;
    title: string;
  };
}

export interface TripStorage {
  photos_used: number;
  photos_limit: number;
  bytes_used: number;
  bytes_limit: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat(types): add size_bytes to GalleryPhoto, add TripStorage interface"
```

---

## Task 11 — Update tripStore

**Files:**
- Modify: `store/tripStore.ts`

- [ ] **Step 1: Replace the full file**

```typescript
import { create } from 'zustand';
import { Trip, Pin, TripMember, Category, TripStorage } from '@/types';

interface TripStore {
  trip: Trip | null;
  pins: Pin[];
  members: TripMember[];
  selectedPin: Pin | null;
  focusPinId: string | null;
  activeFilters: Category[];
  storage: TripStorage | null;
  setTrip: (trip: Trip) => void;
  setPins: (pins: Pin[]) => void;
  addPin: (pin: Pin) => void;
  updatePin: (pin: Pin) => void;
  removePin: (pinId: string) => void;
  setMembers: (members: TripMember[]) => void;
  setSelectedPin: (pin: Pin | null) => void;
  setFocusPinId: (id: string | null) => void;
  toggleFilter: (cat: Category) => void;
  clearFilters: () => void;
  setStorage: (s: TripStorage) => void;
  updateStorageAfterUpload: (sizeBytes: number) => void;
  updateStorageAfterDelete: (sizeBytes: number) => void;
  reset: () => void;
}

export const useTripStore = create<TripStore>((set) => ({
  trip: null,
  pins: [],
  members: [],
  selectedPin: null,
  focusPinId: null,
  activeFilters: [],
  storage: null,

  setTrip: (trip) => set({ trip }),
  setPins: (pins) => set({ pins }),
  addPin: (pin) => set((state) => ({ pins: [pin, ...state.pins] })),
  updatePin: (pin) =>
    set((state) => ({
      pins: state.pins.map((p) => (p.id === pin.id ? pin : p)),
      selectedPin: state.selectedPin?.id === pin.id ? pin : state.selectedPin,
    })),
  removePin: (pinId) =>
    set((state) => ({
      pins: state.pins.filter((p) => p.id !== pinId),
      selectedPin: state.selectedPin?.id === pinId ? null : state.selectedPin,
    })),
  setMembers: (members) => set({ members }),
  setSelectedPin: (pin) => set({ selectedPin: pin }),
  setFocusPinId: (id) => set({ focusPinId: id }),
  toggleFilter: (cat) =>
    set((state) => ({
      activeFilters: state.activeFilters.includes(cat)
        ? state.activeFilters.filter((c) => c !== cat)
        : [...state.activeFilters, cat],
    })),
  clearFilters: () => set({ activeFilters: [] }),

  setStorage: (storage) => set({ storage }),
  updateStorageAfterUpload: (sizeBytes) =>
    set((state) => {
      if (!state.storage) return {};
      return {
        storage: {
          ...state.storage,
          photos_used: state.storage.photos_used + 1,
          bytes_used: state.storage.bytes_used + sizeBytes,
        },
      };
    }),
  updateStorageAfterDelete: (sizeBytes) =>
    set((state) => {
      if (!state.storage) return {};
      return {
        storage: {
          ...state.storage,
          photos_used: Math.max(0, state.storage.photos_used - 1),
          bytes_used: Math.max(0, state.storage.bytes_used - sizeBytes),
        },
      };
    }),

  reset: () =>
    set({
      trip: null,
      pins: [],
      members: [],
      selectedPin: null,
      focusPinId: null,
      activeFilters: [],
      storage: null,
    }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add store/tripStore.ts
git commit -m "feat(store): add storage state and quota update actions to tripStore"
```

---

## Task 12 — Create StorageBar component

**Files:**
- Create: `components/Gallery/StorageBar.tsx`
- Create: `components/Gallery/StorageBar.module.scss`

- [ ] **Step 1: Create StorageBar.tsx**

```typescript
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
```

- [ ] **Step 2: Create StorageBar.module.scss**

```scss
@use '@/styles/variables' as *;

.bar {
  padding: 0.75rem 1rem;
  background: $color-bg;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: $color-text-muted;
  margin-bottom: 0.5rem;
}

.divider {
  opacity: 0.4;
}

.stat {
  white-space: nowrap;
}

.track {
  height: 4px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.fill {
  height: 100%;
  background: $color-primary;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.warning .fill {
  background: #f59e0b;
}

.full .fill {
  background: #ef4444;
}

.fullMsg {
  margin: 0.5rem 0 0;
  font-size: 0.78rem;
  color: #ef4444;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Gallery/StorageBar.tsx components/Gallery/StorageBar.module.scss
git commit -m "feat(ui): add StorageBar component with photo count and byte usage"
```

---

## Task 13 — Create DeletePhotoModal component

**Files:**
- Create: `components/Gallery/DeletePhotoModal.tsx`
- Create: `components/Gallery/DeletePhotoModal.module.scss`

- [ ] **Step 1: Create DeletePhotoModal.tsx**

```typescript
'use client';
import { useState } from 'react';
import { GalleryPhoto } from '@/types';
import api from '@/lib/api';
import styles from './DeletePhotoModal.module.scss';

interface DeletePhotoModalProps {
  photo: GalleryPhoto;
  tripId: string;
  onDeleted: (photoId: string, sizeBytes: number) => void;
  onClose: () => void;
}

export default function DeletePhotoModal({
  photo,
  tripId,
  onDeleted,
  onClose,
}: DeletePhotoModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/trips/${tripId}/gallery/${photo.id}`);
      onDeleted(photo.id, photo.size_bytes ?? 0);
    } catch {
      setError('Delete failed. Please try again.');
      setDeleting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <h3 className={styles.title}>Delete photo?</h3>

        {photo.pin_id && (
          <p className={styles.warning}>
            ⚠️ This photo is linked to a pin on the map. Deleting it will remove it from the pin
            too. The pin will remain on the map.
          </p>
        )}

        {!photo.pin_id && (
          <p className={styles.body}>This action cannot be undone.</p>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnDelete}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create DeletePhotoModal.module.scss**

```scss
@use '@/styles/variables' as *;

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
}

.warning {
  font-size: 0.875rem;
  color: #92400e;
  background: #fef3c7;
  border-radius: 8px;
  padding: 0.75rem;
  margin: 0 0 1rem;
  line-height: 1.5;
}

.body {
  font-size: 0.875rem;
  color: $color-text-muted;
  margin: 0 0 1rem;
}

.error {
  font-size: 0.8rem;
  color: #ef4444;
  margin: 0 0 0.75rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.btnCancel {
  padding: 0.5rem 1rem;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btnDelete {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  background: #ef4444;
  color: white;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;

  &:hover:not(:disabled) {
    background: #dc2626;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Gallery/DeletePhotoModal.tsx components/Gallery/DeletePhotoModal.module.scss
git commit -m "feat(ui): add DeletePhotoModal with pin-link warning"
```

---

## Task 14 — Update GalleryGrid

**Files:**
- Modify: `components/Gallery/GalleryGrid.tsx`
- Modify: `components/Gallery/GalleryGrid.module.scss`

- [ ] **Step 1: Replace GalleryGrid.tsx**

```typescript
'use client';
import { useState } from 'react';
import { GalleryPhoto } from '@/types';
import { photoUrl } from '@/lib/photoUrl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot, faTrash } from '@fortawesome/free-solid-svg-icons';
import PhotoModal from './PhotoModal';
import DeletePhotoModal from './DeletePhotoModal';
import styles from './GalleryGrid.module.scss';

interface GalleryGridProps {
  photos: GalleryPhoto[];
  tripId: string;
  userId?: string | null;
  guestMemberId?: string | null;
  onPhotoDeleted?: (photoId: string, sizeBytes: number) => void;
}

export default function GalleryGrid({
  photos,
  tripId,
  userId,
  guestMemberId,
  onPhotoDeleted,
}: GalleryGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<GalleryPhoto | null>(null);

  function isOwnPhoto(photo: GalleryPhoto): boolean {
    if (guestMemberId) return photo.member_id === guestMemberId;
    if (userId) return photo.member?.user_id === userId;
    return false;
  }

  function handleDeleted(photoId: string, sizeBytes: number) {
    setPhotoToDelete(null);
    if (selectedPhoto?.id === photoId) setSelectedPhoto(null);
    onPhotoDeleted?.(photoId, sizeBytes);
  }

  return (
    <>
      <div className={styles.grid}>
        {photos.length === 0 && (
          <div className={styles.empty}>No photos yet. Add the first one!</div>
        )}
        {photos.map((photo) => (
          <div key={photo.id} className={styles.item}>
            <button
              type="button"
              className={styles.photoBtn}
              onClick={() => setSelectedPhoto(photo)}
              aria-label={photo.pin?.title ?? 'View photo'}
            >
              <img
                src={photoUrl(photo.url)!}
                alt={photo.pin?.title ?? ''}
                className={styles.photo}
                loading="lazy"
              />
              {photo.pin_id && (
                <div className={styles.overlay}>
                  <FontAwesomeIcon icon={faLocationDot} className={styles.overlayIcon} />
                </div>
              )}
            </button>

            {isOwnPhoto(photo) && (
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setPhotoToDelete(photo);
                }}
                aria-label="Delete photo"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            )}
          </div>
        ))}
      </div>

      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          tripId={tripId}
          onClose={() => setSelectedPhoto(null)}
        />
      )}

      {photoToDelete && (
        <DeletePhotoModal
          photo={photoToDelete}
          tripId={tripId}
          onDeleted={handleDeleted}
          onClose={() => setPhotoToDelete(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Update GalleryGrid.module.scss** — add `.item`, `.photoBtn`, and `.deleteBtn` rules, keeping existing rules intact

Replace the full file:

```scss
@use '@/styles/variables' as *;

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }
}

.item {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: $color-bg;

  &:hover .deleteBtn {
    opacity: 1;
  }

  &:hover .overlay {
    opacity: 1;
  }
}

.photoBtn {
  position: absolute;
  inset: 0;
  border: none;
  padding: 0;
  cursor: pointer;
  background: transparent;
  display: block;
  width: 100%;
  height: 100%;
}

.photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.overlayIcon {
  font-size: 1.5rem;
}

.deleteBtn {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 6px;
  color: white;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
  font-size: 0.75rem;

  @media (hover: none) {
    // Always visible on touch devices
    opacity: 1;
  }

  &:hover {
    background: #ef4444;
  }
}

.empty {
  grid-column: 1 / -1;
  padding: 3rem;
  text-align: center;
  color: $color-text-muted;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Gallery/GalleryGrid.tsx components/Gallery/GalleryGrid.module.scss
git commit -m "feat(ui): add delete button to GalleryGrid with DeletePhotoModal"
```

---

## Task 15 — Update PhotoUpload

**Files:**
- Modify: `components/Gallery/PhotoUpload.tsx`

- [ ] **Step 1: Replace the full file**

```typescript
'use client';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera } from '@fortawesome/free-solid-svg-icons';
import api from '@/lib/api';
import { GalleryPhoto, TripStorage } from '@/types';
import styles from './PhotoUpload.module.scss';

interface PhotoUploadProps {
  tripId: string;
  storage: TripStorage | null;
  onUploaded: (photo: GalleryPhoto) => void;
}

function getErrorMessage(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { error?: string } } };
  const status = e.response?.status;
  if (status === 403) return 'This trip has reached the maximum of 100 photos.';
  if (status === 507) return e.response?.data?.error ?? 'This trip has reached its 1 GB storage limit.';
  return 'Upload failed. Please try again.';
}

export default function PhotoUpload({ tripId, storage, onUploaded }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const isFull =
    storage !== null &&
    (storage.photos_used >= storage.photos_limit ||
      storage.bytes_used >= storage.bytes_limit);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const form = new FormData();
    form.append('photo', file);
    try {
      const res = await api.post(`/trips/${tripId}/gallery`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  if (isFull) {
    return (
      <div className={styles.upload}>
        <p className={styles.limitMsg}>
          {storage!.photos_used >= storage!.photos_limit
            ? 'This trip has reached the maximum of 100 photos.'
            : 'This trip has reached its 1 GB storage limit.'}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.upload}>
      {uploading ? (
        <div className={styles.uploading}>Uploading & optimising...</div>
      ) : (
        <label className={styles.label} htmlFor="gallery-upload">
          <FontAwesomeIcon icon={faCamera} /> Upload a photo to gallery
          <input
            id="gallery-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFile}
          />
        </label>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Add `.limitMsg` and `.error` to PhotoUpload.module.scss**

Read the current file first, then append these rules:

```scss
.limitMsg {
  font-size: 0.85rem;
  color: #ef4444;
  text-align: center;
  padding: 0.5rem 0;
}

.error {
  font-size: 0.8rem;
  color: #ef4444;
  margin-top: 0.5rem;
  text-align: center;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Gallery/PhotoUpload.tsx components/Gallery/PhotoUpload.module.scss
git commit -m "feat(ui): quota-aware PhotoUpload with human error messages"
```

---

## Task 16 — Update gallery page

**Files:**
- Modify: `app/trip/[id]/gallery/page.tsx`

- [ ] **Step 1: Replace the full file**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add app/trip/[id]/gallery/page.tsx
git commit -m "feat(ui): fetch storage stats, wire delete and upload into gallery page"
```

---

## Task 17 — Update PinForm for quota awareness

**Files:**
- Modify: `components/Map/PinForm.tsx`

- [ ] **Step 1: Add quota awareness to the photo section**

Only the photo label section and error handling change. Replace the full file:

```typescript
'use client';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faXmark } from '@fortawesome/free-solid-svg-icons';
import api from '@/lib/api';
import { photoUrl } from '@/lib/photoUrl';
import { Category, Pin } from '@/types';
import { useTripStore } from '@/store/tripStore';
import { CATEGORY_ICON, CATEGORY_LABEL } from '@/lib/categories';
import StarRating from './StarRating';
import styles from './PinForm.module.scss';

const CATEGORIES: Category[] = ['spot', 'food', 'hotel', 'activity'];

interface PinFormProps {
  tripId: string;
  lat: number;
  lng: number;
  onClose: () => void;
  pin?: Pin;
  onSuccess?: (updatedPin: Pin) => void;
}

function getPhotoErrorMessage(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { error?: string } } };
  const status = e.response?.status;
  if (status === 403) return 'This trip has reached the maximum of 100 photos.';
  if (status === 507) return e.response?.data?.error ?? 'This trip has reached its 1 GB storage limit.';
  return 'Failed to create pin';
}

export default function PinForm({ tripId, lat, lng, onClose, pin, onSuccess }: PinFormProps) {
  const isEdit = !!pin;
  const { storage, updateStorageAfterUpload } = useTripStore();

  const [title, setTitle] = useState(pin?.title ?? '');
  const [category, setCategory] = useState<Category>(pin?.category ?? 'spot');
  const [note, setNote] = useState(pin?.note ?? '');
  const [rating, setRating] = useState<number | null>(pin?.rating ?? null);
  const [budget, setBudget] = useState<number | null>(
    pin?.budget != null ? Number(pin.budget) : null
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const photoFull =
    !isEdit &&
    storage !== null &&
    (storage.photos_used >= storage.photos_limit ||
      storage.bytes_used >= storage.bytes_limit);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEdit && pin) {
        const body: Record<string, unknown> = {
          title,
          category,
          note: note || null,
          rating,
          budget,
        };
        const res = await api.patch(`/trips/${tripId}/pins/${pin.id}`, body);
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        const form = new FormData();
        form.append('title', title);
        form.append('category', category);
        form.append('lat', String(lat));
        form.append('lng', String(lng));
        if (note) form.append('note', note);
        if (rating !== null) form.append('rating', String(rating));
        if (budget !== null) form.append('budget', String(budget));
        if (photo) form.append('photo', photo);
        const res = await api.post(`/trips/${tripId}/pins`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        // If pin was created with a photo, update storage stats
        if (photo && res.data?.photo_url) {
          updateStorageAfterUpload(0); // size unknown here — storage will refresh on next gallery load
        }
        onClose();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string }; status?: number } };
      setError(
        isEdit
          ? e.response?.data?.error || 'Failed to update pin'
          : getPhotoErrorMessage(err)
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.sheet}>
        <div className={styles.handle} />

        <div className={styles.sheetHeader}>
          <h2 className={styles.title}>{isEdit ? 'Edit memory' : 'Add a memory'}</h2>
          <button type="button" className={styles.btnClose} onClick={onClose} aria-label="Close">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Category */}
          <div className={styles.categories}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`${styles.catBtn} ${category === cat ? styles.active : ''}`}
                onClick={() => setCategory(cat)}
              >
                <FontAwesomeIcon icon={CATEGORY_ICON[cat]} />
                <span>{CATEGORY_LABEL[cat]}</span>
              </button>
            ))}
          </div>

          {/* Title */}
          <div className={styles.field}>
            <label htmlFor="pin-title">Title *</label>
            <input
              id="pin-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What is this place?"
              required
              autoFocus={!isEdit}
            />
          </div>

          {/* Note */}
          <div className={styles.field}>
            <label htmlFor="pin-note">
              Note <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              id="pin-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tell the crew about this spot..."
            />
          </div>

          {/* Rating */}
          <div className={styles.ratingRow}>
            <span className={styles.ratingLabel}>Rating</span>
            <StarRating value={rating} onChange={setRating} />
            {rating !== null && (
              <button
                type="button"
                className={styles.clearRating}
                onClick={() => setRating(null)}
              >
                clear
              </button>
            )}
          </div>

          {/* Budget */}
          <div className={styles.field}>
            <label htmlFor="pin-budget">
              Budget <span className={styles.optional}>(optional)</span>
            </label>
            <div className={styles.inputWithAddon}>
              <span className={styles.addon}>€</span>
              <input
                id="pin-budget"
                type="number"
                min="0"
                step="0.01"
                value={budget ?? ''}
                onChange={(e) =>
                  setBudget(e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="0.00"
                className={styles.inputAddon}
              />
            </div>
          </div>

          {/* Photo */}
          {isEdit ? (
            pin?.photo_url ? (
              <img
                src={photoUrl(pin.photo_url)!}
                alt="Current photo"
                className={styles.photoPreview}
              />
            ) : null
          ) : photoFull ? (
            <p className={styles.photoLimit}>
              {storage!.photos_used >= storage!.photos_limit
                ? 'Trip photo limit reached (100 photos).'
                : 'Trip storage limit reached (1 GB).'}
            </p>
          ) : preview ? (
            <img src={preview} alt="Preview" className={styles.photoPreview} />
          ) : (
            <label className={styles.photoLabel}>
              <FontAwesomeIcon icon={faCamera} />
              <span>
                Add a photo <em>(optional)</em>
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhoto}
              />
            </label>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Save memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `.photoLimit` rule to PinForm.module.scss**

Read the file, then append:

```scss
.photoLimit {
  font-size: 0.8rem;
  color: #ef4444;
  padding: 0.5rem 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Map/PinForm.tsx components/Map/PinForm.module.scss
git commit -m "feat(ui): quota-aware photo field in PinForm"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Covered by |
|-----------------|-----------|
| Max 100 photos/trip | Task 6 (checkTripQuota), Task 8, Task 9 |
| Max 1 GB/trip | Task 6, Task 8, Task 9 |
| Block + error if limit | Task 8, Task 9 (403/507 response) |
| sharp resize before storage | Task 4, Task 8, Task 9 |
| Cloudflare R2 storage | Task 5 |
| storage_key + size_bytes in DB | Task 2 |
| GET /trips/:id/storage | Task 9 |
| DELETE gallery photo | Task 9 (endpoint), Task 13-14 (UI) |
| Delete clears pin.photo_url | Task 9 |
| Delete from R2 on pin delete | Task 8 |
| Delete from R2 on gallery delete | Task 9 |
| R2 rollback if DB write fails | Task 8, Task 9 |
| StorageBar UI | Task 12, Task 16 |
| Upload disabled at limit | Task 15, Task 17 |
| DeletePhotoModal with pin warning | Task 13 |
| .env.example updated | Task 7 |
| Graceful R2 failure on delete | Task 8, Task 9 (catch → log → continue) |
| memoryStorage (no disk) | Task 3 |

### Type consistency check
- `TripStorage` defined in `types/index.ts` (Task 10) — used in `store/tripStore.ts` (Task 11), `StorageBar.tsx` (Task 12), `PhotoUpload.tsx` (Task 15), `gallery/page.tsx` (Task 16) ✓
- `GalleryPhoto.size_bytes: number | null` defined in Task 10 — used in Task 13 (`photo.size_bytes ?? 0`), Task 16 (`photo.size_bytes ?? 0`) ✓
- `ProcessedImage` returned by `processImage()` (Task 4) — consumed in Task 8 and Task 9 as `{ buffer, size, contentType }` ✓
- `QuotaError` class (Task 6) — caught in Task 8 and Task 9 with `instanceof QuotaError` ✓
- `buildStorageKey(tripId, filename)` (Task 5) — called in Task 8 and Task 9 ✓
- `uploadToR2(key, buffer, contentType)` returns `Promise<string>` (Task 5) — used in Task 8 and Task 9 ✓
- `GalleryGrid` new props `userId`, `guestMemberId`, `onPhotoDeleted` (Task 14) — passed from gallery page (Task 16) ✓
- `PhotoUpload` new prop `storage: TripStorage | null` (Task 15) — passed from gallery page (Task 16) ✓

### Placeholder scan
None found. All code blocks are complete.

---

## Manual Test Checklist

After all tasks are complete:

- [ ] Server starts and Sequelize syncs (adds storage_key, size_bytes columns)
- [ ] `GET /trips/:id/storage` returns `{ photos_used, photos_limit, bytes_used, bytes_limit }`
- [ ] Gallery page shows StorageBar with correct counts
- [ ] Upload photo from gallery → appears in grid, StorageBar updates
- [ ] Upload photo with pin (create pin) → appears in gallery, pin shows photo
- [ ] Upload fails at 100 photos → "This trip has reached the maximum of 100 photos."
- [ ] Upload fails when storage full → "This trip has reached its 1 GB storage limit."
- [ ] Delete standalone gallery photo → removed from grid, StorageBar updates
- [ ] Delete gallery photo linked to pin → warning modal shown, confirmed → photo gone, pin stays on map with no photo (PinDetailModal hides photo section)
- [ ] Delete pin with photo → gallery photo gone, pin removed from map
- [ ] Delete icon only appears on own photos (not other members')
- [ ] PhotoUpload label disabled / limit message shown when at 100 photos
- [ ] StorageBar turns orange/red at 80%+ usage
- [ ] R2 not configured: upload fails with clear 500 error (not a crash)
