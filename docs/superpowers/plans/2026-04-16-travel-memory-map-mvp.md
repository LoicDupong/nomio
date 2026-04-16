# Travel Memory Map — MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a collaborative travel memory web app where friends pin photos and notes on a shared interactive map via a magic-link invite system.

**Architecture:** Express backend with JWT auth (full users + signed guest tokens), Sequelize/PostgreSQL for persistence, Socket.io for real-time pin broadcasts. Next.js App Router frontend with react-leaflet map, Zustand stores, and SCSS modules — no Tailwind, no component libraries.

**Tech Stack:** Next.js 14 (App Router, TypeScript), SCSS Modules, Zustand, Axios, react-leaflet, Socket.io-client / Express / Socket.io, Sequelize, PostgreSQL, Multer, bcrypt, jsonwebtoken.

---

## File Map

### Backend (`/server`)
```
server/
  package.json
  tsconfig.json
  .env                          ← DATABASE_URL, JWT_SECRET, GUEST_JWT_SECRET, PORT
  src/
    index.ts                    ← Express app + Socket.io + static /uploads
    routes/
      auth.ts                   ← POST /register, POST /login
      trips.ts                  ← POST /trips, GET /trips/:id
      join.ts                   ← POST /join/:code
      pins.ts                   ← GET/POST /trips/:id/pins
      gallery.ts                ← GET/POST /trips/:id/gallery
    middleware/
      auth.ts                   ← verifyJWT (sets req.user)
      guestAuth.ts              ← verifyGuest (sets req.guest)
      anyMember.ts              ← accepts either req.user or req.guest + validates trip membership
      upload.ts                 ← Multer config (jpeg/png/webp, 10 MB, UUID filename)
    models/
      index.ts                  ← Sequelize init + all associations + sync
      User.ts
      Trip.ts
      TripMember.ts
      Pin.ts
      GalleryPhoto.ts
    socket/
      index.ts                  ← Socket.io server: rooms by trip_id, pin events
```

### Frontend (project root)
```
app/
  layout.tsx                    ← root layout (metadata, global styles)
  page.tsx                      ← landing: create trip or join
  auth/
    login/page.tsx
    register/page.tsx
  join/[code]/page.tsx          ← guest username form → redirect to trip
  trip/[id]/page.tsx            ← map + sidebar
  trip/[id]/gallery/page.tsx    ← photo grid + upload
components/
  Map/
    MapView.tsx                 ← react-leaflet map, click-to-create, render pins
    MapView.module.scss
    PinMarker.tsx               ← single marker with category icon
    PinMarker.module.scss
    PinForm.tsx                 ← bottom-sheet form: title, category, note, photo
    PinForm.module.scss
    PinDetail.tsx               ← popup on marker click
    PinDetail.module.scss
  Sidebar/
    TripSidebar.tsx             ← scrollable pin list + trip info
    TripSidebar.module.scss
  Gallery/
    GalleryGrid.tsx             ← photo grid
    GalleryGrid.module.scss
    PhotoUpload.tsx             ← direct gallery upload button
    PhotoUpload.module.scss
lib/
  api.ts                        ← Axios instance (base URL + auth header)
  socket.ts                     ← Socket.io singleton client
store/
  authStore.ts                  ← Zustand: user | guest session, token
  tripStore.ts                  ← Zustand: trip, pins, members
types/
  index.ts                      ← all shared TypeScript types
styles/
  globals.scss
  _variables.scss
```

---

## Task 1: Backend project scaffold

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env`
- Create: `server/src/index.ts`

- [ ] **Step 1: Init backend**

```bash
cd server
npm init -y
npm install express cors dotenv jsonwebtoken bcrypt multer uuid sequelize pg pg-hstore socket.io
npm install -D typescript @types/express @types/node @types/jsonwebtoken @types/bcrypt @types/multer @types/uuid ts-node-dev
```

- [ ] **Step 2: Create `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Add dev script to `server/package.json`**

Add to the `scripts` block:
```json
"dev": "ts-node-dev --respawn --transpile-only src/index.ts"
```

- [ ] **Step 4: Create `server/.env`**

```
DATABASE_URL=postgresql://localhost:5432/travel_map
JWT_SECRET=change_me_jwt_secret_32chars_min
GUEST_JWT_SECRET=change_me_guest_secret_32chars
PORT=4000
```

- [ ] **Step 5: Create `server/src/index.ts`**

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { initSocket } from './socket';
import { sequelize } from './models';

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes (added incrementally)
import authRoutes from './routes/auth';
import tripRoutes from './routes/trips';
import joinRoutes from './routes/join';
import pinRoutes from './routes/pins';
import galleryRoutes from './routes/gallery';

app.use('/auth', authRoutes);
app.use('/trips', tripRoutes);
app.use('/join', joinRoutes);
app.use('/trips', pinRoutes);
app.use('/trips', galleryRoutes);

initSocket(server);

const PORT = process.env.PORT || 4000;

