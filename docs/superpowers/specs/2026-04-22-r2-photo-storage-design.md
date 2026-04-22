# Design Spec — Cloudflare R2 Photo Storage Integration
**Date:** 2026-04-22
**Project:** Nomio (travel-memory-map)
**Branch:** feature/mvp-build

---

## Overview

Replace ephemeral local disk storage (`server/uploads/`) with Cloudflare R2 (S3-compatible). Add image optimisation via `sharp`, enforce per-trip quotas (100 photos / 1 GB), surface usage in the UI, and allow gallery photo deletion with R2 cleanup.

---

## Architecture

```
Browser
  → POST multipart/form-data → Express backend
      → multer (memoryStorage, 15 MB raw limit)
      → quota check (count + bytes)
      → sharp (resize → WebP, max 1920px, quality 82)
      → second quota check (final bytes vs remaining)
      → uploadToR2 (S3-compatible PUT)
      → DB write (GalleryPhoto + pin.photo_url)
      → rollback R2 if DB write fails
  ← JSON response with photo metadata
```

Upload pipeline approach: **Direct via Express** (Option A). Backend is single point of truth. Enables pre-storage quota enforcement and sharp processing before anything is persisted.

---

## DB Schema Changes

### GalleryPhoto — two new fields

| Field | Type | Nullable | Purpose |
|-------|------|----------|---------|
| `storage_key` | STRING | YES | R2 object key (e.g. `trips/abc/uuid.webp`). Used for deletion. Null on legacy rows. |
| `size_bytes` | INTEGER | YES | Final size after sharp processing. Used for quota calculation. Null on legacy rows. |

No other models change. `Pin.photo_url` continues to store the public URL.

**Migration:** Sequelize `sync()` handles ALTER TABLE automatically. Legacy rows get NULL for both fields; they are excluded from quota calculation (counted as 0 bytes).

---

## Backend

### New files

#### `server/src/lib/r2.ts`
- Initialises `S3Client` with R2 endpoint (`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`)
- Exports `uploadToR2(key, buffer, contentType): Promise<void>`
- Exports `deleteFromR2(key): Promise<void>`
- Fails at startup with a clear error if any R2 env var is missing
- Key format: `trips/<trip_id>/<uuid>.webp`

#### `server/src/lib/processImage.ts`
- Accepts a `Buffer` from multer memory storage
- Sharp pipeline: resize to max 1920×1920 (fit inside, no upscale), convert to WebP, quality 82
- Returns `{ buffer: Buffer, size: number, contentType: 'image/webp' }`

#### `server/src/lib/quotas.ts`
- `getTripStorage(tripId)` — queries GalleryPhoto, returns `{ photos_used, bytes_used }`
- `checkTripQuota(tripId, additionalBytes)` — throws `QuotaError` if count ≥ 100 or bytes_used + additionalBytes > 1 GB

### Modified files

#### `server/src/middleware/upload.ts`
- Switch from `diskStorage` to `memoryStorage`
- Raw file size limit: 15 MB (multer rejects before processing)
- MIME filter unchanged (jpeg, png, webp)

#### `server/src/routes/pins.ts`
**POST /:id/pins** — updated upload flow:
1. multer memoryStorage
2. `checkTripQuota` (pre-check on count)
3. `processImage` → WebP buffer
4. `checkTripQuota` (final check with actual bytes)
5. `uploadToR2` → get public URL from `R2_PUBLIC_BASE_URL/key`
6. `Pin.create` + `GalleryPhoto.create` with `storage_key`, `size_bytes`, `url`
7. On DB failure: `deleteFromR2(key)` rollback

**DELETE /:id/pins/:pinId** — updated cleanup:
1. `deleteFromR2(galleryPhoto.storage_key)` if storage_key present
2. `GalleryPhoto.destroy`
3. `Pin.destroy`
4. Emit `pin:deleted` + `gallery:photo_deleted`

#### `server/src/routes/gallery.ts`
**POST /:id/gallery** — same pipeline as pin upload (quota → processImage → R2 → DB).

**NEW: DELETE /:id/gallery/:photoId**
1. Auth: verify `photo.member_id === req.memberId`
2. If `photo.pin_id`: set `Pin.photo_url = null`, emit `pin:updated`
3. `deleteFromR2(photo.storage_key)` if storage_key present
4. `GalleryPhoto.destroy()`
5. Emit `gallery:photo_deleted`
6. Response: `{ photoId }`

**NEW: GET /:id/storage** (moved from a dedicated route to gallery.ts for cohesion)
- Queries GalleryPhoto for trip
- Returns:
```json
{
  "photos_used": 47,
  "photos_limit": 100,
  "bytes_used": 327155712,
  "bytes_limit": 1073741824
}
```

#### `server/src/models/GalleryPhoto.ts`
Add `storage_key: DataTypes.STRING` and `size_bytes: DataTypes.INTEGER`, both `allowNull: true`.

#### `server/.env.example`
Add:
```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=
```

### Robustness rules
- Multer rejects files > 15 MB before any processing
- Quota checked twice: before processing (count) and after (final bytes)
- R2 upload rollback if DB write fails
- No DB write if R2 upload fails
- `storage_key` null-safe in delete handlers (legacy photos skipped silently)
- If `deleteFromR2` fails during a delete operation: log the error, continue DB deletion anyway — DB consistency takes priority over storage cleanup
- R2 client throws at startup if env vars missing (not at request time)

