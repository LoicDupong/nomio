import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const { email, password, display_name } = req.body;
  if (!email || !password || !display_name) {
    return res.status(400).json({ error: 'email, password, display_name required' });
  }

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password_hash, display_name });

    const token = jwt.sign(
      { id: user.id, email: user.email, display_name: user.display_name },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, display_name: user.display_name },
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, display_name: user.display_name },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, display_name: user.display_name },
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
