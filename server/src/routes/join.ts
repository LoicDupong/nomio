import { Router, Request, Response } from 'express';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { Trip, TripMember } from '../models';

const router = Router();

// POST /join/:code — join a trip via invite code
// Body: { guest_name } for guests, OR Authorization header with JWT for auth users
router.post('/:code', async (req: Request, res: Response) => {
  const { code } = req.params;

  try {
    const trip = await Trip.findOne({ where: { invite_code: String(code).toUpperCase() } });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    // Check if authenticated user
    const authHeader = req.headers.authorization?.split(' ')[1];
    if (authHeader) {
      try {
        const payload = jwt.verify(authHeader, process.env.JWT_SECRET!) as {
          id: string;
          email: string;
          display_name: string;
        };

        // Check if already a member — idempotent join
        let member = await TripMember.findOne({ where: { trip_id: trip.id, user_id: payload.id } });
        if (!member) {
          member = await TripMember.create({
            trip_id: trip.id,
            user_id: payload.id,
            guest_name: null,
            role: 'member',
          });
        }

        return res.json({ trip_id: trip.id, member_id: member.id, type: 'auth' });
      } catch (err) {
        if (!(err instanceof JsonWebTokenError)) {
          return res.status(500).json({ error: 'Internal server error' });
        }
        // Invalid JWT — fall through to guest flow
      }
    }

    // Guest flow
    const { guest_name } = req.body;
    if (!guest_name || String(guest_name).trim().length < 2) {
      return res.status(400).json({ error: 'guest_name is required (min 2 chars)' });
    }

    const member = await TripMember.create({
      trip_id: trip.id,
      user_id: null,
      guest_name: String(guest_name).trim(),
      role: 'member',
    });

    const guestToken = jwt.sign(
      { member_id: member.id, trip_id: trip.id, guest_name: member.guest_name },
      process.env.GUEST_JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.json({ trip_id: trip.id, member_id: member.id, guest_token: guestToken, type: 'guest' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
