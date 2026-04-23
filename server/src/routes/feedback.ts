import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { Feedback } from '../models';
import { processImage } from '../lib/processImage';
import { uploadToR2, deleteFromR2 } from '../lib/r2';

const router = Router();

const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024; // 5 MB

const screenshotUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only jpeg and png screenshots are allowed'));
    }
  },
  limits: { fileSize: MAX_SCREENSHOT_SIZE },
});

const VALID_TYPES = ['bug', 'feature', 'ui', 'other'];

// POST /feedback
router.post(
  '/',
  (req: Request, res: Response, next) => {
    screenshotUpload.single('screenshot')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'Screenshot is too large (max 5 MB).' });
        }
        return res.status(400).json({ error: err.message || 'File upload error' });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    const { type, title, message, email, page, trip_id, user_id, app_version } = req.body;

    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid feedback type.' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    let screenshot_url: string | null = null;
    let screenshot_key: string | null = null;

    if (req.file) {
      try {
        const processed = await processImage(req.file.buffer);
        const key = `feedbacks/${uuidv4()}.webp`;
        const url = await uploadToR2(key, processed.buffer, processed.contentType);
        screenshot_url = url;
        screenshot_key = key;
      } catch (uploadErr) {
        console.error('Screenshot upload failed:', uploadErr);
        return res.status(500).json({ error: 'Screenshot upload failed. Please try again.' });
      }
    }

    try {
      const feedback = await Feedback.create({
        type,
        title: title.trim(),
        message: message.trim(),
        email: email?.trim() || null,
        screenshot_url,
        screenshot_key,
        status: 'new',
        user_id: user_id || null,
        page: page || null,
        trip_id: trip_id || null,
        app_version: app_version || 'V1 beta',
      });
      res.status(201).json({ id: feedback.id });
    } catch (dbErr) {
      if (screenshot_key) {
        await deleteFromR2(screenshot_key).catch((e) =>
          console.error('R2 rollback failed:', e)
        );
      }
      throw dbErr;
    }
  }
);

export default router;
