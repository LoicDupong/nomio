# Feedback System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating feedback button to all app pages, persist submissions in PostgreSQL with optional R2 screenshot, and provide a protected admin inbox at `/admin/feedbacks`.

**Architecture:** FeedbackWidget in root layout → POST /feedback (open, multer + R2) → feedbacks table. Admin login checks `is_admin` on users → JWT with `isAdmin: true` → `requireAdmin` middleware guards all `/admin/*` routes → Next.js admin inbox (list + detail panel).

**Tech Stack:** Express, Sequelize, PostgreSQL, multer memoryStorage, sharp, @aws-sdk/client-s3, uuid, Next.js App Router, Zustand, SCSS modules, axios.

---

## Codebase Context

Key patterns to follow:
- Models: `server/src/models/*.ts` — same structure as `GalleryPhoto.ts`
- All models imported/exported via `server/src/models/index.ts`
- Routes: `Router()`, `async/await`, `try/catch`, `res.status(N).json({...})`
- Auth middleware: `server/src/middleware/auth.ts` — `verifyJWT` pattern to follow for `requireAdmin`
- R2: `uploadToR2(key, buffer, contentType)`, `deleteFromR2(key)` from `server/src/lib/r2.ts`
- `processImage(buffer)` from `server/src/lib/processImage.ts` — returns `{ buffer, size, contentType }`
- `uuid` package available: `import { v4 as uuidv4 } from 'uuid'`
- Frontend stores: Zustand `create<StoreType>((set) => ({...}))` — see `store/tripStore.ts`
- Frontend API: `lib/api.ts` pattern to follow for `lib/adminApi.ts`
- All frontend pages/components: `'use client'` directive, SCSS modules, BEM methodology

---

### Task 1: Add `is_admin` to User model

**Files:**
- Modify: `server/src/models/User.ts`

- [ ] **Step 1: Add `is_admin` to the UserAttributes interface and class**

Open `server/src/models/User.ts`. Replace the entire file:

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

interface UserAttributes {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  is_admin: boolean;
  created_at?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'created_at' | 'is_admin'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public password_hash!: string;
  public display_name!: string;
  public is_admin!: boolean;
  public created_at!: Date;
}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    display_name: { type: DataTypes.STRING, allowNull: false },
    is_admin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'users', timestamps: false }
);
```

- [ ] **Step 2: Verify server starts and Sequelize adds the column**

```bash
cd server && npm run dev
```

Expected in logs: no error. Sequelize `sync()` auto-ALTERs the `users` table to add `is_admin`. Check in psql: `\d users` — should show `is_admin | boolean | not null | false`.

- [ ] **Step 3: Commit**

```bash
git add server/src/models/User.ts
git commit -m "feat(db): add is_admin boolean to users"
```

---

### Task 2: Create Feedback model

**Files:**
- Create: `server/src/models/Feedback.ts`

- [ ] **Step 1: Create the model file**

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

export type FeedbackType = 'bug' | 'feature' | 'ui' | 'other';
export type FeedbackStatus = 'new' | 'read' | 'archived';

interface FeedbackAttributes {
  id: string;
  type: FeedbackType;
  title: string;
  message: string;
  email: string | null;
  screenshot_url: string | null;
  screenshot_key: string | null;
  status: FeedbackStatus;
  user_id: string | null;
  page: string | null;
  trip_id: string | null;
  app_version: string;
  created_at?: Date;
}

interface FeedbackCreationAttributes
  extends Optional<
    FeedbackAttributes,
    'id' | 'created_at' | 'email' | 'screenshot_url' | 'screenshot_key' | 'user_id' | 'page' | 'trip_id'
  > {}

export class Feedback
  extends Model<FeedbackAttributes, FeedbackCreationAttributes>
  implements FeedbackAttributes
{
  public id!: string;
  public type!: FeedbackType;
  public title!: string;
  public message!: string;
  public email!: string | null;
  public screenshot_url!: string | null;
  public screenshot_key!: string | null;
  public status!: FeedbackStatus;
  public user_id!: string | null;
  public page!: string | null;
  public trip_id!: string | null;
  public app_version!: string;
  public created_at!: Date;
}

Feedback.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    type: { type: DataTypes.ENUM('bug', 'feature', 'ui', 'other'), allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: true },
    screenshot_url: { type: DataTypes.STRING, allowNull: true },
    screenshot_key: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.ENUM('new', 'read', 'archived'),
      allowNull: false,
      defaultValue: 'new',
    },
    user_id: { type: DataTypes.UUID, allowNull: true },
    page: { type: DataTypes.STRING, allowNull: true },
    trip_id: { type: DataTypes.UUID, allowNull: true },
    app_version: { type: DataTypes.STRING, allowNull: false, defaultValue: 'V1 beta' },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'feedbacks', timestamps: false }
);
```

