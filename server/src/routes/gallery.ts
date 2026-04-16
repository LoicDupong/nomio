import { Router, Response } from 'express';
import { anyMember, MemberRequest } from '../middleware/anyMember';
import { upload } from '../middleware/upload';
import multer from 'multer';
import { GalleryPhoto, TripMember, Pin } from '../models';

const router = Router();

// GET /trips/:id/gallery
router.get('/:id/gallery', anyMember, async (req: MemberRequest, res: Response) => {
  try {
    const tripId = String(req.params.id);
    const photos = await GalleryPhoto.findAll({
      where: { trip_id: tripId },
      include: [
        { model: TripMember, as: 'member', attributes: ['id', 'guest_name', 'user_id'] },
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