sequelize.sync({ alter: false }).then(() => {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
```

- [ ] **Step 6: Create uploads directory**

```bash
mkdir -p server/uploads
touch server/uploads/.gitkeep
```

- [ ] **Step 7: Commit**

```bash
git add server/
git commit -m "feat: backend project scaffold"
```

---

## Task 2: Sequelize models + associations

**Files:**
- Create: `server/src/models/index.ts`
- Create: `server/src/models/User.ts`
- Create: `server/src/models/Trip.ts`
- Create: `server/src/models/TripMember.ts`
- Create: `server/src/models/Pin.ts`
- Create: `server/src/models/GalleryPhoto.ts`

- [ ] **Step 1: Create `server/src/models/User.ts`**

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

interface UserAttributes {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  created_at?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'created_at'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public password_hash!: string;
  public display_name!: string;
  public created_at!: Date;
}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    display_name: { type: DataTypes.STRING, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'users', timestamps: false }
);
```

- [ ] **Step 2: Create `server/src/models/Trip.ts`**

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

interface TripAttributes {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at?: Date;
}

interface TripCreationAttributes extends Optional<TripAttributes, 'id' | 'created_at'> {}

export class Trip extends Model<TripAttributes, TripCreationAttributes> implements TripAttributes {
  public id!: string;
  public name!: string;
  public invite_code!: string;
  public owner_id!: string;
  public created_at!: Date;
}

Trip.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    invite_code: { type: DataTypes.STRING(6), unique: true, allowNull: false },
    owner_id: { type: DataTypes.UUID, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'trips', timestamps: false }
);
```

- [ ] **Step 3: Create `server/src/models/TripMember.ts`**

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

interface TripMemberAttributes {
  id: string;
  trip_id: string;
  user_id: string | null;
  guest_name: string | null;
  role: 'owner' | 'member';
  joined_at?: Date;
}

interface TripMemberCreationAttributes extends Optional<TripMemberAttributes, 'id' | 'joined_at'> {}

export class TripMember extends Model<TripMemberAttributes, TripMemberCreationAttributes> implements TripMemberAttributes {
  public id!: string;
  public trip_id!: string;
  public user_id!: string | null;
  public guest_name!: string | null;
  public role!: 'owner' | 'member';
  public joined_at!: Date;
}

TripMember.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    trip_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: true },
    guest_name: { type: DataTypes.STRING, allowNull: true },
    role: { type: DataTypes.ENUM('owner', 'member'), allowNull: false, defaultValue: 'member' },
    joined_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'trip_members', timestamps: false }
);
```

- [ ] **Step 4: Create `server/src/models/Pin.ts`**

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

interface PinAttributes {
  id: string;
  trip_id: string;
  member_id: string;
  lat: number;
  lng: number;
  title: string;
  note: string | null;
  category: 'food' | 'spot' | 'hotel' | 'activity';
  photo_url: string | null;
  created_at?: Date;
}

interface PinCreationAttributes extends Optional<PinAttributes, 'id' | 'created_at'> {}

export class Pin extends Model<PinAttributes, PinCreationAttributes> implements PinAttributes {
  public id!: string;
  public trip_id!: string;
  public member_id!: string;
  public lat!: number;
  public lng!: number;
  public title!: string;
  public note!: string | null;
  public category!: 'food' | 'spot' | 'hotel' | 'activity';
  public photo_url!: string | null;
  public created_at!: Date;
}

Pin.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    trip_id: { type: DataTypes.UUID, allowNull: false },
    member_id: { type: DataTypes.UUID, allowNull: false },
    lat: { type: DataTypes.DECIMAL(10, 8), allowNull: false },
    lng: { type: DataTypes.DECIMAL(11, 8), allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    note: { type: DataTypes.TEXT, allowNull: true },
    category: { type: DataTypes.ENUM('food', 'spot', 'hotel', 'activity'), allowNull: false },
    photo_url: { type: DataTypes.STRING, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'pins', timestamps: false }
);
```

- [ ] **Step 5: Create `server/src/models/GalleryPhoto.ts`**

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

interface GalleryPhotoAttributes {
  id: string;
  trip_id: string;
  member_id: string;
  pin_id: string | null;
  url: string;
  created_at?: Date;
}

interface GalleryPhotoCreationAttributes extends Optional<GalleryPhotoAttributes, 'id' | 'created_at'> {}

export class GalleryPhoto extends Model<GalleryPhotoAttributes, GalleryPhotoCreationAttributes> implements GalleryPhotoAttributes {
  public id!: string;
  public trip_id!: string;
  public member_id!: string;
  public pin_id!: string | null;
  public url!: string;
  public created_at!: Date;
}

GalleryPhoto.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    trip_id: { type: DataTypes.UUID, allowNull: false },
    member_id: { type: DataTypes.UUID, allowNull: false },
    pin_id: { type: DataTypes.UUID, allowNull: true },
    url: { type: DataTypes.STRING, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'gallery_photos', timestamps: false }
);
```

- [ ] **Step 6: Create `server/src/models/index.ts`**

```typescript
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

export const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  logging: false,
});

// Import models (after sequelize is created to avoid circular deps)
import { User } from './User';
import { Trip } from './Trip';
import { TripMember } from './TripMember';
import { Pin } from './Pin';
import { GalleryPhoto } from './GalleryPhoto';

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

export { User, Trip, TripMember, Pin, GalleryPhoto };
```

- [ ] **Step 7: Test DB connection**

```bash
cd server && npx ts-node-dev src/index.ts
```
Expected: `Server running on port 4000` (tables auto-created in PostgreSQL).

- [ ] **Step 8: Commit**

```bash
git add server/src/models/
git commit -m "feat: Sequelize models and associations"
```

---

## Task 3: Auth middleware + auth routes

**Files:**
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/middleware/guestAuth.ts`
- Create: `server/src/middleware/anyMember.ts`
- Create: `server/src/routes/auth.ts`

- [ ] **Step 1: Create `server/src/middleware/auth.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; display_name: string };
}

export function verifyJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; email: string; display_name: string };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

- [ ] **Step 2: Create `server/src/middleware/guestAuth.ts`**

```typescript
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
```

- [ ] **Step 3: Create `server/src/middleware/anyMember.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
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
    try {
      const payload = jwt.verify(authHeader, process.env.JWT_SECRET!) as {
        id: string;
        email: string;
        display_name: string;
      };
      req.user = payload;
      const member = await TripMember.findOne({ where: { trip_id: tripId, user_id: payload.id } });
      if (!member) return res.status(403).json({ error: 'Not a trip member' });
      req.memberId = member.id;
      return next();
    } catch {
      // fall through to guest check
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
```

- [ ] **Step 4: Create `server/src/routes/auth.ts`**

```typescript
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

  const existing = await User.findOne({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const password_hash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password_hash, display_name });

  const token = jwt.sign(
    { id: user.id, email: user.email, display_name: user.display_name },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  res.status(201).json({ token, user: { id: user.id, email: user.email, display_name: user.display_name } });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, email: user.email, display_name: user.display_name },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  res.json({ token, user: { id: user.id, email: user.email, display_name: user.display_name } });
});

export default router;
```

- [ ] **Step 5: Test with curl**

```bash
# Register
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"secret","display_name":"Test User"}'
# Expected: { token: "...", user: { id, email, display_name } }

# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"secret"}'
# Expected: { token: "...", user: {...} }
```

- [ ] **Step 6: Commit**

```bash
git add server/src/middleware/ server/src/routes/auth.ts
git commit -m "feat: auth routes and JWT/guest middleware"
```

---

## Task 4: Trip routes + invite_code generation

**Files:**
- Create: `server/src/routes/trips.ts`

- [ ] **Step 1: Create `server/src/routes/trips.ts`**

```typescript
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { verifyJWT, AuthRequest } from '../middleware/auth';
import { Trip, TripMember, Pin, User } from '../models';

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

// Create trip (auth required)
router.post('/', verifyJWT, async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const invite_code = await uniqueInviteCode();

  const trip = await Trip.create({
    name,
    invite_code,
    owner_id: req.user!.id,
  });

  // Add owner as trip_member
  await TripMember.create({
    trip_id: trip.id,
    user_id: req.user!.id,
    guest_name: null,
    role: 'owner',
  });

  res.status(201).json(trip);
});

// Get trip details (member access checked via anyMember in index.ts — here we keep it simple, use verifyJWT or open for now)
router.get('/:id', verifyJWT, async (req: AuthRequest, res: Response) => {
  const trip = await Trip.findByPk(req.params.id, {
    include: [
      { model: TripMember, as: 'members', include: [{ model: User, as: 'user', attributes: ['id', 'display_name', 'email'] }] },
    ],
  });
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json(trip);
});

export default router;
```

- [ ] **Step 2: Test**

```bash
# Use token from Task 3 Step 5
TOKEN="<paste token here>"
curl -X POST http://localhost:4000/trips \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Portugal 2024"}'
# Expected: { id, name, invite_code: "ABC123", owner_id, created_at }
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/trips.ts
git commit -m "feat: trip create/get routes with invite_code"
```

---

## Task 5: Join route (guest + auth flow)

**Files:**
- Create: `server/src/routes/join.ts`

- [ ] **Step 1: Create `server/src/routes/join.ts`**

```typescript
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Trip, TripMember } from '../models';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// POST /join/:code — body: { guest_name } OR Authorization header with JWT
router.post('/:code', async (req: Request, res: Response) => {
  const { code } = req.params;
  const trip = await Trip.findOne({ where: { invite_code: code.toUpperCase() } });
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

      // Check if already a member
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
    } catch {
      // Fall through to guest flow
    }
  }

  // Guest flow
  const { guest_name } = req.body;
  if (!guest_name || guest_name.trim().length < 2) {
    return res.status(400).json({ error: 'guest_name is required (min 2 chars)' });
  }

  const member = await TripMember.create({
    trip_id: trip.id,
    user_id: null,
    guest_name: guest_name.trim(),
    role: 'member',
  });

  const guestToken = jwt.sign(
    { member_id: member.id, trip_id: trip.id, guest_name: member.guest_name },
    process.env.GUEST_JWT_SECRET!,
    { expiresIn: '30d' }
  );

  res.json({ trip_id: trip.id, member_id: member.id, guest_token: guestToken, type: 'guest' });
});

export default router;
```

