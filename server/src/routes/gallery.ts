import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { anyMember, MemberRequest } from '../middleware/anyMember';
import { upload } from '../middleware/upload';
import { GalleryPhoto, TripMember, Pin, User } from '../models';

const router = Router();

// GET /trips/:id/gallery
router.get('/:id/gallery', anyMember, async (req: MemberRequest, res: Response) => {
  try {
    const tripId = String(req.params.id);

    // Lazy-migrate: create gallery_photos records for pins that have a photo_url
    // but no corresponding gallery_photos entry (e.g. pins created before this feature)
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
          include: [
            { model: User, as: 'user', attributes: ['id', 'display_name'] },
          ],
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

// POST /trips/:id/gallery — direct gallery upload (not from a pin)
router.post(
  '/:id/gallery',
  anyMember,
  (req, res, next) => {
    upload.single('photo')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'File upload error' });
      }
      next();
    });
  },
  async (req: MemberRequest, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'photo is required' });

    try {
      const tripId = String(req.params.id);
      const photo = await GalleryPhoto.create({
        trip_id: tripId,
        member_id: req.memberId!,
        pin_id: null,
        url: `/uploads/${req.file.filename}`,
      });
      res.status(201).json(photo);
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