- [ ] **Step 2: Commit**

```bash
git add server/src/models/Feedback.ts
git commit -m "feat(db): add Feedback model"
```

---

### Task 3: Register Feedback in models index

**Files:**
- Modify: `server/src/models/index.ts`

- [ ] **Step 1: Add Feedback import, export, and association**

Add after the existing imports and before the closing export:

```typescript
import { Feedback } from './Feedback';
```

Add to the associations block (after the existing `GalleryPhoto` associations):

```typescript
Feedback.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Feedback, { foreignKey: 'user_id', as: 'feedbacks' });
```

Add `Feedback` to the export line:

```typescript
export { User, Trip, TripMember, Pin, GalleryPhoto, Feedback };
```

The full updated `index.ts`:

```typescript
import { Sequelize } from 'sequelize';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL is missing');
}

try {
  const parsed = new URL(dbUrl);
  console.log('DB CONFIG DEBUG', {
    protocol: parsed.protocol,
    host: parsed.hostname,
    port: parsed.port,
    database: parsed.pathname.slice(1),
    hasSSLParam: parsed.search.includes('ssl'),
  });
} catch (e) {
  console.error('DB URL PARSE FAILED');
  throw e;
}

export const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  logging: false,
});

import { User } from './User';
import { Trip } from './Trip';
import { TripMember } from './TripMember';
import { Pin } from './Pin';
import { GalleryPhoto } from './GalleryPhoto';
import { Feedback } from './Feedback';

// Associations
Trip.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
User.hasMany(Trip, { foreignKey: 'owner_id', as: 'trips' });

TripMember.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });
Trip.hasMany(TripMember, { foreignKey: 'trip_id', as: 'members' });

TripMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(TripMember, { foreignKey: 'user_id', as: 'memberships' });

Pin.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });
Trip.hasMany(Pin, { foreignKey: 'trip_id', as: 'pins' });

Pin.belongsTo(TripMember, { foreignKey: 'member_id', as: 'member' });
TripMember.hasMany(Pin, { foreignKey: 'member_id', as: 'pins' });

GalleryPhoto.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });
Trip.hasMany(GalleryPhoto, { foreignKey: 'trip_id', as: 'gallery_photos' });

GalleryPhoto.belongsTo(TripMember, { foreignKey: 'member_id', as: 'member' });
GalleryPhoto.belongsTo(Pin, { foreignKey: 'pin_id', as: 'pin' });
Pin.hasMany(GalleryPhoto, { foreignKey: 'pin_id', as: 'gallery_photos' });

Feedback.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Feedback, { foreignKey: 'user_id', as: 'feedbacks' });

export { User, Trip, TripMember, Pin, GalleryPhoto, Feedback };
```

- [ ] **Step 2: Restart server, verify `feedbacks` table is created**

```bash
cd server && npm run dev
```

Expected: server starts. In psql: `\d feedbacks` — shows all columns including ENUM fields.

- [ ] **Step 3: Commit**

```bash
git add server/src/models/index.ts
git commit -m "feat(db): register Feedback model and associations"
```

---

### Task 4: Create `requireAdmin` middleware

**Files:**
- Create: `server/src/middleware/requireAdmin.ts`

- [ ] **Step 1: Create the middleware**

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AdminRequest extends Request {
  admin?: { id: string; email: string; isAdmin: boolean };
}

