# Design Spec — Feedback System
**Date:** 2026-04-23
**Project:** Nomio (travel-memory-map)
**Branch:** feature/mvp-build

---

## Overview

Add a floating feedback button accessible on all app pages. Users (authenticated or guest) can submit typed feedback with optional screenshot. Feedbacks persist in PostgreSQL. A protected admin inbox at `/admin/feedbacks` allows reading, filtering, and managing submissions.

---

## Architecture

```
[FeedbackWidget — rendered in app/layout.tsx]
  └── FeedbackButton (fixed bottom-right)
        → FeedbackModal (form)
              → POST /feedback (open endpoint)
                    → Feedback model (PostgreSQL)
                          ← GET /admin/feedbacks (admin only)
                          ← PATCH /admin/feedbacks/:id (admin only)
                          ← DELETE /admin/feedbacks/:id (admin only)
                    → R2 (optional screenshot upload)

[Admin area — /admin/*]
  └── /admin/login → POST /admin/login → admin JWT
  └── /admin/feedbacks → inbox UI (list + detail panel)
```

---

## DB Schema

### New table: `feedbacks`

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `id` | UUID | NO | PK, UUIDV4 |
| `type` | ENUM | NO | `'bug' \| 'feature' \| 'ui' \| 'other'` |
| `title` | STRING | NO | Required |
| `message` | TEXT | NO | Required |
| `email` | STRING | YES | Optional, pre-filled if logged in |
| `screenshot_url` | STRING | YES | R2 public URL |
| `screenshot_key` | STRING | YES | R2 object key for deletion |
| `status` | ENUM | NO | `'new' \| 'read' \| 'archived'`, default `'new'` |
| `user_id` | UUID | YES | FK → users, null for guests |
| `page` | STRING | YES | `window.location.pathname` at time of submission |
| `trip_id` | UUID | YES | Parsed from URL if on a trip page |
| `app_version` | STRING | NO | Hardcoded `'V1 beta'` |
| `created_at` | DATE | NO | Auto, DataTypes.NOW |

### Modified table: `users`

Add `is_admin: BOOLEAN`, default `false`, `allowNull: false`.

---

## Backend

### New files

#### `server/src/models/Feedback.ts`
Sequelize model for the `feedbacks` table. Belongs to `User` (nullable).

#### `server/src/routes/feedback.ts`
- `POST /feedback` — open (no auth required)
  - Accepts multipart/form-data — uses its own multer instance (memoryStorage, 5 MB limit, jpeg/png only), separate from the photo upload middleware
  - If screenshot present: process with sharp (resize to max 1920px, WebP q82) → upload to R2 at `feedbacks/<uuid>.webp`
  - Creates `Feedback` row
  - Returns `{ id }` with 201
  - Validation: type (enum), title (non-empty), message (non-empty)
  - On R2 success + DB failure: deleteFromR2 rollback

#### `server/src/routes/admin.ts`
- `POST /admin/login`
  - Validates email + password (bcrypt)
  - Checks `user.is_admin === true`
  - Returns JWT with `{ userId, isAdmin: true }` payload
  - 403 if not admin, 401 if wrong credentials
- `GET /admin/feedbacks` — `requireAdmin`
  - Query params: `status`, `type`, `search` (searches title + message)
  - Returns feedbacks ordered by `created_at DESC`, includes `user.display_name`
- `PATCH /admin/feedbacks/:id` — `requireAdmin`
  - Body: `{ status: 'new' | 'read' | 'archived' }`
  - Returns updated feedback
- `DELETE /admin/feedbacks/:id` — `requireAdmin`
  - Deletes R2 screenshot if `screenshot_key` present (failure logged, not thrown)
  - Destroys DB row
  - Returns `{ id }`

#### `server/src/middleware/requireAdmin.ts`
- Verifies JWT
- Checks `payload.isAdmin === true`
- Returns 403 if not admin

### Modified files

#### `server/src/models/User.ts`
Add `is_admin: DataTypes.BOOLEAN`, `defaultValue: false`, `allowNull: false`.

#### `server/src/index.ts`
Register `feedback` and `admin` routes.

#### `server/.env.example`
No new vars needed — R2 already configured.

### Robustness rules
- multer rejects screenshots > 5 MB before processing
- MIME filter: jpeg, png only (no WebP input needed for screenshots)
- R2 rollback if DB write fails after screenshot upload
- If `deleteFromR2` fails during admin delete: log, continue DB deletion
- Invalid enum values → 400

---

## Frontend

### New files

#### `components/Feedback/FeedbackButton.tsx`
Fixed bottom-right button. Label: "Feedback". Opens `FeedbackModal`. Hidden while modal is open.

#### `components/Feedback/FeedbackButton.module.scss`
Fixed positioning, z-index above map/gallery overlays.

#### `components/Feedback/FeedbackModal.tsx`
Modal overlay.

