import { Request, Response, NextFunction } from 'express';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { TripMember } from '../models';
import { AuthRequest } from './auth';
import { GuestRequest } from './guestAuth';

export type MemberRequest = AuthRequest &
  GuestRequest & {
    memberId?: string;
  };

export async function anyMember(req: MemberRequest, res: Response, next: NextFunction) {
  const tripId = req.params.id || req.params.tripId;

  // Try JWT auth first
  const authHeader = req.headers.authorization?.split(' ')[1];
  if (authHeader) {
    let userId: string;
    try {
      const payload = jwt.verify(authHeader, process.env.JWT_SECRET!) as {
        id: string;
        email: string;
        display_name: string;
      };
      req.user = payload;
      userId = payload.id;
    } catch (err) {
      if (!(err instanceof JsonWebTokenError)) {
        // Not a JWT error — unexpected, fall through to guest or return 500
        return res.status(500).json({ error: 'Internal server error' });
      }
      // JWT is invalid — fall through to guest check
      userId = '';
    }

    if (userId) {
      try {
        const member = await TripMember.findOne({ where: { trip_id: tripId, user_id: userId } });
        if (!member) return res.status(403).json({ error: 'Not a trip member' });
        req.memberId = member.id;
        return next();
      } catch {
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Try guest token
  const guestToken = req.headers['x-guest-token'] as string;
  if (guestToken) {
    try {
      const payload = jwt.verify(guestToken, process.env.GUEST_JWT_SECRET!) as {
        member_id: string;
        trip_id: string;
        guest_name: string;
      };
      if (payload.trip_id !== tripId) return res.status(403).json({ error: 'Token trip mismatch' });
      req.guest = payload;
      req.memberId = payload.member_id;
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid guest token' });
    }
  }

  return res.status(401).json({ error: 'Authentication required' });
}