### New packages to install
```
server: @aws-sdk/client-s3, sharp
server devDeps: @types/sharp (if needed)
```

---

## Frontend

### Store — `store/tripStore.ts`
Add to state:
```ts
storage: TripStorage | null  // { photos_used, photos_limit, bytes_used, bytes_limit }
setStorage(s: TripStorage): void
updateStorageAfterUpload(sizeBytes: number): void
updateStorageAfterDelete(sizeBytes: number): void
```

### New components

#### `components/Gallery/StorageBar.tsx`
Displayed in the Gallery view above the photo grid.
- Shows: `47 / 100 photos · 312 MB / 1 GB`
- Progress bar: fills based on bytes_used / bytes_limit
- Warning style (orange) if > 80% used
- Error style (red) if at limit

#### `components/Gallery/DeletePhotoModal.tsx`
Confirmation modal triggered by delete icon on a photo.
- If photo has `pin_id`:
  > "⚠️ This photo is linked to a pin on the map. Deleting it will remove it from the pin too. The pin will remain on the map."
- Buttons: **Delete photo** (destructive, red) + **Cancel**
- Loading state during DELETE request

### Modified components

#### `components/Gallery/GalleryGrid.tsx`
- Delete icon on each photo card (visible on hover desktop / always visible mobile)
- Only shown for own photos (`photo.member_id === currentMemberId`)
- Click → opens `DeletePhotoModal`
- On confirmed delete: remove photo from local list, call `updateStorageAfterDelete`

#### `components/Gallery/PhotoUpload.tsx`
- Reads `storage` from tripStore
- Disables file input + shows message if `photos_used >= photos_limit`
- Shows upload progress ("Uploading...")
- On error: displays human-readable message (not raw HTTP error)
  - 507 → "This trip has reached its 1 GB storage limit."
  - 403/409 → "This trip has reached the maximum of 100 photos."
  - Generic → "Upload failed. Please try again."
- On success: calls `updateStorageAfterUpload(photo.size_bytes)`

#### `components/Map/PinForm.tsx`
- Same quota-aware behaviour as PhotoUpload for the photo field
- Disables photo input + tooltip if trip is at photo limit
- Shows error inline below photo field on failure

#### `components/Map/PinDetailModal.tsx`
- Listens to socket event `pin:updated` — if `photo_url` becomes null, hides photo section gracefully

### Socket events (additions)
- `gallery:photo_deleted` — `{ photoId, pinId? }` — frontend removes photo from gallery store, calls `updateStorageAfterDelete`

### Error messages (frontend copy)
| Situation | Message |
|-----------|---------|
| Count limit reached | "This trip has reached the maximum of 100 photos." |
| Storage limit reached | "This trip has reached its 1 GB storage limit." |
| Upload would exceed | "Upload failed: adding this photo would exceed the storage limit." |
| Generic upload error | "Upload failed. Please try again." |
| Delete with pin warning | "⚠️ This photo is linked to a pin on the map. Deleting it will remove it from the pin too. The pin will remain on the map." |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_BASE_URL` | Public base URL for assets (e.g. `https://assets.nomio.app`) |

All 5 required. Server fails to start with a clear error if any is missing.

---

## Quota Constants

| Limit | Value |
|-------|-------|
| Max photos per trip | 100 |
| Max storage per trip | 1 GB (1,073,741,824 bytes) |
| Raw upload limit (multer) | 15 MB |
| Max output dimensions | 1920 × 1920 px (fit, no upscale) |
| Output format | WebP |
| Output quality | 82 |

---

## Files Summary

### New files
- `server/src/lib/r2.ts`
- `server/src/lib/processImage.ts`
- `server/src/lib/quotas.ts`
- `components/Gallery/StorageBar.tsx`
- `components/Gallery/StorageBar.module.scss`
- `components/Gallery/DeletePhotoModal.tsx`
- `components/Gallery/DeletePhotoModal.module.scss`

### Modified files
- `server/src/models/GalleryPhoto.ts`
- `server/src/middleware/upload.ts`
- `server/src/routes/pins.ts`
- `server/src/routes/gallery.ts`
- `server/.env.example`
- `store/tripStore.ts`
- `components/Gallery/GalleryGrid.tsx`
- `components/Gallery/PhotoUpload.tsx`
- `components/Map/PinForm.tsx`
- `components/Map/PinDetailModal.tsx`

---

## Manual Test Checklist

1. Upload photo via pin → appears in gallery, pin shows photo, storage stats update
2. Upload photo directly to gallery → appears in gallery, no pin association
3. Upload fails when trip has 100 photos → correct error message shown
4. Upload fails when trip storage > 1 GB → correct error message shown
5. Delete standalone gallery photo → removed from gallery, storage stats update
6. Delete gallery photo linked to pin → confirmation modal shows warning, pin loses photo but stays on map
7. Delete pin with photo → photo removed from gallery and R2, pin gone from map
8. StorageBar shows correct counts and progress, turns orange at 80%+
9. PhotoUpload input disabled when at 100 photo limit
10. R2 delete fails gracefully (log error, DB still cleaned up)