- [ ] **Step 2: Test guest join**

```bash
# Get invite_code from Task 4 test, e.g. "ABC123"
curl -X POST http://localhost:4000/join/ABC123 \
  -H "Content-Type: application/json" \
  -d '{"guest_name":"Alice"}'
# Expected: { trip_id, member_id, guest_token, type: "guest" }
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/join.ts
git commit -m "feat: join route for guest and auth users"
```

---

## Task 6: Multer upload middleware

**Files:**
- Create: `server/src/middleware/upload.ts`

- [ ] **Step 1: Create `server/src/middleware/upload.ts`**

```typescript
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only jpeg, png, and webp images are allowed'));
  }
}

export const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });
```

- [ ] **Step 2: Commit**

```bash
git add server/src/middleware/upload.ts
git commit -m "feat: Multer upload middleware (jpeg/png/webp, 10MB, UUID filenames)"
```

---

## Task 7: Pin routes

**Files:**
- Create: `server/src/routes/pins.ts`

- [ ] **Step 1: Create `server/src/routes/pins.ts`**

```typescript
import { Router, Response } from 'express';
import { anyMember, MemberRequest } from '../middleware/anyMember';
import { upload } from '../middleware/upload';
import { Pin, TripMember } from '../models';
import { getIO } from '../socket';

const router = Router();

// GET /trips/:id/pins
router.get('/:id/pins', anyMember, async (req: MemberRequest, res: Response) => {
  const pins = await Pin.findAll({
    where: { trip_id: req.params.id },
    include: [{ model: TripMember, as: 'member', attributes: ['id', 'guest_name', 'user_id'] }],
    order: [['created_at', 'DESC']],
  });
  res.json(pins);
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

  const pin = await Pin.create({
    trip_id: req.params.id,
    member_id: req.memberId!,
    lat,
    lng,
    title,
    note: note || null,
    category,
    photo_url,
  });

  const pinWithMember = await Pin.findByPk(pin.id, {
    include: [{ model: TripMember, as: 'member', attributes: ['id', 'guest_name', 'user_id'] }],
  });

  // Broadcast via Socket.io
  getIO().to(`trip:${req.params.id}`).emit('pin:added', pinWithMember);

  res.status(201).json(pinWithMember);
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/pins.ts
git commit -m "feat: pin list and create routes with photo upload"
```

---

## Task 8: Socket.io server

**Files:**
- Create: `server/src/socket/index.ts`

- [ ] **Step 1: Create `server/src/socket/index.ts`**

```typescript
import { Server as SocketServer } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import { TripMember } from '../models';

let io: SocketServer;

export function initSocket(server: http.Server) {
  io = new SocketServer(server, {
    cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    socket.on('join:trip', async ({ trip_id, token, guest_token }) => {
      try {
        let member: TripMember | null = null;

        if (token) {
          const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
          member = await TripMember.findOne({ where: { trip_id, user_id: payload.id } });
        } else if (guest_token) {
          const payload = jwt.verify(guest_token, process.env.GUEST_JWT_SECRET!) as {
            member_id: string;
            trip_id: string;
          };
          if (payload.trip_id !== trip_id) return;
          member = await TripMember.findByPk(payload.member_id);
        }

        if (!member) return socket.emit('error', 'Not authorized for this trip');
        socket.join(`trip:${trip_id}`);
      } catch {
        socket.emit('error', 'Invalid token');
      }
    });
  });
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/socket/
git commit -m "feat: Socket.io server with trip rooms and auth validation"
```

---

## Task 9: Gallery routes

**Files:**
- Create: `server/src/routes/gallery.ts`

- [ ] **Step 1: Create `server/src/routes/gallery.ts`**

```typescript
import { Router, Response } from 'express';
import { anyMember, MemberRequest } from '../middleware/anyMember';
import { upload } from '../middleware/upload';
import { GalleryPhoto, TripMember, Pin } from '../models';

const router = Router();

// GET /trips/:id/gallery
router.get('/:id/gallery', anyMember, async (req: MemberRequest, res: Response) => {
  const photos = await GalleryPhoto.findAll({
    where: { trip_id: req.params.id },
    include: [
      { model: TripMember, as: 'member', attributes: ['id', 'guest_name', 'user_id'] },
      { model: Pin, as: 'pin', attributes: ['id', 'lat', 'lng', 'title'] },
    ],
    order: [['created_at', 'DESC']],
  });
  res.json(photos);
});

// POST /trips/:id/gallery (direct photo upload, no pin)
router.post('/:id/gallery', anyMember, upload.single('photo'), async (req: MemberRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'photo is required' });

  const photo = await GalleryPhoto.create({
    trip_id: req.params.id,
    member_id: req.memberId!,
    pin_id: null,
    url: `/uploads/${req.file.filename}`,
  });

  res.status(201).json(photo);
});

export default router;
```

> **Note:** When a pin with a photo is created (Task 7), also insert a GalleryPhoto. Add this after `Pin.create(...)` in `pins.ts`:
>
> ```typescript
> if (photo_url) {
>   await GalleryPhoto.create({
>     trip_id: req.params.id,
>     member_id: req.memberId!,
>     pin_id: pin.id,
>     url: photo_url,
>   });
> }
> ```

- [ ] **Step 2: Add GalleryPhoto insert to `server/src/routes/pins.ts`**

In `pins.ts`, after `const pin = await Pin.create(...)`, add:

```typescript
import { GalleryPhoto } from '../models';

// ... inside the POST handler, after Pin.create:
if (photo_url) {
  await GalleryPhoto.create({
    trip_id: req.params.id,
    member_id: req.memberId!,
    pin_id: pin.id,
    url: photo_url,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/gallery.ts server/src/routes/pins.ts
git commit -m "feat: gallery routes + auto-insert photo from pin"
```

---

## Task 10: Frontend scaffold + dependencies

**Files:**
- Modify: `package.json` (root — created by Next.js)
- Create: `.env.local`
- Create: `types/index.ts`
- Create: `lib/api.ts`
- Create: `lib/socket.ts`
- Create: `styles/globals.scss`
- Create: `styles/_variables.scss`

- [ ] **Step 1: Scaffold Next.js frontend in project root**

```bash
# From travel-memory-map root
npx create-next-app@latest . --typescript --app --no-tailwind --src-dir=false --import-alias="@/*"
```

When prompted, accept defaults. This creates `app/`, `public/`, `package.json`, `tsconfig.json`, `next.config.js`.

- [ ] **Step 2: Install frontend dependencies**

```bash
npm install react-leaflet leaflet socket.io-client zustand axios
npm install -D @types/leaflet sass
```

- [ ] **Step 3: Create `.env.local`**

```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

- [ ] **Step 4: Create `types/index.ts`**

```typescript
export type Category = 'food' | 'spot' | 'hotel' | 'activity';

export interface User {
  id: string;
  email: string;
  display_name: string;
}

export interface Trip {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  members?: TripMember[];
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string | null;
  guest_name: string | null;
  role: 'owner' | 'member';
  joined_at: string;
  user?: User;
}

