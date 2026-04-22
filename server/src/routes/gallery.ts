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
