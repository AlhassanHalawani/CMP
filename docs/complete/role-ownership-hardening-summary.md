# Role Ownership Hardening Summary

**Date:** 2026-02-26

## Objective

Restrict `club_leader` permissions to only resources they own, while `admin` retains full global access. Ownership is defined exclusively by `clubs.leader_id`, not `events.created_by`.

---

## What Changed

### Backend

#### New file: `apps/backend/src/services/ownership.service.ts`

Reusable ownership helpers consumed by all affected controllers:

| Export | Description |
|--------|-------------|
| `isAdmin(user)` | Returns true if user.role === 'admin' |
| `leaderOwnsClub(userId, clubId)` | Queries `clubs.leader_id === userId` |
| `leaderOwnsEvent(userId, eventId)` | Joins events→clubs; checks `clubs.leader_id === userId` |
| `canManageClub(user, clubId)` | Admin bypass or `leaderOwnsClub` |
| `canManageEvent(user, eventId)` | Admin bypass or `leaderOwnsEvent` |

#### Modified: `apps/backend/src/controllers/clubs.controller.ts`

- `updateClub`: club_leader blocked if not the club's `leader_id` (403). club_leader also blocked from setting `leader_id` in the payload (admin-only).

#### Modified: `apps/backend/src/controllers/events.controller.ts`

- `createEvent`: club_leader must own the target `club_id` (403 otherwise).
- `updateEvent`: club_leader must own the existing event's club. If `club_id` changes, must also own the target club.
- `deleteEvent`: club_leader must own the event's club.

#### Modified: `apps/backend/src/controllers/attendance.controller.ts`

- `generateEventQr`: club_leader must own the event's club (403 otherwise).
- `manualCheckIn`: club_leader must own the event's club.
- `getAttendanceList`: club_leader must own the event's club.
- `getEventRegistrations`: club_leader must own the event's club.

#### Modified: `apps/backend/src/controllers/kpi.controller.ts`

- `recordMetric`: club_leader must own the `club_id` in the request body.

#### Modified: `apps/backend/src/controllers/achievements.controller.ts`

- `create`: club_leader must own the `club_id` in the request body.
- `remove`: loads achievement first, then checks ownership by `achievement.club_id`.

All ownership violations return `{ "error": "..." }` with status **403**.
Admin always bypasses ownership checks.

---

### Frontend

#### New file: `apps/frontend/src/hooks/useCurrentUser.ts`

Fetches the current user's full backend profile (`/api/users/me`) via TanStack Query. Used by pages to compare `club.leader_id` or `event club.leader_id` against the authenticated user's DB id.

#### Modified: `apps/frontend/src/pages/ClubDetailPage.tsx`

- Edit button is now shown only when `isAdmin || (club.leader_id === currentUser.id)`.
- Delete button remains admin-only (unchanged).

#### Modified: `apps/frontend/src/pages/EventsPage.tsx`

- Create button is shown for leaders only if they own at least one club.
- Event form's club list is filtered to owned clubs for leaders (admins see all).

#### Modified: `apps/frontend/src/pages/EventDetailPage.tsx`

- Edit/Delete/Manage-Attendance buttons shown only when `isAdmin || isEventOwner`.
- `isEventOwner` is computed by finding the event's club in the club list and comparing `club.leader_id === currentUser.id`.
- Edit form's club list is filtered to owned clubs for leaders.

#### Modified: `apps/frontend/src/pages/EventAttendancePage.tsx`

- Added ownership check: fetches the event's club and compares `club.leader_id === currentUser.id`.
- Leaders who do not own the event see an "unauthorized" state instead of the QR/manual check-in UI.

---

### Tests

#### Modified: `apps/backend/src/tests/setup.ts`

- Extended `createTestDb()` to include `kpi_metrics` and `achievements` tables.
- Added `seedOwnershipData(db)`: seeds 2 leaders, 2 clubs (each leader owns one), 3 events, registrations, KPI, achievement rows.
- Added `generateLeader2Token()`: JWT for the second test leader.

#### Modified: `apps/backend/src/tests/createTestApp.ts`

- Added `clubs`, `kpi`, and `achievements` routes to the test app (previously only `auth`, `events`, `attendance` were mounted).

