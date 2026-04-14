# FR-005 — Club Registration & Membership

**Priority:** High
**Status:** Fully Missing (no memberships table, no join/leave flow)
**Depends on:** FR-008 (notification triggers) for membership approval notifications

---

## Context

The system currently has no club membership concept. There is an `events.registrations` table but that is for event sign-ups, not club affiliation. This FR requires students to request membership, club managers to approve/decline, and the system to track `Pending → Active → Inactive` lifecycle with optional member-only event enforcement.

---

## Neo Components to Copy

Copy the following from `/workspaces/CMP/neo/src/components/ui/` into `apps/frontend/src/components/ui/`:

| Neo file | Purpose in this FR |
|---|---|
| `badge.tsx` | Membership status badge (Pending / Active / Inactive) |
| `table.tsx` | Members list table on club manager dashboard |
| `alert-dialog.tsx` | Confirm join / leave / approve / decline actions |
| `tabs.tsx` | Add a "Members" tab to ClubDetailPage |
| `avatar.tsx` | Student avatar in members list |
| `button.tsx` | Join / Leave / Approve / Decline buttons |

> **Adaptation note:** Neo components use Next.js (`next/link`, `next/navigation`). Replace with `react-router-dom` equivalents when copying into CMP frontend.

---

## Step 1 — Database Migration

**Create file:** `apps/backend/migrations/012_create_memberships.sql`

```sql
CREATE TABLE memberships (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id      INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','inactive')),
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(club_id, user_id)
);

CREATE INDEX idx_memberships_club   ON memberships(club_id);
CREATE INDEX idx_memberships_user   ON memberships(user_id);
CREATE INDEX idx_memberships_status ON memberships(status);
```

Also add a flag for member-only events:

```sql
ALTER TABLE events ADD COLUMN members_only INTEGER NOT NULL DEFAULT 0;
```

---

## Step 2 — Backend: Membership Model

**Create file:** `apps/backend/src/models/membership.model.ts`

Implement these methods using `better-sqlite3`:

```ts
// Finds existing membership for a user in a club
findByClubAndUser(clubId: number, userId: number): Membership | undefined

// List all memberships for a club (optionally filtered by status)
findByClub(clubId: number, status?: string): Membership[]

// List all memberships for a user
findByUser(userId: number): Membership[]

// Create a new pending membership request
create(clubId: number, userId: number): Membership

// Update membership status (active | inactive | pending)
updateStatus(id: number, status: string): Membership

// Count active members for a club
countActive(clubId: number): number
```

---

## Step 3 — Backend: Membership Controller

**Create file:** `apps/backend/src/controllers/membership.controller.ts`

### `joinClub`
```
POST /api/clubs/:id/join
Auth: student role
```
- Load club. Return 404 if not found.
- Check if membership already exists for this user + club.
  - If `active`: return 409 "Already a member".
  - If `pending`: return 409 "Membership request already pending".
  - If `inactive`: update status back to `pending` (re-request).
- Otherwise create a new `pending` membership.
- Fire notification to club leader: "New membership request from <student name>".
- Return created membership (201).

### `leaveClub`
```
DELETE /api/clubs/:id/membership
Auth: authenticated (any role)
```
- Find active or pending membership for current user.
- Return 404 if not found.
- Update status to `inactive`.
- Return 204.

### `listMembers`
```
GET /api/clubs/:id/members?status=active|pending|inactive
Auth: admin or club_leader (must own the club)
```
- Validate ownership.
- Return memberships joined with user info (name, email, avatar_url).
- Support `?status` filter.

### `updateMembership`
```
PATCH /api/clubs/:id/members/:userId
Auth: admin or club_leader (must own the club)
Body: { status: 'active' | 'inactive' }
```
- Load membership. Return 404 if not found.
- Update status.
- If approving (`active`): fire notification to student "Your membership to <club> was approved."
- If declining (`inactive`): fire notification to student "Your membership request to <club> was declined."
- Log audit action.
- Return updated membership.

### `getMembership`
```
GET /api/clubs/:id/membership/me
Auth: authenticated
```
- Returns current user's membership record for the club (or null).
- Used by frontend to show correct join/leave button state.