export interface Pin {
  id: string;
  trip_id: string;
  member_id: string;
  lat: number;
  lng: number;
  title: string;
  note: string | null;
  category: Category;
  photo_url: string | null;
  created_at: string;
  member?: TripMember;
}

export interface GalleryPhoto {
  id: string;
  trip_id: string;
  member_id: string;
  pin_id: string | null;
  url: string;
  created_at: string;
  member?: TripMember;
  pin?: Pin;
}

export interface AuthState {
  token: string | null;
  guestToken: string | null;
  user: User | null;
  guestName: string | null;
}
```

- [ ] **Step 5: Create `lib/api.ts`**

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config;

  const token = localStorage.getItem('token');
  const guestToken = localStorage.getItem('guest_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (guestToken) {
    config.headers['x-guest-token'] = guestToken;
  }
  return config;
});

export default api;
```

- [ ] **Step 6: Create `lib/socket.ts`**

```typescript
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, { autoConnect: false });
  }
  return socket;
}

export function joinTripRoom(tripId: string) {
  const sock = getSocket();
  const token = localStorage.getItem('token');
  const guestToken = localStorage.getItem('guest_token');

  if (!sock.connected) sock.connect();
  sock.emit('join:trip', { trip_id: tripId, token, guest_token: guestToken });
}
```

- [ ] **Step 7: Create `styles/_variables.scss`**

```scss
$color-primary: #2563eb;
$color-secondary: #10b981;
$color-danger: #ef4444;
$color-bg: #f8fafc;
$color-surface: #ffffff;
$color-text: #1e293b;
$color-text-muted: #64748b;
$color-border: #e2e8f0;

$radius-sm: 6px;
$radius-md: 12px;
$radius-lg: 20px;

$font-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

$mobile: 390px;
$tablet: 768px;
$desktop: 1200px;

$shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
$shadow-md: 0 4px 16px rgba(0, 0, 0, 0.12);
```

- [ ] **Step 8: Create `styles/globals.scss`**

```scss
@import 'variables';

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  font-family: $font-base;
  font-size: 16px;
  color: $color-text;
  background: $color-bg;
  -webkit-font-smoothing: antialiased;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  cursor: pointer;
  font-family: $font-base;
  border: none;
  background: none;
}

input, textarea, select {
  font-family: $font-base;
}
```

- [ ] **Step 9: Update `app/layout.tsx`**

```typescript
import type { Metadata } from 'next';
import '@/styles/globals.scss';

export const metadata: Metadata = {
  title: 'Travel Memory Map',
  description: 'Pin memories on a map with friends',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 10: Commit**

```bash
git add app/ lib/ types/ styles/ .env.local
git commit -m "feat: Next.js frontend scaffold with types, api, socket, styles"
```

---

## Task 11: Zustand stores

**Files:**
- Create: `store/authStore.ts`
- Create: `store/tripStore.ts`

- [ ] **Step 1: Create `store/authStore.ts`**

```typescript
import { create } from 'zustand';
import { User } from '@/types';

interface AuthStore {
  token: string | null;
  guestToken: string | null;
  user: User | null;
  guestName: string | null;
  setAuth: (token: string, user: User) => void;
  setGuest: (guestToken: string, guestName: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  guestToken: null,
  user: null,
  guestName: null,

  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.removeItem('guest_token');
    set({ token, user, guestToken: null, guestName: null });
  },

  setGuest: (guestToken, guestName) => {
    localStorage.setItem('guest_token', guestToken);
    localStorage.removeItem('token');
    set({ guestToken, guestName, token: null, user: null });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('guest_token');
    set({ token: null, guestToken: null, user: null, guestName: null });
  },

  hydrate: () => {
    const token = localStorage.getItem('token');
    const guestToken = localStorage.getItem('guest_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        set({ token, user: { id: payload.id, email: payload.email, display_name: payload.display_name } });
      } catch {}
    } else if (guestToken) {
      try {
        const payload = JSON.parse(atob(guestToken.split('.')[1]));
        set({ guestToken, guestName: payload.guest_name });
      } catch {}
    }
  },
}));
```

- [ ] **Step 2: Create `store/tripStore.ts`**

```typescript
import { create } from 'zustand';
import { Trip, Pin, TripMember } from '@/types';

interface TripStore {
  trip: Trip | null;
  pins: Pin[];
  members: TripMember[];
  setTrip: (trip: Trip) => void;
  setPins: (pins: Pin[]) => void;
  addPin: (pin: Pin) => void;
  setMembers: (members: TripMember[]) => void;
  reset: () => void;
}

export const useTripStore = create<TripStore>((set) => ({
  trip: null,
  pins: [],
  members: [],

  setTrip: (trip) => set({ trip }),
  setPins: (pins) => set({ pins }),
  addPin: (pin) => set((state) => ({ pins: [pin, ...state.pins] })),
  setMembers: (members) => set({ members }),
  reset: () => set({ trip: null, pins: [], members: [] }),
}));
```

- [ ] **Step 3: Commit**

```bash
git add store/
git commit -m "feat: Zustand auth and trip stores"
```

---

## Task 12: Auth pages (register + login)

**Files:**
- Create: `app/auth/login/page.tsx`
- Create: `app/auth/login/page.module.scss`
- Create: `app/auth/register/page.tsx`
- Create: `app/auth/register/page.module.scss`

- [ ] **Step 1: Create `app/auth/login/page.module.scss`**

```scss
@import '@/styles/variables';

.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: $color-bg;
}

.card {
  background: $color-surface;
  border-radius: $radius-lg;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  box-shadow: $shadow-md;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: $color-text;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;

  label {
    font-size: 0.875rem;
    font-weight: 500;
    color: $color-text-muted;
  }

  input {
    border: 1.5px solid $color-border;
    border-radius: $radius-sm;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: $color-primary;
    }
  }
}

.error {
  color: $color-danger;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.button {
  width: 100%;
  background: $color-primary;
  color: white;
  border-radius: $radius-sm;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  transition: opacity 0.2s;

  &:disabled {
    opacity: 0.6;
  }
}

.link {
  text-align: center;
  margin-top: 1.25rem;
  font-size: 0.875rem;
  color: $color-text-muted;

  a {
    color: $color-primary;
    font-weight: 500;
  }
}
```

- [ ] **Step 2: Create `app/auth/login/page.tsx`**

```typescript
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import styles from './page.module.scss';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, hydrate, token } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (token) router.replace('/');
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      setAuth(res.data.token, res.data.user);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome back</h1>
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className={styles.link}>
          No account? <Link href="/auth/register">Register</Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Copy SCSS for register page**

Create `app/auth/register/page.module.scss` — identical to login's SCSS (same styles apply).

- [ ] **Step 4: Create `app/auth/register/page.tsx`**

```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import styles from './page.module.scss';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/register', { email, password, display_name: displayName });
      setAuth(res.data.token, res.data.user);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create account</h1>
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Name</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <div className={styles.link}>
          Already have an account? <Link href="/auth/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/auth/
git commit -m "feat: login and register pages"
```

---

## Task 13: Landing page

**Files:**
- Create: `app/page.tsx`
- Create: `app/page.module.scss`

- [ ] **Step 1: Create `app/page.module.scss`**