#### New file: `apps/backend/src/tests/integration/ownership-authorization.test.ts`

45 new test cases covering:

| Area | Scenarios |
|------|-----------|
| Club update | Leader owns / doesn't own / tries to change leader_id |
| Event create | Leader owns club / doesn't own club |
| Event update | Leader owns event / doesn't own / cross-club move |
| Event delete | Leader owns / doesn't own |
| Attendance QR | Leader owns event / doesn't own / leader2 on leader1 event |
| Manual check-in | Leader owns / doesn't own |
| Attendance list | Leader owns / doesn't own |
| Registrations list | Leader owns / doesn't own |
| KPI record | Leader owns club / doesn't own / admin bypass |
| Achievement create | Leader owns club / doesn't own / admin bypass |
| Achievement delete | Leader owns / doesn't own / not found |
| Admin bypass | Admin can perform all restricted actions |

#### Existing test compatibility

`apps/backend/src/tests/integration/attendance.test.ts` — all existing tests still pass unchanged. The seed data sets club 1's `leader_id` to the test leader's user ID, so the existing "returns 200 for club_leader role" cases remain valid.

---

### Documentation

| File | Change |
|------|--------|
| `docs/complete/api.md` | Added ownership rules, new 403 cases for PATCH /clubs/:id, POST/PATCH/DELETE /events, all attendance endpoints, POST /kpi, POST/DELETE /achievements |
| `docs/complete/architecture.md` | New RBAC → Ownership section documenting ownership.service helpers and policy; updated key directories listing |
| `docs/complete/runbook.md` | New "Role Ownership — Operational Notes" section with SQL diagnosis commands and assignment procedure |
| `docs/complete/role-ownership-hardening-summary.md` | This file |

---

## Ownership Rules Implemented

| Resource | club_leader check |
|----------|------------------|
| `PATCH /clubs/:id` | `clubs.leader_id === req.user.id` |
| `PATCH /clubs/:id` with `leader_id` body field | Blocked (admin only) |
| `POST /events` | Target `club_id` → `clubs.leader_id === req.user.id` |
| `PATCH /events/:id` | Event's club → `clubs.leader_id === req.user.id` |
| `PATCH /events/:id` with new `club_id` | Target club also owned |
| `DELETE /events/:id` | Event's club → `clubs.leader_id === req.user.id` |
| `POST /attendance/:eventId/qr` | Event's club → `clubs.leader_id === req.user.id` |
| `POST /attendance/:eventId/manual` | Event's club → `clubs.leader_id === req.user.id` |
| `GET /attendance/:eventId` | Event's club → `clubs.leader_id === req.user.id` |
| `GET /attendance/:eventId/registrations` | Event's club → `clubs.leader_id === req.user.id` |
| `POST /kpi` | `club_id` body field → `clubs.leader_id === req.user.id` |
| `POST /achievements` | `club_id` body field → `clubs.leader_id === req.user.id` |
| `DELETE /achievements/:id` | Achievement's `club_id` → `clubs.leader_id === req.user.id` |

**Admin bypasses all of the above without restriction.**

---

## Validation Commands Run

```bash
npm run test --workspace=apps/backend
# Result: 5 test suites, 90 tests, 0 failures

npm run lint
# Result: 0 errors, 0 warnings (ESLint)
```

---

## Known Limitations / Follow-up Items

1. **Rate limiting is not distributed**: in-memory rate limiter is not shared across k3s replicas. Unrelated to this feature but noted for production.
2. **Frontend ownership check has a brief loading window**: `useCurrentUser` fetches asynchronously, so the edit button may briefly appear before the ownership query resolves. Mitigated by the backend 403 guardrail.
3. **No DB migration needed**: ownership uses existing `clubs.leader_id` column which was already present.
4. **`POST /attendance/check-in`** (self-service QR scan) has no ownership restriction — any registered user can check themselves in. This is intentional.
5. **Club create and delete remain admin-only**: leaders cannot create or delete clubs. Only update is available to them (with ownership enforcement).
6. **Leader assigned to multiple clubs**: a leader can be `leader_id` of more than one club. Ownership checks handle this correctly (any owned club passes).