export function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      isAdmin: boolean;
    };
    if (!payload.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/middleware/requireAdmin.ts
git commit -m "feat(server): add requireAdmin middleware"
```

---

### Task 5: Create feedback route (POST /feedback)

**Files:**
- Create: `server/src/routes/feedback.ts`

- [ ] **Step 1: Create the route file**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/feedback.ts
git commit -m "feat(server): add POST /feedback route with optional R2 screenshot"
```

---

### Task 6: Create admin route

**Files:**
- Create: `server/src/routes/admin.ts`

- [ ] **Step 1: Create the route file**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/admin.ts
git commit -m "feat(server): add admin login + feedback CRUD routes"
```

---

### Task 7: Register routes in server entry

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Add imports and route registrations**

Add to the imports block (after existing route imports):

```typescript
import feedbackRoutes from './routes/feedback';
import adminRoutes from './routes/admin';
```

Add to the route registrations block (after existing `app.use(...)` calls, before `app.get('/health', ...)`):

```typescript
app.use('/feedback', feedbackRoutes);
app.use('/admin', adminRoutes);
```

- [ ] **Step 2: Restart server, verify routes are reachable**

```bash
cd server && npm run dev
```

Test with curl or browser:
```bash
curl -X POST http://localhost:3001/feedback \
  -H "Content-Type: application/json" \
  -d '{"type":"bug","title":"Test","message":"Test message"}'
```
Expected: `{"id":"<uuid>"}` with 201.

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat(server): register /feedback and /admin routes"
```

---

### Task 8: Add Feedback type to frontend types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add FeedbackType, FeedbackStatus, and Feedback interface**

Add at the end of `types/index.ts`:

```typescript
export type FeedbackType = 'bug' | 'feature' | 'ui' | 'other';
export type FeedbackStatus = 'new' | 'read' | 'archived';

export interface Feedback {
  id: string;
  type: FeedbackType;
  title: string;
  message: string;
  email: string | null;
  screenshot_url: string | null;
  screenshot_key: string | null;
  status: FeedbackStatus;
  user_id: string | null;
  page: string | null;
  trip_id: string | null;
  app_version: string;
  created_at: string;
  user?: { display_name: string } | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat(types): add Feedback interface"
```

---

### Task 9: Create adminStore

**Files:**
- Create: `store/adminStore.ts`

- [ ] **Step 1: Create the store**

```typescript
import { create } from 'zustand';

interface AdminStore {
  token: string | null;
  setToken: (t: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
  token: null,

  setToken: (token) => {
    localStorage.setItem('admin_token', token);
    set({ token });
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    set({ token: null });
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('admin_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && Date.now() / 1000 > payload.exp) {
          localStorage.removeItem('admin_token');
          set({ token: null });
          return;
        }
        set({ token });
      } catch {
        localStorage.removeItem('admin_token');
        set({ token: null });
      }
    }
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add store/adminStore.ts
git commit -m "feat(store): add adminStore with token management"
```

---

### Task 10: Create adminApi

**Files:**
- Create: `lib/adminApi.ts`

- [ ] **Step 1: Create the axios instance**

```typescript
import axios from 'axios';
import { useAdminStore } from '@/store/adminStore';

const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

adminApi.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config;
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      useAdminStore.getState().logout();
      window.location.replace('/admin/login');
    }
    return Promise.reject(error);
  }
);

export default adminApi;
```

- [ ] **Step 2: Commit**

```bash
git add lib/adminApi.ts
git commit -m "feat(lib): add adminApi axios instance"
```

---

### Task 11: Create FeedbackWidget and FeedbackButton

**Files:**
- Create: `components/Feedback/FeedbackWidget.tsx`
- Create: `components/Feedback/FeedbackButton.tsx`
- Create: `components/Feedback/FeedbackButton.module.scss`

- [ ] **Step 1: Create FeedbackButton.module.scss**

```scss
.button {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9000;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  transition: background 0.15s, transform 0.1s;

  &:hover {
    background: #333;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}
```

- [ ] **Step 2: Create FeedbackButton.tsx**

```tsx
'use client';
import styles from './FeedbackButton.module.scss';

interface Props {
  onClick: () => void;
}

export default function FeedbackButton({ onClick }: Props) {
  return (
    <button className={styles.button} type="button" onClick={onClick}>
      Feedback
    </button>
  );
}
```

- [ ] **Step 3: Create FeedbackWidget.tsx**

```tsx
'use client';
import { useState } from 'react';
import FeedbackButton from './FeedbackButton';
import FeedbackModal from './FeedbackModal';

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {!open && <FeedbackButton onClick={() => setOpen(true)} />}
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/Feedback/FeedbackWidget.tsx components/Feedback/FeedbackButton.tsx components/Feedback/FeedbackButton.module.scss
git commit -m "feat(ui): add FeedbackWidget and FeedbackButton"
```

---

### Task 12: Create FeedbackModal

**Files:**
- Create: `components/Feedback/FeedbackModal.tsx`
- Create: `components/Feedback/FeedbackModal.module.scss`

- [ ] **Step 1: Create FeedbackModal.module.scss**

```scss
.overlay {
  position: fixed;
  inset: 0;
  z-index: 9001;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 24px;

  @media (max-width: 480px) {
    align-items: flex-end;
    justify-content: stretch;
    padding: 0;
  }
}

.modal {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  width: 420px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.22);

  @media (max-width: 480px) {
    width: 100%;
    border-radius: 16px 16px 0 0;
    max-height: 85vh;
  }
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.title {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
}

.closeBtn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #888;
  padding: 2px 6px;
  border-radius: 6px;

  &:hover {
    background: #f0f0f0;
    color: #333;
  }
}

.typeGroup {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.typeBtn {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1.5px solid #d0d0d0;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s;

  &:hover {
    border-color: #888;
  }

  &--active {
    border-color: #1a1a1a;
    background: #1a1a1a;
    color: #fff;
  }
}

.field {
  margin-bottom: 14px;

  label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 5px;
    color: #333;
  }

  input,
  textarea {
    width: 100%;
    padding: 9px 12px;
    border: 1.5px solid #d0d0d0;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: #1a1a1a;
    }
  }

  textarea {
    min-height: 90px;
  }
}

.optional {
  font-size: 12px;
  font-weight: 400;
  color: #888;
  margin-left: 4px;
}

.fileInput {
  font-size: 13px;
  color: #555;
}

.error {
  font-size: 13px;
  color: #e03c3c;
  margin-bottom: 12px;
}

.success {
  text-align: center;
  padding: 24px 0;

  p {
    font-size: 15px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 6px;
  }

  span {
    font-size: 13px;
    color: #888;
  }
}

.submitBtn {
  width: 100%;
  padding: 11px;
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;

  &:hover:not(:disabled) {
    background: #333;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}
```

- [ ] **Step 2: Create FeedbackModal.tsx**

```tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import styles from './FeedbackModal.module.scss';
import { FeedbackType } from '@/types';

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'ui', label: 'UX / UI' },
  { value: 'other', label: 'Other' },
];

interface Props {
  onClose: () => void;
}

export default function FeedbackModal({ onClose }: Props) {
  const { user } = useAuthStore();
  const [type, setType] = useState<FeedbackType>('bug');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-close after success
  useEffect(() => {
    if (status !== 'success') return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [status, onClose]);

  // Extract context from URL
  function getContext() {
    const pathname = window.location.pathname;
    const tripMatch = pathname.match(/\/trip\/([^/]+)/);
    const trip_id = tripMatch ? tripMatch[1] : null;
    return { page: pathname, trip_id };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const { page, trip_id } = getContext();

    const formData = new FormData();
    formData.append('type', type);
    formData.append('title', title);
    formData.append('message', message);
    if (email.trim()) formData.append('email', email.trim());
    if (page) formData.append('page', page);
    if (trip_id) formData.append('trip_id', trip_id);
    if (user?.id) formData.append('user_id', user.id);
    formData.append('app_version', 'V1 beta');
    if (screenshot) formData.append('screenshot', screenshot);

    try {
      await api.post('/feedback', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatus('success');
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: string } } };
      const status = e.response?.status;
      if (status === 413) {
        setErrorMsg('Screenshot is too large (max 5 MB).');
      } else if (status === 400) {
        setErrorMsg(e.response?.data?.error ?? 'Please fill in all required fields.');
      } else {
        setErrorMsg('Something went wrong. Please try again.');
      }
      setStatus('error');
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > 5 * 1024 * 1024) {
      setErrorMsg('Screenshot is too large (max 5 MB).');
      if (fileRef.current) fileRef.current.value = '';
      setScreenshot(null);
      return;
    }
    setErrorMsg('');
    setScreenshot(file);
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Send feedback</h2>
          <button className={styles.closeBtn} type="button" onClick={onClose}>✕</button>
        </div>

        {status === 'success' ? (
          <div className={styles.success}>
            <p>Thanks for your feedback!</p>
            <span>We read everything. This will close in a moment.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.typeGroup}>
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`${styles.typeBtn} ${type === t.value ? styles['typeBtn--active'] : ''}`}
                  onClick={() => setType(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className={styles.field}>
              <label htmlFor="fb-title">Title</label>
              <input
                id="fb-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short summary"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="fb-message">Message</label>
              <textarea
                id="fb-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us more..."
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="fb-email">
                Email <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="fb-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="fb-screenshot">
                Screenshot <span className={styles.optional}>(optional, max 5 MB)</span>
              </label>
              <input
                id="fb-screenshot"
                type="file"
                accept="image/jpeg,image/png"
                ref={fileRef}
                onChange={handleFileChange}
                className={styles.fileInput}
              />
            </div>

            {status === 'error' && <p className={styles.error}>{errorMsg}</p>}

            <button className={styles.submitBtn} type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Sending...' : 'Send feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Feedback/FeedbackModal.tsx components/Feedback/FeedbackModal.module.scss
git commit -m "feat(ui): add FeedbackModal with form, screenshot upload, success/error states"
```

---

### Task 13: Add FeedbackWidget to root layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Import and render FeedbackWidget**

Replace the entire `app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { Figtree } from 'next/font/google';
import '@/styles/globals.scss';
import FeedbackWidget from '@/components/Feedback/FeedbackWidget';

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-figtree',
});

export const metadata: Metadata = {
  title: 'Nomio',
  description: 'Plan and relive your trips together.',
  icons: {
    icon: '/logo/nomio-circles-app-icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <body>
        {children}
        <FeedbackWidget />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Start frontend dev server and verify button appears**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: "Feedback" button appears fixed bottom-right. Click it → modal opens. Close button closes modal.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(ui): add FeedbackWidget to root layout"
```

---

### Task 14: Admin login page

**Files:**
- Create: `app/admin/login/page.tsx`
- Create: `app/admin/login/page.module.scss`

- [ ] **Step 1: Create page.module.scss**

```scss
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.card {
  background: #fff;
  border-radius: 16px;
  padding: 40px;
  width: 360px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 24px;
}

.field {
  margin-bottom: 14px;

  label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 5px;
    color: #333;
  }

  input {
    width: 100%;
    padding: 10px 12px;
    border: 1.5px solid #d0d0d0;
    border-radius: 8px;
    font-size: 14px;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: #1a1a1a;
    }
  }
}

.error {
  font-size: 13px;
  color: #e03c3c;
  margin-bottom: 12px;
}

.button {
  width: 100%;
  padding: 11px;
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 4px;

  &:hover:not(:disabled) {
    background: #333;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}
```

- [ ] **Step 2: Create page.tsx**

```tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/store/adminStore';
import adminApi from '@/lib/adminApi';
import styles from './page.module.scss';

export default function AdminLoginPage() {
  const router = useRouter();
  const { token, setToken, hydrate } = useAdminStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (token) router.replace('/admin/feedbacks');
  }, [token, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.post('/admin/login', { email, password });
      setToken(res.data.token);
      router.push('/admin/feedbacks');
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: string } } };
      if (e.response?.status === 403) {
        setError('This account does not have admin access.');
      } else if (e.response?.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Admin</h1>
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Promote your user to admin in psql, then test login**

In psql:
```sql
UPDATE users SET is_admin = true WHERE email = 'your@email.com';
```

Open `http://localhost:3000/admin/login`. Sign in with admin credentials.
Expected: redirected to `/admin/feedbacks`.

- [ ] **Step 4: Commit**

```bash
git add app/admin/login/page.tsx app/admin/login/page.module.scss
git commit -m "feat(ui): add admin login page"
```

---

### Task 15: Admin feedbacks inbox page

**Files:**
- Create: `app/admin/feedbacks/page.tsx`
- Create: `app/admin/feedbacks/page.module.scss`

- [ ] **Step 1: Create page.module.scss**

```scss
.page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.topBar {
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.heading {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
  margin-right: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  background: #2563eb;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  border-radius: 10px;
  padding: 2px 7px;
}

.filterGroup {
  display: flex;
  gap: 6px;
}

.filterBtn {
  padding: 5px 12px;
  border-radius: 20px;
  border: 1.5px solid #d0d0d0;
  background: #fff;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    border-color: #888;
  }

  &--active {
    border-color: #1a1a1a;
    background: #1a1a1a;
    color: #fff;
  }
}

.select {
  padding: 5px 10px;
  border: 1.5px solid #d0d0d0;
  border-radius: 8px;
  font-size: 13px;
  background: #fff;
}

.searchInput {
  padding: 6px 12px;
  border: 1.5px solid #d0d0d0;
  border-radius: 8px;
  font-size: 13px;
  width: 200px;

  &:focus {
    outline: none;
    border-color: #1a1a1a;
  }
}

.logoutBtn {
  padding: 5px 12px;
  border: 1.5px solid #d0d0d0;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: #f0f0f0;
  }
}

.body {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: calc(100vh - 57px);
}

.list {
  width: 360px;
  min-width: 280px;
  border-right: 1px solid #e8e8e8;
  background: #fff;
  overflow-y: auto;
}

.listEmpty {
  padding: 32px 24px;
  color: #888;
  font-size: 14px;
}

.listItem {
  padding: 14px 18px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: #f8f8f8;
  }

  &--selected {
    background: #f0f4ff;
  }

  &--new {
    border-left: 3px solid #2563eb;
  }
}

.itemHeader {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.typeBadge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  background: #f0f0f0;
  color: #555;
  text-transform: uppercase;

  &--bug { background: #fee2e2; color: #b91c1c; }
  &--feature { background: #dcfce7; color: #15803d; }
  &--ui { background: #e0f2fe; color: #0369a1; }
  &--other { background: #f3f4f6; color: #6b7280; }
}

.itemTitle {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.itemMeta {
  font-size: 12px;
  color: #888;
}

.detail {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  background: #f5f5f5;
}

.detailEmpty {
  color: #888;
  font-size: 14px;
}

.detailCard {
  background: #fff;
  border-radius: 12px;
  padding: 28px;
  max-width: 680px;
}

.detailHeader {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}

.detailTitle {
  font-size: 19px;
  font-weight: 700;
  margin: 0 0 6px;
}

.detailMeta {
  font-size: 13px;
  color: #666;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.detailMetaItem {
  display: flex;
  gap: 4px;

  span:first-child {
    font-weight: 600;
    color: #444;
  }
}

.detailMessage {
  font-size: 15px;
  line-height: 1.6;
  white-space: pre-wrap;
  margin: 20px 0;
  padding: 16px;
  background: #f8f8f8;
  border-radius: 8px;
}

.detailScreenshot {
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  margin-bottom: 20px;
}

.detailActions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.actionBtn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1.5px solid #d0d0d0;
  background: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: #f0f0f0;
  }

  &--danger {
    border-color: #e03c3c;
    color: #e03c3c;

    &:hover {
      background: #fee2e2;
    }
  }
}
```

- [ ] **Step 2: Create page.tsx**

```tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/store/adminStore';
import adminApi from '@/lib/adminApi';
import { Feedback, FeedbackStatus, FeedbackType } from '@/types';
import styles from './page.module.scss';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: 'Bug',
  feature: 'Feature',
  ui: 'UX / UI',
  other: 'Other',
};

const STATUS_TABS: { value: '' | FeedbackStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'archived', label: 'Archived' },
];

export default function AdminFeedbacksPage() {
  const router = useRouter();
  const { token, logout, hydrate } = useAdminStore();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [statusFilter, setStatusFilter] = useState<'' | FeedbackStatus>('');
  const [typeFilter, setTypeFilter] = useState<'' | FeedbackType>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (token === null && !localStorage.getItem('admin_token')) {
      router.replace('/admin/login');
    }
  }, [token, router]);

  const fetchFeedbacks = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      if (search) params.search = search;
      const res = await adminApi.get('/admin/feedbacks', { params });
      setFeedbacks(res.data);
    } catch {
      // 401 handled by interceptor (redirect to login)
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  async function handleSelect(fb: Feedback) {
    setSelected(fb);
    setDeleteConfirm(false);
    if (fb.status === 'new') {
      try {
        await adminApi.patch(`/admin/feedbacks/${fb.id}`, { status: 'read' });
        setFeedbacks((prev) =>
          prev.map((f) => (f.id === fb.id ? { ...f, status: 'read' } : f))
        );
        setSelected((prev) => (prev?.id === fb.id ? { ...prev, status: 'read' } : prev));
      } catch {}
    }
  }

  async function handleStatusChange(status: FeedbackStatus) {
    if (!selected) return;
    try {
      await adminApi.patch(`/admin/feedbacks/${selected.id}`, { status });
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === selected.id ? { ...f, status } : f))
      );
      setSelected((prev) => (prev ? { ...prev, status } : prev));
    } catch {}
  }

  async function handleDelete() {
    if (!selected) return;
    try {
      await adminApi.delete(`/admin/feedbacks/${selected.id}`);
      setFeedbacks((prev) => prev.filter((f) => f.id !== selected.id));
      setSelected(null);
      setDeleteConfirm(false);
    } catch {}
  }

  function handleLogout() {
    logout();
    router.replace('/admin/login');
  }

  const newCount = feedbacks.filter((f) => f.status === 'new').length;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <h1 className={styles.heading}>
          Feedbacks
          {newCount > 0 && <span className={styles.badge}>{newCount}</span>}
        </h1>

        <div className={styles.filterGroup}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`${styles.filterBtn} ${statusFilter === tab.value ? styles['filterBtn--active'] : ''}`}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          className={styles.select}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as '' | FeedbackType)}
        >
          <option value="">All types</option>
          <option value="bug">Bug</option>
          <option value="feature">Feature</option>
          <option value="ui">UX / UI</option>
          <option value="other">Other</option>
        </select>

        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />

        <button className={styles.logoutBtn} type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className={styles.body}>
        {/* List */}
        <div className={styles.list}>
          {loading && <p className={styles.listEmpty}>Loading...</p>}
          {!loading && feedbacks.length === 0 && (
            <p className={styles.listEmpty}>No feedbacks found.</p>
          )}
          {feedbacks.map((fb) => (
            <div
              key={fb.id}
              className={[
                styles.listItem,
                selected?.id === fb.id ? styles['listItem--selected'] : '',
                fb.status === 'new' ? styles['listItem--new'] : '',
              ].join(' ')}
              onClick={() => handleSelect(fb)}
            >
              <div className={styles.itemHeader}>
                <span className={`${styles.typeBadge} ${styles[`typeBadge--${fb.type}`]}`}>
                  {TYPE_LABELS[fb.type]}
                </span>
                <span className={styles.itemTitle}>{fb.title}</span>
              </div>
              <div className={styles.itemMeta}>
                {fb.user?.display_name ?? 'Guest'} · {formatDate(fb.created_at)}
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
        <div className={styles.detail}>
          {!selected ? (
            <p className={styles.detailEmpty}>Select a feedback to read it.</p>
          ) : (
            <div className={styles.detailCard}>
              <div className={styles.detailHeader}>
                <span className={`${styles.typeBadge} ${styles[`typeBadge--${selected.type}`]}`}>
                  {TYPE_LABELS[selected.type]}
                </span>
              </div>

              <h2 className={styles.detailTitle}>{selected.title}</h2>

              <div className={styles.detailMeta}>
                <div className={styles.detailMetaItem}>
                  <span>From:</span>
                  <span>{selected.user?.display_name ?? 'Guest'}</span>
                </div>
                {selected.email && (
                  <div className={styles.detailMetaItem}>
                    <span>Email:</span>
                    <a href={`mailto:${selected.email}`}>{selected.email}</a>
                  </div>
                )}
                <div className={styles.detailMetaItem}>
                  <span>Date:</span>
                  <span>{formatDate(selected.created_at)}</span>
                </div>
                {selected.page && (
                  <div className={styles.detailMetaItem}>
                    <span>Page:</span>
                    <span>{selected.page}</span>
                  </div>
                )}
                {selected.trip_id && (
                  <div className={styles.detailMetaItem}>
                    <span>Trip:</span>
                    <span>{selected.trip_id}</span>
                  </div>
                )}
                <div className={styles.detailMetaItem}>
                  <span>Status:</span>
                  <span>{selected.status}</span>
                </div>
              </div>

              <p className={styles.detailMessage}>{selected.message}</p>

              {selected.screenshot_url && (
                <img
                  src={selected.screenshot_url}
                  alt="Screenshot"
                  className={styles.detailScreenshot}
                />
              )}

              <div className={styles.detailActions}>
                {selected.status !== 'read' && (
                  <button
                    className={styles.actionBtn}
                    type="button"
                    onClick={() => handleStatusChange('read')}
                  >
                    Mark as read
                  </button>
                )}
                {selected.status !== 'archived' && (
                  <button
                    className={styles.actionBtn}
                    type="button"
                    onClick={() => handleStatusChange('archived')}
                  >
                    Archive
                  </button>
                )}
                {!deleteConfirm ? (
                  <button
                    className={`${styles.actionBtn} ${styles['actionBtn--danger']}`}
                    type="button"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    Delete
                  </button>
                ) : (
                  <>
                    <button
                      className={`${styles.actionBtn} ${styles['actionBtn--danger']}`}
                      type="button"
                      onClick={handleDelete}
                    >
                      Confirm delete
                    </button>
                    <button
                      className={styles.actionBtn}
                      type="button"
                      onClick={() => setDeleteConfirm(false)}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Test the full flow**

1. Submit a feedback via the app (bug, with title + message)
2. Open `http://localhost:3000/admin/feedbacks`
3. Verify feedback appears in list with blue left border (new)
4. Click it → detail panel shows, auto-marks as read
5. Test Archive and Delete actions
6. Test filters: status tabs, type dropdown, search

- [ ] **Step 4: Commit**

```bash
git add app/admin/feedbacks/page.tsx app/admin/feedbacks/page.module.scss
git commit -m "feat(ui): add admin feedbacks inbox with list, detail panel, and filters"
```

---

## Manual Test Checklist

1. Feedback button visible on `/`, `/trip/[id]`, `/trip/[id]/gallery`, `/join/[code]`
2. Modal opens on click, closes on backdrop click and ✕ button
3. Submit as logged-in user → feedback in DB with user_id and pre-filled email
4. Submit as guest → feedback in DB with user_id: null
5. Submit with screenshot → screenshot visible in admin detail panel
6. Submit with screenshot > 5 MB → error message shown before upload
7. Submit with missing title/message → validation error shown
8. Admin login with wrong password → 401 error shown
9. Admin login with non-admin account → 403 error shown
10. Direct access to `/admin/feedbacks` without token → redirect to `/admin/login`
11. Admin inbox: filter by status, type, search — results update correctly
12. Click feedback → auto-marks as read, blue border disappears
13. Archive a feedback → status updates
14. Delete a feedback with screenshot → R2 file removed, row gone from list
15. Success state: "Thanks for your feedback!" shown, modal auto-closes after 3s
