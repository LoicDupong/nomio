import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { anyMember, MemberRequest } from '../middleware/anyMember';
import { Trip, TripMember, User } from '../models';

const router = Router();

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function uniqueInviteCode(): Promise<string> {
  let code = generateInviteCode();
  let exists = await Trip.findOne({ where: { invite_code: code } });
  while (exists) {
    code = generateInviteCode();
    exists = await Trip.findOne({ where: { invite_code: code } });
  }
  return code;
}

// POST /trips — create a new trip (auth required)
router.post('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const invite_code = await uniqueInviteCode();
    const trip = await Trip.create({ name, invite_code, owner_id: req.user!.id });

    // Add owner as trip_member with role 'owner'
    await TripMember.create({
      trip_id: trip.id,
      user_id: req.user!.id,
      guest_name: null,
      role: 'owner',
    });

    res.status(201).json(trip);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /trips/:id — update trip name (owner only)
router.patch('/:id', verifyJWT, async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });

  try {
    const trip = await Trip.findByPk(String(req.params.id));
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.owner_id !== req.user!.id) return res.status(403).json({ error: 'Owner only' });

    await trip.update({ name: String(name).trim() });
    res.json(trip);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /trips/mine — user's trips (created + joined) — must be before /:id
router.get('/mine', verifyJWT, async (req: AuthRequest, res: Response) => {
  try {
    const memberships = await TripMember.findAll({
      where: { user_id: req.user!.id },
      attributes: ['role', 'trip_id'],
    });

    if (memberships.length === 0) return res.json([]);

    const tripIds = memberships.map((m) => m.trip_id);
    const roleMap = new Map(memberships.map((m) => [m.trip_id, m.role]));

    const trips = await Trip.findAll({
      where: { id: { [Op.in]: tripIds } },
      order: [['created_at', 'DESC']],
    });

    const result = trips.map((t) => ({ ...t.toJSON(), role: roleMap.get(t.id) }));
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /trips/:id — get trip with members (auth OR guest member access)
router.get('/:id', anyMember, async (req: MemberRequest, res: Response) => {
  try {
    const trip = await Trip.findByPk(String(req.params.id), {
      include: [
        {
          model: TripMember,
          as: 'members',
          include: [
            { model: User, as: 'user', attributes: ['id', 'display_name', 'email'] },
          ],
        },
      ],
    });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    res.json(trip);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
