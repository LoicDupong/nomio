import { Router, Response } from 'express';
import { anyMember, MemberRequest } from '../middleware/anyMember';
import { upload } from '../middleware/upload';
import { Pin, TripMember, GalleryPhoto } from '../models';
import { getIO } from '../socket';

const router = Router();

// GET /trips/:id/pins
router.get('/:id/pins', anyMember, async (req: MemberRequest, res: Response) => {
  try {
    const pins = await Pin.findAll({
      where: { trip_id: req.params.id },
      include: [
        {
          model: TripMember,
          as: 'member',
          attributes: ['id', 'guest_name', 'user_id'],
        },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(pins);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /trips/:id/pins
router.post('/:id/pins', anyMember, upload.single('photo'), async (req: MemberRequest, res: Response) => {
  const { title, category, note } = req.body;
  const lat = parseFloat(req.body.lat);
  const lng = parseFloat(req.body.lng);

  if (!title || !category || isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'title, category, lat, lng are required' });
  }

  const validCategories = ['food', 'spot', 'hotel', 'activity'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
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
      category,
      photo_url,
    });

    // Auto-insert into gallery if photo uploaded
    if (photo_url) {
      await GalleryPhoto.create({
        trip_id: tripId,
        member_id: req.memberId!,
        pin_id: pin.id,
        url: photo_url,
      });
    }

    const pinWithMember = await Pin.findByPk(pin.id, {
      include: [
        {
          model: TripMember,
          as: 'member',
          attributes: ['id', 'guest_name', 'user_id'],
        },
      ],
    });

    // Broadcast via Socket.io (getIO is a stub until Task 8, but wrapped in try/catch)
    try {
      getIO().to(`trip:${tripId}`).emit('pin:added', pinWithMember);
    } catch {
      // Socket not initialized yet — OK in dev before Task 8
    }

    res.status(201).json(pinWithMember);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