---

## Step 4 — Backend: Update Events Controller (member-only enforcement)

**File:** `apps/backend/src/controllers/events.controller.ts`

In `registerForEvent`:
- After loading event, check `event.members_only`.
- If `true`, verify that the current user has an `active` membership in `event.club_id`.
- Return 403 "This event is open to club members only." if not a member.

---

## Step 5 — Backend: Routes

**File:** `apps/backend/src/routes/clubs.routes.ts`

Add membership sub-routes:
```
POST   /:id/join              → authenticate, joinClub
DELETE /:id/membership        → authenticate, leaveClub
GET    /:id/members           → authenticate, requireRole('admin','club_leader'), listMembers
PATCH  /:id/members/:userId   → authenticate, requireRole('admin','club_leader'), updateMembership
GET    /:id/membership/me     → authenticate, getMembership
```

---

## Step 6 — Frontend: API Client

**Create file:** `apps/frontend/src/api/memberships.ts`

```ts
export const joinClub      = (clubId: number) => client.post(`/clubs/${clubId}/join`);
export const leaveClub     = (clubId: number) => client.delete(`/clubs/${clubId}/membership`);
export const getMyMembership = (clubId: number) => client.get(`/clubs/${clubId}/membership/me`);
export const listMembers   = (clubId: number, status?: string) =>
  client.get(`/clubs/${clubId}/members`, { params: { status } });
export const updateMembership = (clubId: number, userId: number, status: string) =>
  client.patch(`/clubs/${clubId}/members/${userId}`, { status });
```

---

## Step 7 — Frontend: ClubDetailPage

**File:** `apps/frontend/src/pages/ClubDetailPage.tsx`

### Join / Leave button
- Fetch `getMyMembership(clubId)` on page load.
- If no membership: show **"Join Club"** button → calls `joinClub()` on confirm (AlertDialog).
- If `pending`: show disabled **"Request Pending"** badge.
- If `active`: show **"Leave Club"** button → calls `leaveClub()` on confirm.

### Members tab (club leader / admin only)
Add a "Members" tab using the neo `Tabs` component alongside the existing Events tab.

Inside the Members tab:
- Show a neo `Table` with columns: Avatar, Name, Email, Status, Requested At, Actions.
- Status shown as neo `Badge` (Pending=yellow, Active=green, Inactive=gray).
- Actions column: **Approve** / **Decline** buttons (shown for pending rows).
- Clicking Approve/Decline calls `updateMembership()` then refreshes query.

### Members-only badge on events
- If `event.members_only === true`, show a "Members Only" badge on event cards in the club events list.

---

## Step 8 — Frontend: EventFormDialog (optional)

**File:** `apps/frontend/src/components/EventFormDialog.tsx` (or wherever the event creation form lives)

- Add a "Members Only" toggle (neo `Switch`) for club leaders when creating/editing an event.
- Bind to `members_only` field in form payload.

---

## Acceptance Criteria Checklist

- [ ] Student can request membership (status = pending)
- [ ] Club manager can approve (→ active) or decline (→ inactive) with notifications
- [ ] Student can leave club (→ inactive)
- [ ] Status updates appear immediately in the UI
- [ ] Active members can register for member-only events; others are blocked
- [ ] Club manager sees full member list with status filters
- [ ] Audit log captures all membership status changes

---

## Files Summary

| Action | File |
|---|---|
| Create | `apps/backend/migrations/012_create_memberships.sql` |
| Create | `apps/backend/src/models/membership.model.ts` |
| Create | `apps/backend/src/controllers/membership.controller.ts` |
| Create | `apps/frontend/src/api/memberships.ts` |
| Modify | `apps/backend/src/routes/clubs.routes.ts` |
| Modify | `apps/backend/src/controllers/events.controller.ts` |
| Modify | `apps/frontend/src/pages/ClubDetailPage.tsx` |
| Copy from neo | `badge.tsx`, `table.tsx`, `alert-dialog.tsx`, `tabs.tsx`, `avatar.tsx`, `button.tsx` |
