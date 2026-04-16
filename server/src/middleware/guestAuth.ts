import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface GuestRequest extends Request {
  guest?: { member_id: string; trip_id: string; guest_name: string };
}

export function verifyGuest(req: GuestRequest, res: Response, next: NextFunction) {
  const token = req.headers['x-guest-token'] as string;
  if (!token) return res.status(401).json({ error: 'No guest token' });

  try {
    const payload = jwt.verify(token, process.env.GUEST_JWT_SECRET!) as {
      member_id: string;
      trip_id: string;
      guest_name: string;
    };
    req.guest = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid guest token' });
  }
}
