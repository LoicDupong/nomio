import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { User, Feedback } from '../models';
import { requireAdmin, AdminRequest } from '../middleware/requireAdmin';
import { deleteFromR2 } from '../lib/r2';

const router = Router();

// POST /admin/login
router.post('/login', async (req, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.is_admin) return res.status(403).json({ error: 'Admin access required' });

    const token = jwt.sign(
      { id: user.id, email: user.email, isAdmin: true },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /admin/feedbacks
router.get('/feedbacks', requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { status, type, search } = req.query as Record<string, string>;

    const conditions: Record<string, unknown> = {};
    if (status && ['new', 'read', 'archived'].includes(status)) conditions.status = status;
    if (type && ['bug', 'feature', 'ui', 'other'].includes(type)) conditions.type = type;

    const where = search?.trim()
      ? {
          ...conditions,
          [Op.or]: [
            { title: { [Op.iLike]: `%${search.trim()}%` } },
            { message: { [Op.iLike]: `%${search.trim()}%` } },
          ],
        }
      : conditions;

    const feedbacks = await Feedback.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['display_name'] }],
      order: [['created_at', 'DESC']],
    });

    res.json(feedbacks);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /admin/feedbacks/:id
router.patch('/feedbacks/:id', requireAdmin, async (req: AdminRequest, res: Response) => {
  const { status } = req.body;
  if (!status || !['new', 'read', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const feedback = await Feedback.findByPk(req.params.id);
    if (!feedback) return res.status(404).json({ error: 'Feedback not found' });

    await feedback.update({ status });
    res.json(feedback);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /admin/feedbacks/:id
router.delete('/feedbacks/:id', requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const feedback = await Feedback.findByPk(req.params.id);
    if (!feedback) return res.status(404).json({ error: 'Feedback not found' });

    if (feedback.screenshot_key) {
      await deleteFromR2(feedback.screenshot_key).catch((e) =>
        console.error('R2 delete failed, continuing:', e)
      );
    }

    await feedback.destroy();
    res.json({ id: req.params.id });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