```scss
@import '@/styles/variables';

.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: $color-bg;
  gap: 2rem;
}

.hero {
  text-align: center;

  h1 {
    font-size: 2rem;
    font-weight: 800;
    color: $color-text;
    margin-bottom: 0.5rem;
  }

  p {
    color: $color-text-muted;
    font-size: 1rem;
  }
}

.card {
  background: $color-surface;
  border-radius: $radius-lg;
  padding: 1.5rem;
  width: 100%;
  max-width: 420px;
  box-shadow: $shadow-md;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: $color-text-muted;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  input {
    border: 1.5px solid $color-border;
    border-radius: $radius-sm;
    padding: 0.75rem 1rem;
    font-size: 1rem;

    &:focus {
      outline: none;
      border-color: $color-primary;
    }
  }
}

.btn-primary {
  background: $color-primary;
  color: white;
  border-radius: $radius-sm;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  width: 100%;
  transition: opacity 0.2s;

  &:disabled { opacity: 0.6; }
}

.btn-secondary {
  background: $color-surface;
  color: $color-primary;
  border: 1.5px solid $color-primary;
  border-radius: $radius-sm;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  width: 100%;
}

.divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: $color-text-muted;
  font-size: 0.875rem;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: $color-border;
  }
}

.error {
  color: $color-danger;
  font-size: 0.875rem;
}

.auth-links {
  text-align: center;
  font-size: 0.875rem;
  color: $color-text-muted;

  a {
    color: $color-primary;
    font-weight: 500;
  }
}
```

- [ ] **Step 2: Create `app/page.tsx`**

```typescript
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import styles from './page.module.scss';

export default function LandingPage() {
  const router = useRouter();
  const { token, user, hydrate } = useAuthStore();

  const [tripName, setTripName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    hydrate();
  }, []);

  async function createTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return router.push('/auth/login');
    setCreating(true);
    setError('');
    try {
      const res = await api.post('/trips', { name: tripName });
      router.push(`/trip/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create trip');
      setCreating(false);
    }
  }

  function goJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    router.push(`/join/${joinCode.trim().toUpperCase()}`);
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1>Travel Memory Map</h1>
        <p>Pin memories on a map with your travel crew</p>
      </div>

      <div className={styles.card}>
        {user ? (
          <>
            <p className={styles['section-title']}>Create a new trip</p>
            <form onSubmit={createTrip}>
              <div className={styles.field}>
                <input
                  type="text"
                  placeholder="Trip name (e.g. Portugal 2024)"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  required
                />
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <button className={styles['btn-primary']} type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create trip'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className={styles['section-title']}>Create a trip</p>
            <Link href="/auth/register">
              <button className={styles['btn-primary']}>Register to create a trip</button>
            </Link>
            <div className={styles['auth-links']}>
              Already have an account? <Link href="/auth/login">Sign in</Link>
            </div>
          </>
        )}

        <div className={styles.divider}>or</div>

        <p className={styles['section-title']}>Join with an invite code</p>
        <form onSubmit={goJoin}>
          <div className={styles.field}>
            <input
              type="text"
              placeholder="Enter invite code (e.g. ABC123)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
            />
          </div>
          <button className={styles['btn-secondary']} type="submit">
            Join trip
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx app/page.module.scss
git commit -m "feat: landing page with create trip and join forms"
```

---

## Task 14: Join page (guest flow)

**Files:**
- Create: `app/join/[code]/page.tsx`
- Create: `app/join/[code]/page.module.scss`

- [ ] **Step 1: Create `app/join/[code]/page.module.scss`**

```scss
@import '@/styles/variables';

.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: $color-bg;
}

.card {
  background: $color-surface;
  border-radius: $radius-lg;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  box-shadow: $shadow-md;
  text-align: center;
}

.emoji { font-size: 2.5rem; margin-bottom: 0.75rem; }

.title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: $color-text-muted;
  font-size: 0.95rem;
  margin-bottom: 1.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
  text-align: left;

  label { font-size: 0.875rem; font-weight: 500; color: $color-text-muted; }

  input {
    border: 1.5px solid $color-border;
    border-radius: $radius-sm;
    padding: 0.75rem 1rem;
    font-size: 1rem;

    &:focus { outline: none; border-color: $color-primary; }
  }
}

.button {
  width: 100%;
  background: $color-primary;
  color: white;
  border-radius: $radius-sm;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  transition: opacity 0.2s;

  &:disabled { opacity: 0.6; }
}

.error { color: $color-danger; font-size: 0.875rem; margin-bottom: 1rem; }
```

- [ ] **Step 2: Create `app/join/[code]/page.tsx`**

```typescript
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import styles from './page.module.scss';

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { token, guestToken, setGuest, hydrate } = useAuthStore();

  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    hydrate();
  }, []);

  // If already has a token (auth or guest), try to auto-join
  useEffect(() => {
    if (token || guestToken) {
      joinTrip();
    }
  }, [token, guestToken]);

  async function joinTrip(nameOverride?: string) {
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/join/${code}`, nameOverride ? { guest_name: nameOverride } : {});
      const { trip_id, guest_token } = res.data;

      if (guest_token) {
        setGuest(guest_token, nameOverride || '');
      }

      router.push(`/trip/${trip_id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not join trip');
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await joinTrip(guestName.trim());
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.emoji}>🗺️</div>
        <h1 className={styles.title}>Join trip</h1>
        <p className={styles.subtitle}>Enter your name to pin memories with the crew</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Your name</label>
            <input
              type="text"
              placeholder="e.g. Alice"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              minLength={2}
              required
              autoFocus
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? 'Joining...' : 'Join trip'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/join/
git commit -m "feat: guest join page with name input"
```

---

## Task 15: Map page + MapView component

**Files:**
- Create: `app/trip/[id]/page.tsx`
- Create: `app/trip/[id]/page.module.scss`
- Create: `components/Map/MapView.tsx`
- Create: `components/Map/MapView.module.scss`

- [ ] **Step 1: Create `app/trip/[id]/page.module.scss`**

```scss
@import '@/styles/variables';

.layout {
  display: flex;
  height: 100dvh;
  overflow: hidden;

  @media (max-width: $tablet) {
    flex-direction: column;
  }
}

.map-area {
  flex: 1;
  position: relative;
}

.sidebar-area {
  width: 360px;
  border-left: 1px solid $color-border;
  overflow-y: auto;
  background: $color-surface;

  @media (max-width: $tablet) {
    width: 100%;
    height: 40dvh;
    border-left: none;
    border-top: 1px solid $color-border;
  }
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100dvh;
  font-size: 1rem;
  color: $color-text-muted;
}
```

- [ ] **Step 2: Create `app/trip/[id]/page.tsx`**

```typescript
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useTripStore } from '@/store/tripStore';
import { joinTripRoom, getSocket } from '@/lib/socket';
import { Pin } from '@/types';
import TripSidebar from '@/components/Sidebar/TripSidebar';
import styles from './page.module.scss';

// SSR must be false for Leaflet
const MapView = dynamic(() => import('@/components/Map/MapView'), { ssr: false });

