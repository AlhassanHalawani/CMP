# FR-009 — Club Profile Management

**Priority:** Medium
**Status:** Partial (CRUD exists; missing logo upload, verified stats, and recent-events showcase)

---

## Context

Club CRUD with bilingual name/description, `logo_url`, and `leader_id` all work. The club detail page shows basic info and events. Missing: actual image upload (currently URL only), computed verified stats (total events, attendance, achievements, member count), and a dedicated "showcase" section for highlighted recent events.

---

## Neo Components to Copy

Copy the following from `/workspaces/CMP/neo/src/components/ui/` into `apps/frontend/src/components/ui/`:

| Neo file | Purpose in this FR |
|---|---|
| `card.tsx` | Stats cards (events, attendance, achievements) |
| `avatar.tsx` | Club logo display with fallback initials |
| `badge.tsx` | Verified badge and member count badge |
| `progress.tsx` | Stat bars (e.g. attendance rate) |
| `image-card.tsx` | Featured/showcase event cards (neobrutalism style) |
| `button.tsx` | "Upload Logo" button |

> **Adaptation note:** Neo components use Next.js (`next/link`). Replace with `react-router-dom` equivalents.

---

## Step 1 — Backend: Club Stats Endpoint

**File:** `apps/backend/src/controllers/clubs.controller.ts`

Add `getClubStats`:
```
GET /api/clubs/:id/stats
Auth: none (public)
```

SQL aggregations:
```sql
-- Published event count
SELECT COUNT(*) FROM events WHERE club_id = ? AND status = 'published';

-- Total attendance across published events
SELECT COUNT(a.id)
FROM attendance a
JOIN events e ON e.id = a.event_id
WHERE e.club_id = ? AND e.status = 'published';

-- Achievement count
SELECT COUNT(*) FROM achievements WHERE club_id = ?;

-- Active member count (if FR-005 memberships table exists)
SELECT COUNT(*) FROM memberships WHERE club_id = ? AND status = 'active';
```

Return:
```json
{
  "published_events": 12,
  "total_attendance": 340,
  "achievements_awarded": 8,
  "active_members": 45
}
```

---

## Step 2 — Backend: Logo Upload Endpoint

**File:** `apps/backend/src/controllers/clubs.controller.ts`

Add `uploadLogo`:
```
POST /api/clubs/:id/logo
Auth: admin or club_leader (must own club)
Content-Type: multipart/form-data
Field: logo (image file)
```

Use `multer` for file handling (add to backend dependencies: `npm install multer @types/multer --workspace=apps/backend`).

```ts
import multer from 'multer';

const storage = multer.diskStorage({
  destination: './data/uploads/logos/',
  filename: (req, file, cb) => cb(null, `club-${req.params.id}-${Date.now()}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg','image/png','image/webp'].includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
    cb(null, true);
  }
});
```

After upload, update `clubs.logo_url` to the served path (e.g., `/uploads/logos/club-1-xxx.jpg`).

**Serve uploaded files:** Add static file middleware in `apps/backend/src/app.ts`:
```ts
app.use('/uploads', express.static('./data/uploads'));
```

---

## Step 3 — Backend: Routes Update

**File:** `apps/backend/src/routes/clubs.routes.ts`

Add:
```
GET  /:id/stats  → getClubStats       (no auth)
POST /:id/logo   → authenticate, requireRole('admin','club_leader'), upload.single('logo'), uploadLogo
```

---

## Step 4 — Backend: Recent Events for Showcase

No new endpoint needed. Reuse:
```
GET /api/events?club_id=X&status=published&limit=3
```

Sort by `starts_at DESC` (most recently held). Already supported by existing `EventModel.list()`.

---

## Step 5 — Frontend: API Client

**File:** `apps/frontend/src/api/clubs.ts`

Add:
```ts
export const getStats = (clubId: number) =>
  client.get(`/clubs/${clubId}/stats`);

export const uploadLogo = (clubId: number, file: File) => {
  const fd = new FormData();
  fd.append('logo', file);
  return client.post(`/clubs/${clubId}/logo`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
```

---

## Step 6 — Frontend: ClubDetailPage Overhaul

**File:** `apps/frontend/src/pages/ClubDetailPage.tsx`

### Club header section
Replace the plain logo URL `<img>` with neo `Avatar`:
- If `logo_url` is set, display the image.
- Otherwise show club name initials as fallback (neo Avatar fallback feature).
- For club leader / admin: add a camera icon or "Change Logo" button next to the avatar.
  - On click, open a hidden `<input type="file" accept="image/*">`.
  - On file select, call `uploadLogo(clubId, file)` and refresh club data.

### Verified stats section
Add a stats row (4 neo `Card` components) below the club header:

```
| Published Events | Total Attendance | Achievements | Active Members |
|       12         |       340        |      8       |      45        |
```

Fetch from `GET /api/clubs/:id/stats` using `useQuery`.

### Recent Events showcase
Add a "Recent Events" section using neo `image-card.tsx` (the custom neobrutalism card with image support).

Query: `GET /api/events?club_id=:id&status=published&limit=3` sorted by `starts_at DESC`.

Display the 3 most recent published events as image cards. If no `image_url` exists on events (it doesn't currently), use a placeholder or the club logo.

### Membership tab (if FR-005 is implemented)
See FR-005 plan for the Members tab.

---

## Acceptance Criteria Checklist

- [ ] Only the club manager (or admin) can modify the club profile
- [ ] Logo upload accepts JPEG/PNG/WebP up to 2MB, stored on server, URL saved in DB
- [ ] Club logo displayed via Avatar with name initials as fallback
- [ ] Stats section shows: published events, total attendance, achievements, active members
- [ ] Stats reflect only verified (published) events and activities
- [ ] Recent events showcase shows up to 3 latest published events
- [ ] Public view updates immediately after save

---

## Files Summary

| Action | File |
|---|---|
| Modify | `apps/backend/src/controllers/clubs.controller.ts` |
| Modify | `apps/backend/src/routes/clubs.routes.ts` |
| Modify | `apps/backend/src/app.ts` |
| Modify | `apps/frontend/src/api/clubs.ts` |
| Modify | `apps/frontend/src/pages/ClubDetailPage.tsx` |
| Copy from neo | `card.tsx`, `avatar.tsx`, `badge.tsx`, `progress.tsx`, `image-card.tsx`, `button.tsx` |