**Fields:**
- Type: pill button group — Bug / Feature / UX / Other (maps to `'bug' | 'feature' | 'ui' | 'other'`)
- Title: text input, required
- Message: textarea, required, min 10 chars
- Email: text input, optional — pre-filled from `useAuthStore().user?.email` if logged in
- Screenshot: file input, optional, accept jpeg/png, max 5 MB client-side check

**Auto-captured (not shown to user):**
- `page`: `window.location.pathname`
- `trip_id`: extracted from pathname `/trip/[id]/...` if present, else null
- `user_id`: from auth store if logged in, else null
- `app_version`: `'V1 beta'`

**States:**
- `idle` → form visible
- `loading` → submit button disabled, "Sending..."
- `success` → "Thanks for your feedback! We read everything." — auto-close after 3s
- `error` → human error message below form

**Error messages:**
- 400 → "Please fill in all required fields."
- 413 → "Screenshot is too large (max 5 MB)."
- Generic → "Something went wrong. Please try again."

#### `components/Feedback/FeedbackModal.module.scss`
Modal overlay, form layout, pill type buttons, file input styling.

#### `app/admin/login/page.tsx`
Simple email + password form. Calls `POST /admin/login`. On success: stores token in localStorage as `admin_token`, redirects to `/admin/feedbacks`.

#### `app/admin/login/page.module.scss`

#### `app/admin/feedbacks/page.tsx`
Inbox layout — two-column desktop-first.

**Left column (list):**
- Each item: type badge, title (truncated), date, status indicator (blue dot = new)
- Click → loads detail in right panel + auto-marks as read (PATCH status: 'read')

**Right panel (detail):**
- Type badge, title, date formatted (`Apr 23, 2026 14:32`)
- Author: `user.display_name` or "Guest"
- Email: shown if present, clickable mailto
- Context: page path, trip_id if present
- Message: full text
- Screenshot: shown as image if present
- Actions: **Mark read** / **Archive** / **Delete** (with inline confirmation)

**Top bar:**
- Filter tabs: All / New / Read / Archived
- Type filter dropdown: All types / Bug / Feature / UX / Other
- Search input (debounced 300ms)
- Unread count badge next to "Feedbacks" heading

**Auth guard:** on mount, reads `admin_token` from localStorage → if missing or JWT expired → redirect to `/admin/login`

#### `app/admin/feedbacks/page.module.scss`

#### `store/adminStore.ts`
Zustand store:
```ts
{
  token: string | null
  setToken(t: string): void
  logout(): void  // clears localStorage + resets token
}
```

#### `lib/adminApi.ts`
Axios instance with baseURL pointing to `/api` (same as main `api.ts`), interceptor attaches `Authorization: Bearer <admin_token>` from adminStore.

### Modified files

#### `app/layout.tsx`
Import and render `<FeedbackWidget />` inside `<body>`.

---

## Admin Security

- Admin JWT is issued only when `user.is_admin === true` in DB
- `requireAdmin` middleware verifies JWT signature + `isAdmin` claim on every admin API call
- Frontend auth guard is UX only — the real protection is the backend middleware
- To promote a user to admin: `UPDATE users SET is_admin = true WHERE email = 'loic@...';` in psql

---

## Files Summary

### New files
- `components/Feedback/FeedbackWidget.tsx` — thin wrapper: holds open/close state, renders FeedbackButton + FeedbackModal
- `server/src/models/Feedback.ts`
- `server/src/routes/feedback.ts`
- `server/src/routes/admin.ts`
- `server/src/middleware/requireAdmin.ts`
- `components/Feedback/FeedbackButton.tsx`
- `components/Feedback/FeedbackButton.module.scss`
- `components/Feedback/FeedbackModal.tsx`
- `components/Feedback/FeedbackModal.module.scss`
- `app/admin/login/page.tsx`
- `app/admin/login/page.module.scss`
- `app/admin/feedbacks/page.tsx`
- `app/admin/feedbacks/page.module.scss`
- `store/adminStore.ts`
- `lib/adminApi.ts`

### Modified files
- `server/src/models/User.ts`
- `server/src/app.ts` (or equivalent router entry)
- `app/layout.tsx`

---

## Manual Test Checklist

1. Submit feedback as logged-in user — appears in admin inbox with user name
2. Submit feedback as guest — appears with "Guest", no user_id
3. Submit with screenshot — image appears in admin detail, R2 key stored
4. Submit with file > 5 MB — rejected with correct error message
5. Submit with missing required fields — validation error shown
6. Admin login with non-admin account — 403 returned, stays on login page
7. Admin login with correct admin account — redirected to inbox
8. Admin inbox: click feedback → auto-marks as read, blue dot disappears
9. Admin inbox: filter by status, type, search — results update correctly
10. Admin: archive a feedback — disappears from "New" filter
11. Admin: delete a feedback with screenshot — R2 file removed, row gone
12. Direct access to `/admin/feedbacks` without token → redirect to `/admin/login`
13. FeedbackWidget visible on `/`, `/trip/[id]`, `/trip/[id]/gallery`, `/join/[code]`
