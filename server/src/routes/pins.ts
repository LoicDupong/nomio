import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { anyMember, MemberRequest } from '../middleware/anyMember';
import { upload } from '../middleware/upload';
import { Pin, TripMember, GalleryPhoto, User } from '../models';
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

    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

    try {
      const tripId = String(req.params.id);
      const pin = await Pin.create({
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

      if (photo_url) {
        await GalleryPhoto.create({
          trip_id: tripId,
          member_id: req.memberId!,
          pin_id: pin.id,
          url: photo_url,
        });
      }

      const pinWithMember = await Pin.findByPk(pin.id, { include: pinInclude() });

      try {
        getIO().to(`trip:${tripId}`).emit('pin:added', pinWithMember);
      } catch {}

      res.status(201).json(pinWithMember);
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /trips/:id/pins/:pinId — edit own pin (no photo replacement)
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

    // rating / budget: null means "clear", undefined means "don't update"
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

    // Validation
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

// DELETE /trips/:id/pins/:pinId — delete own pin + gallery entry + file
router.delete('/:id/pins/:pinId', anyMember, async (req: MemberRequest, res: Response) => {
  try {
    const pin = await Pin.findOne({
      where: { id: req.params.pinId, trip_id: req.params.id },
    });

    if (!pin) return res.status(404).json({ error: 'Pin not found' });
    if (pin.member_id !== req.memberId) return res.status(403).json({ error: 'Not allowed' });

    // Delete associated gallery entries
    await GalleryPhoto.destroy({ where: { pin_id: pin.id } });

    // Delete physical file if exists
    if (pin.photo_url) {
      const filename = pin.photo_url.replace('/uploads/', '');
      const filepath = path.join(__dirname, '..', '..', 'uploads', filename);
      fs.unlink(filepath, () => {}); // fire and forget — pin deleted regardless
    }

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