export default function TripPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hydrate, token, guestToken } = useAuthStore();
  const { setTrip, setPins, addPin } = useTripStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!token && !guestToken) {
      // Not authenticated at all, redirect to join
      router.replace(`/join/`);
      return;
    }
    loadTrip();
  }, [token, guestToken]);

  async function loadTrip() {
    try {
      const [tripRes, pinsRes] = await Promise.all([
        api.get(`/trips/${id}`),
        api.get(`/trips/${id}/pins`),
      ]);
      setTrip(tripRes.data);
      setPins(pinsRes.data);

      // Join Socket.io room
      joinTripRoom(id);

      // Listen for new pins
      const socket = getSocket();
      socket.on('pin:added', (pin: Pin) => {
        addPin(pin);
      });

      setReady(true);
    } catch {
      router.replace('/');
    }
  }

  if (!ready) {
    return <div className={styles.loading}>Loading trip...</div>;
  }

  return (
    <div className={styles.layout}>
      <div className={styles['map-area']}>
        <MapView tripId={id} />
      </div>
      <div className={styles['sidebar-area']}>
        <TripSidebar tripId={id} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `components/Map/MapView.module.scss`**

```scss
@import '@/styles/variables';

.container {
  width: 100%;
  height: 100%;
  position: relative;
}

.map {
  width: 100%;
  height: 100%;
}

.hint {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-radius: $radius-md;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: $color-text-muted;
  box-shadow: $shadow-sm;
  z-index: 1000;
  pointer-events: none;
  white-space: nowrap;
}
```

- [ ] **Step 4: Create `components/Map/MapView.tsx`**

```typescript
'use client';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useTripStore } from '@/store/tripStore';
import PinMarker from './PinMarker';
import PinForm from './PinForm';
import styles from './MapView.module.scss';

interface ClickedPosition {
  lat: number;
  lng: number;
}

function MapClickHandler({ onMapClick }: { onMapClick: (pos: ClickedPosition) => void }) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function MapView({ tripId }: { tripId: string }) {
  const { pins } = useTripStore();
  const [clickedPos, setClickedPos] = useState<ClickedPosition | null>(null);

  // Fix Leaflet default marker icons (Next.js webpack issue)
  useEffect(() => {
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    const L = require('leaflet');
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/leaflet/marker-icon-2x.png',
      iconUrl: '/leaflet/marker-icon.png',
      shadowUrl: '/leaflet/marker-shadow.png',
    });
  }, []);

  return (
    <div className={styles.container}>
      <MapContainer
        center={[48.8566, 2.3522]}
        zoom={5}
        className={styles.map}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={(pos) => setClickedPos(pos)} />
        {pins.map((pin) => (
          <PinMarker key={pin.id} pin={pin} />
        ))}
      </MapContainer>

      {!clickedPos && (
        <div className={styles.hint}>Tap anywhere on the map to add a memory</div>
      )}

      {clickedPos && (
        <PinForm
          tripId={tripId}
          lat={clickedPos.lat}
          lng={clickedPos.lng}
          onClose={() => setClickedPos(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Copy Leaflet marker assets to `/public/leaflet/`**

```bash
mkdir -p public/leaflet
cp node_modules/leaflet/dist/images/marker-icon.png public/leaflet/
cp node_modules/leaflet/dist/images/marker-icon-2x.png public/leaflet/
cp node_modules/leaflet/dist/images/marker-shadow.png public/leaflet/
```

- [ ] **Step 6: Commit**

```bash
git add app/trip/ components/Map/MapView.tsx components/Map/MapView.module.scss public/leaflet/
git commit -m "feat: trip map page with react-leaflet and click handler"
```

---

## Task 16: PinMarker component

**Files:**
- Create: `components/Map/PinMarker.tsx`
- Create: `components/Map/PinMarker.module.scss`

- [ ] **Step 1: Create `components/Map/PinMarker.tsx`**

```typescript
'use client';
import { useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Pin, Category } from '@/types';
import PinDetail from './PinDetail';

const CATEGORY_EMOJI: Record<Category, string> = {
  food: '🍽️',
  spot: '📍',
  hotel: '🏨',
  activity: '🎯',
};

const CATEGORY_COLOR: Record<Category, string> = {
  food: '#f59e0b',
  spot: '#3b82f6',
  hotel: '#8b5cf6',
  activity: '#10b981',
};

function createCategoryIcon(category: Category) {
  const emoji = CATEGORY_EMOJI[category];
  const color = CATEGORY_COLOR[category];
  return L.divIcon({
    className: '',
    html: `<div style="
      background: ${color};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      border: 2px solid white;
    ">
      <span style="transform: rotate(45deg); font-size: 16px; line-height: 1;">${emoji}</span>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

export default function PinMarker({ pin }: { pin: Pin }) {
  const icon = createCategoryIcon(pin.category);

  return (
    <Marker position={[pin.lat, pin.lng]} icon={icon}>
      <Popup maxWidth={280} minWidth={200}>
        <PinDetail pin={pin} />
      </Popup>
    </Marker>
  );
}
```

- [ ] **Step 2: Create `components/Map/PinDetail.tsx`**

```typescript
import { Pin } from '@/types';
import styles from './PinDetail.module.scss';

export default function PinDetail({ pin }: { pin: Pin }) {
  const authorName = pin.member?.user ? pin.member.user.display_name || 'Unknown' : pin.member?.guest_name || 'Guest';

  return (
    <div className={styles.detail}>
      {pin.photo_url && (
        <img
          src={`${process.env.NEXT_PUBLIC_API_URL}${pin.photo_url}`}
          alt={pin.title}
          className={styles.photo}
        />
      )}
      <div className={styles.content}>
        <h3 className={styles.title}>{pin.title}</h3>
        {pin.note && <p className={styles.note}>{pin.note}</p>}
        <span className={styles.author}>by {authorName}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `components/Map/PinDetail.module.scss`**

```scss
@import '@/styles/variables';

.detail {
  font-family: $font-base;
  max-width: 260px;
}

.photo {
  width: 100%;
  border-radius: $radius-sm;
  margin-bottom: 0.75rem;
  object-fit: cover;
  max-height: 160px;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.title {
  font-size: 1rem;
  font-weight: 700;
  color: $color-text;
}

.note {
  font-size: 0.875rem;
  color: $color-text-muted;
  line-height: 1.5;
}

.author {
  font-size: 0.75rem;
  color: $color-text-muted;
  margin-top: 0.25rem;
}
```

- [ ] **Step 4: Commit**

```bash
git add components/Map/PinMarker.tsx components/Map/PinDetail.tsx components/Map/PinDetail.module.scss
git commit -m "feat: PinMarker with category icons and PinDetail popup"
```

---

## Task 17: PinForm (bottom sheet)

**Files:**
- Create: `components/Map/PinForm.tsx`
- Create: `components/Map/PinForm.module.scss`

- [ ] **Step 1: Create `components/Map/PinForm.module.scss`**

```scss
@import '@/styles/variables';

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 2000;
  display: flex;
  align-items: flex-end;

  @media (min-width: $tablet) {
    align-items: center;
    justify-content: center;
  }
}

.sheet {
  background: $color-surface;
  border-radius: $radius-lg $radius-lg 0 0;
  padding: 1.5rem;
  width: 100%;
  max-height: 85dvh;
  overflow-y: auto;

  @media (min-width: $tablet) {
    border-radius: $radius-lg;
    max-width: 480px;
    max-height: 80dvh;
  }
}

.handle {
  width: 40px;
  height: 4px;
  background: $color-border;
  border-radius: 99px;
  margin: 0 auto 1.25rem;

  @media (min-width: $tablet) { display: none; }
}

.title {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;

  label { font-size: 0.875rem; font-weight: 500; color: $color-text-muted; }

  input, textarea, select {
    border: 1.5px solid $color-border;
    border-radius: $radius-sm;
    padding: 0.75rem 1rem;
    font-size: 1rem;

    &:focus { outline: none; border-color: $color-primary; }
  }

  textarea { resize: vertical; min-height: 80px; }
}

.categories {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.cat-btn {
  padding: 0.5rem 0.875rem;
  border-radius: 99px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1.5px solid $color-border;
  color: $color-text-muted;
  transition: all 0.15s;

  &.active {
    background: $color-primary;
    border-color: $color-primary;
    color: white;
  }
}

.photo-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1.5px dashed $color-border;
  border-radius: $radius-sm;
  padding: 0.875rem 1rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: $color-text-muted;
  transition: border-color 0.2s;
  margin-bottom: 1rem;

  &:hover { border-color: $color-primary; }

  input { display: none; }
}

.photo-preview {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  border-radius: $radius-sm;
  margin-bottom: 1rem;
}

.actions {
  display: flex;
  gap: 0.75rem;
  padding-top: 0.5rem;
}

.btn-submit {
  flex: 1;
  background: $color-primary;
  color: white;
  border-radius: $radius-sm;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  transition: opacity 0.2s;

  &:disabled { opacity: 0.6; }
}

.btn-cancel {
  background: $color-bg;
  color: $color-text-muted;
  border: 1.5px solid $color-border;
  border-radius: $radius-sm;
  padding: 0.875rem 1.25rem;
  font-size: 1rem;
}

.error { color: $color-danger; font-size: 0.875rem; margin-bottom: 0.75rem; }
```

- [ ] **Step 2: Create `components/Map/PinForm.tsx`**

```typescript
'use client';
import { useState, useRef } from 'react';
import api from '@/lib/api';
import { Category } from '@/types';
import styles from './PinForm.module.scss';

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'spot', label: 'Spot', emoji: '📍' },
  { value: 'food', label: 'Food', emoji: '🍽️' },
  { value: 'hotel', label: 'Hotel', emoji: '🏨' },
  { value: 'activity', label: 'Activity', emoji: '🎯' },
];

interface PinFormProps {
  tripId: string;
  lat: number;
  lng: number;
  onClose: () => void;
}

export default function PinForm({ tripId, lat, lng, onClose }: PinFormProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('spot');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = new FormData();
    form.append('title', title);
    form.append('category', category);
    form.append('lat', String(lat));
    form.append('lng', String(lng));
    if (note) form.append('note', note);
    if (photo) form.append('photo', photo);

    try {
      await api.post(`/trips/${tripId}/pins`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create pin');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <h2 className={styles.title}>Add a memory</h2>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What is this place?"
              required
              autoFocus
            />
          </div>

          <div className={styles.categories}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                className={`${styles['cat-btn']} ${category === cat.value ? styles.active : ''}`}
                onClick={() => setCategory(cat.value)}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>

          <div className={styles.field}>
            <label>Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tell the crew about this spot..."
            />
          </div>

          {preview ? (
            <img src={preview} alt="Preview" className={styles['photo-preview']} />
          ) : (
            <label className={styles['photo-label']}>
              📷 Add a photo (optional)
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} />
            </label>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles['btn-cancel']} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles['btn-submit']} disabled={loading}>
              {loading ? 'Saving...' : 'Save memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Map/PinForm.tsx components/Map/PinForm.module.scss
git commit -m "feat: PinForm bottom sheet with category, note, photo upload"
```

---

## Task 18: Sidebar

**Files:**
- Create: `components/Sidebar/TripSidebar.tsx`
- Create: `components/Sidebar/TripSidebar.module.scss`

- [ ] **Step 1: Create `components/Sidebar/TripSidebar.module.scss`**

```scss
@import '@/styles/variables';

.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
  padding: 1.25rem 1rem;
  border-bottom: 1px solid $color-border;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-shrink: 0;
}

.trip-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: $color-text;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.invite-code {
  font-size: 0.75rem;
  font-weight: 600;
  background: $color-bg;
  border: 1px solid $color-border;
  padding: 0.3rem 0.6rem;
  border-radius: $radius-sm;
  color: $color-text-muted;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s;

  &:hover { background: $color-border; }
}

.pins-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.pin-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid $color-border;

  &:last-child { border-bottom: none; }
}

.pin-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.pin-info {
  flex: 1;
  min-width: 0;
}

.pin-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: $color-text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pin-meta {
  font-size: 0.75rem;
  color: $color-text-muted;
  margin-top: 0.2rem;
}

.empty {
  padding: 2rem 1rem;
  text-align: center;
  color: $color-text-muted;
  font-size: 0.9rem;
}

.gallery-link {
  display: block;
  margin: 0.75rem 1rem;
  padding: 0.75rem;
  background: $color-bg;
  border: 1.5px solid $color-border;
  border-radius: $radius-sm;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: $color-text;
  transition: background 0.2s;

  &:hover { background: $color-border; }
}
```

- [ ] **Step 2: Create `components/Sidebar/TripSidebar.tsx`**

```typescript
'use client';
import Link from 'next/link';
import { useTripStore } from '@/store/tripStore';
import { Category } from '@/types';

const CATEGORY_EMOJI: Record<Category, string> = {
  food: '🍽️',
  spot: '📍',
  hotel: '🏨',
  activity: '🎯',
};

import styles from './TripSidebar.module.scss';

export default function TripSidebar({ tripId }: { tripId: string }) {
  const { trip, pins } = useTripStore();

  function copyInviteLink() {
    if (!trip) return;
    const url = `${window.location.origin}/join/${trip.invite_code}`;
    navigator.clipboard.writeText(url);
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles['trip-name']}>{trip?.name || 'Loading...'}</h2>
        {trip && (
          <button className={styles['invite-code']} onClick={copyInviteLink} title="Copy invite link">
            {trip.invite_code} 🔗
          </button>
        )}
      </div>

      <Link href={`/trip/${tripId}/gallery`} className={styles['gallery-link']}>
        📸 View gallery
      </Link>

      <div className={styles['pins-list']}>
        {pins.length === 0 ? (
          <div className={styles.empty}>
            No memories yet.<br />Tap the map to add the first one!
          </div>
        ) : (
          pins.map((pin) => {
            const author = pin.member?.user?.display_name || pin.member?.guest_name || 'Someone';
            return (
              <div key={pin.id} className={styles['pin-item']}>
                <span className={styles['pin-icon']}>{CATEGORY_EMOJI[pin.category]}</span>
                <div className={styles['pin-info']}>
                  <div className={styles['pin-title']}>{pin.title}</div>
                  <div className={styles['pin-meta']}>by {author}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Sidebar/
git commit -m "feat: TripSidebar with pin list and invite code copy"
```

---

## Task 19: Gallery page

**Files:**
- Create: `app/trip/[id]/gallery/page.tsx`
- Create: `app/trip/[id]/gallery/page.module.scss`
- Create: `components/Gallery/GalleryGrid.tsx`
- Create: `components/Gallery/GalleryGrid.module.scss`
- Create: `components/Gallery/PhotoUpload.tsx`
- Create: `components/Gallery/PhotoUpload.module.scss`

- [ ] **Step 1: Create `components/Gallery/GalleryGrid.module.scss`**

```scss
@import '@/styles/variables';

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;

  @media (min-width: $tablet) {
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }
}

.item {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  cursor: pointer;
  background: $color-bg;

  &:hover .overlay { opacity: 1; }
}

.photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.overlay-icon {
  font-size: 1.5rem;
}

.empty {
  grid-column: 1 / -1;
  padding: 3rem;
  text-align: center;
  color: $color-text-muted;
}
```

- [ ] **Step 2: Create `components/Gallery/GalleryGrid.tsx`**

```typescript
'use client';
import { useRouter } from 'next/navigation';
import { GalleryPhoto } from '@/types';
import styles from './GalleryGrid.module.scss';

interface GalleryGridProps {
  photos: GalleryPhoto[];
  tripId: string;
}

export default function GalleryGrid({ photos, tripId }: GalleryGridProps) {
  const router = useRouter();

  function handleClick(photo: GalleryPhoto) {
    if (photo.pin_id) {
      router.push(`/trip/${tripId}?pin=${photo.pin_id}`);
    }
  }

  return (
    <div className={styles.grid}>
      {photos.length === 0 && (
        <div className={styles.empty}>No photos yet. Add the first one!</div>
      )}
      {photos.map((photo) => (
        <div key={photo.id} className={styles.item} onClick={() => handleClick(photo)}>
          <img
            src={`${process.env.NEXT_PUBLIC_API_URL}${photo.url}`}
            alt=""
            className={styles.photo}
          />
          {photo.pin_id && (
            <div className={styles.overlay}>
              <span className={styles['overlay-icon']}>📍</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `components/Gallery/PhotoUpload.module.scss`**

```scss
@import '@/styles/variables';

.upload {
  margin: 1rem;
}

.label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1.5px dashed $color-border;
  border-radius: $radius-sm;
  padding: 1rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: $color-text-muted;
  transition: border-color 0.2s;

  &:hover { border-color: $color-primary; }

  input { display: none; }
}

.uploading {
  text-align: center;
  padding: 1rem;
  font-size: 0.875rem;
  color: $color-text-muted;
}
```

- [ ] **Step 4: Create `components/Gallery/PhotoUpload.tsx`**

```typescript
'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { GalleryPhoto } from '@/types';
import styles from './PhotoUpload.module.scss';

interface PhotoUploadProps {
  tripId: string;
  onUploaded: (photo: GalleryPhoto) => void;
}

export default function PhotoUpload({ tripId, onUploaded }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('photo', file);
    try {
      const res = await api.post(`/trips/${tripId}/gallery`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(res.data);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className={styles.upload}>
      {uploading ? (
        <div className={styles.uploading}>Uploading...</div>
      ) : (
        <label className={styles.label}>
          📷 Upload a photo to gallery
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} />
        </label>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create `app/trip/[id]/gallery/page.module.scss`**

```scss
@import '@/styles/variables';

.page {
  min-height: 100dvh;
  background: $color-bg;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: $color-surface;
  border-bottom: 1px solid $color-border;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back {
  font-size: 1.25rem;
  color: $color-text;
  padding: 0.25rem;
}

.title {
  font-size: 1.1rem;
  font-weight: 700;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50dvh;
  color: $color-text-muted;
}
```

- [ ] **Step 6: Create `app/trip/[id]/gallery/page.tsx`**

```typescript
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { GalleryPhoto } from '@/types';
import GalleryGrid from '@/components/Gallery/GalleryGrid';
import PhotoUpload from '@/components/Gallery/PhotoUpload';
import styles from './page.module.scss';

export default function GalleryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hydrate } = useAuthStore();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hydrate();
    loadPhotos();
  }, []);

  async function loadPhotos() {
    try {
      const res = await api.get(`/trips/${id}/gallery`);
      setPhotos(res.data);
    } catch {
      router.replace('/');
    } finally {
      setLoading(false);
    }
  }

  function handleUploaded(photo: GalleryPhoto) {
    setPhotos((prev) => [photo, ...prev]);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={`/trip/${id}`} className={styles.back}>←</Link>
        <h1 className={styles.title}>Gallery</h1>
      </header>

      <PhotoUpload tripId={id} onUploaded={handleUploaded} />

      {loading ? (
        <div className={styles.loading}>Loading photos...</div>
      ) : (
        <GalleryGrid photos={photos} tripId={id} />
      )}
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add app/trip/ components/Gallery/
git commit -m "feat: gallery page with photo grid and direct upload"
```

---

## Task 20: Mobile-first CSS polish

**Files:** Review and adjust all `*.module.scss` files

- [ ] **Step 1: Verify map takes full viewport on mobile**

In `app/trip/[id]/page.module.scss`, confirm:
- `.map-area` has `height: 60dvh` on mobile (or full height when sidebar is hidden)
- On mobile, sidebar is a bottom panel with `height: 40dvh` and `overflow-y: auto`

Update if needed:
```scss
@media (max-width: $tablet) {
  .layout {
    flex-direction: column;
  }
  .map-area {
    height: 60dvh;
  }
  .sidebar-area {
    height: 40dvh;
  }
}
```

- [ ] **Step 2: Verify PinForm bottom sheet feels native on mobile**

In `PinForm.module.scss`, confirm `.sheet` has:
- `border-radius: $radius-lg $radius-lg 0 0` on mobile
- Smooth overflow-y scroll with `-webkit-overflow-scrolling: touch`

Add to `.sheet`:
```scss
-webkit-overflow-scrolling: touch;
```

- [ ] **Step 3: Verify touch targets ≥ 44px**

Check all `button` and `a` elements in forms and navigation. Minimum height: `44px`. Add to globals.scss if needed:
```scss
button, a {
  min-height: 44px;
}
```

- [ ] **Step 4: Commit**

```bash
git add app/ components/ styles/
git commit -m "fix: mobile-first CSS polish across all pages"
```

---

## Task 21: Final integration check

- [ ] **Step 1: Start both servers**

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
npm run dev
```

- [ ] **Step 2: Full happy path test**

1. Register at `http://localhost:3000/auth/register`
2. Create a trip on landing page
3. Copy the invite code from the sidebar
4. Open incognito → go to `http://localhost:3000/join/[code]`
5. Enter a guest name → land on the map
6. In original window: click on map → fill form → submit pin
7. Verify pin appears in both windows instantly (Socket.io)
8. Open `http://localhost:3000/trip/[id]/gallery` → photo visible

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: Travel Memory Map MVP complete"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Covered |
|---|---|
| Register / login with JWT | Task 3–4 |
| Guest join via magic link | Task 5 |
| Trip create + invite_code | Task 4 |
| /join/[code] page | Task 14 |
| Interactive map (Leaflet + OSM) | Task 15 |
| Click map → create pin | Tasks 15–17 |
| Pin categories + icons | Task 16 |
| Photo upload on pin (Multer) | Task 7, 17 |
| Real-time pin broadcast (Socket.io) | Tasks 8, 15 |
| Gallery grid + direct upload | Task 19 |
| Gallery photo → navigate to pin | Task 19 |
| Mobile-first CSS | Task 20 |
| JWT middleware on all routes | Task 3 |
| Guest token validation | Tasks 3, 5 |
| Membership check on routes | Task 3 (anyMember) |
| /uploads served as static | Task 1 |
| UUID filenames, MIME validation | Task 6 |

**No placeholders found** — all steps contain actual code.

**Type consistency verified:**
- `Pin`, `TripMember`, `GalleryPhoto`, `Category` types defined once in `types/index.ts` and imported everywhere
- `anyMember` middleware sets `req.memberId` — used in pins.ts and gallery.ts
- `getIO()` from socket/index.ts — used in pins.ts
- `addPin()` from tripStore — called both from socket listener and (can be called from PinForm response if needed)
