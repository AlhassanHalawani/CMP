# FR-002 — Event Approval Workflow

**Priority:** High
**Status:** Missing
**Depends on:** FR-008 (notification triggers) for approval/rejection notifications

---

## Context

Currently events have statuses `draft | published | cancelled | completed`. Club leaders can freely set any status via `PATCH /api/events/:id`, bypassing any approval gate. The FR requires a formal multi-step workflow: **Draft → Submitted → Approved (published) / Rejected**.

---

## Neo Components to Copy

Copy the following from `/workspaces/CMP/neo/src/components/ui/` into `apps/frontend/src/components/ui/`:

| Neo file | Purpose in this FR |
|---|---|
| `badge.tsx` | Event status badge (Draft / Submitted / Approved / Rejected) |
| `alert.tsx` | Show rejection notes inline on rejected event |
| `textarea.tsx` | Rejection notes input for admin |
| `alert-dialog.tsx` | Confirm before submitting or approving |
| `dialog.tsx` | Reject dialog (admin enters notes) |

> **Adaptation note:** Neo components use Next.js (`next/link`, `next/navigation`). Replace those imports with `react-router-dom` equivalents when copying into CMP frontend.

---

## Step 1 — Database Migration

**Create file:** `apps/backend/migrations/011_event_approval_workflow.sql`

```sql
-- Add 'submitted' and 'rejected' to event status
-- SQLite does not support ALTER COLUMN, so we recreate the check constraint
-- by adding the new columns needed for the workflow.

ALTER TABLE events ADD COLUMN rejection_notes TEXT;
```

> SQLite stores status as TEXT with no enforced enum, so adding the two new status values (`submitted`, `rejected`) is purely a backend validation concern — no schema change needed for the enum itself. The `rejection_notes` column is new.

---

## Step 2 — Backend: Event Model

**File:** `apps/backend/src/models/event.model.ts`

Add a new valid status union to the type (if typed):
- Change status type to: `'draft' | 'submitted' | 'published' | 'rejected' | 'cancelled' | 'completed'`

No new model methods needed — existing `update()` handles status changes.

---

## Step 3 — Backend: Events Controller

**File:** `apps/backend/src/controllers/events.controller.ts`

### 3a — Restrict `createEvent`
- Club leaders must always create events with `status: 'draft'` — strip any `status` from request body if the actor is a `club_leader`.

### 3b — Restrict `updateEvent`
- Club leaders may NOT change status directly to `published` or `submitted` through the generic PATCH. Strip status changes from `req.body` for club leaders (they use the dedicated submit endpoint).

### 3c — Add `submitEvent`
```
POST /api/events/:id/submit
Auth: club_leader (must own event's club)
```
- Load event. Reject if status !== `'draft'` or `'rejected'`.
- Update status to `'submitted'`.
- Log audit action `submit_event`.
- Fire notification to all admin users: "New event pending approval: <title>".
- Return updated event.

### 3d — Add `approveEvent`
```
POST /api/events/:id/approve
Auth: admin only
```
- Load event. Reject if status !== `'submitted'`.
- Update status to `'published'`, clear `rejection_notes`.
- Log audit action `approve_event`.
- Fire notification to club leader: "Your event '<title>' has been approved."
- Return updated event.

### 3e — Add `rejectEvent`
```
POST /api/events/:id/reject
Auth: admin only
Body: { notes: string }
```
- Validate `notes` is non-empty.
- Load event. Reject if status !== `'submitted'`.
- Update status to `'rejected'`, set `rejection_notes = notes`.
- Log audit action `reject_event`.
- Fire notification to club leader: "Your event '<title>' was rejected."
- Return updated event.

### 3f — Enforce student visibility in `listEvents`
- If the caller has role `student` (or is unauthenticated), force `status = 'published'` filter regardless of query params.

---

## Step 4 — Backend: Routes

**File:** `apps/backend/src/routes/events.routes.ts`

Add three new routes:
```
POST /:id/submit    → authenticate, requireRole('club_leader'), submitEvent
POST /:id/approve   → authenticate, requireRole('admin'), approveEvent
POST /:id/reject    → authenticate, requireRole('admin'), rejectEvent
```

---

## Step 5 — Frontend: API Client

**File:** `apps/frontend/src/api/events.ts`

Add:
```ts
export const submitEvent = (id: number) =>
  client.post(`/events/${id}/submit`);

export const approveEvent = (id: number) =>
  client.post(`/events/${id}/approve`);

export const rejectEvent = (id: number, notes: string) =>
  client.post(`/events/${id}/reject`, { notes });
```

---

## Step 6 — Frontend: EventDetailPage

**File:** `apps/frontend/src/pages/EventDetailPage.tsx`

### Status badge
Use the neo `Badge` component. Map statuses to colors:
- `draft` → neutral/gray
- `submitted` → blue/warning
- `published` → green
- `rejected` → red/destructive
- `cancelled` / `completed` → gray

### Club Leader actions
- If event status is `draft` or `rejected`: show **"Submit for Review"** button.
- On click: show `AlertDialog` (neo) to confirm, then call `submitEvent()`.
- If rejected: show the `rejection_notes` in a red `Alert` (neo) above the action buttons.

### Admin actions
- If event status is `submitted`:
  - Show **"Approve"** button → calls `approveEvent()`.
  - Show **"Reject"** button → opens a `Dialog` (neo) with a `Textarea` for rejection notes, confirms, then calls `rejectEvent(notes)`.

### Invalidate query
After any action, call `queryClient.invalidateQueries(['event', id])` to refresh the page.

---

## Step 7 — Frontend: EventsPage (admin view)

**File:** `apps/frontend/src/pages/EventsPage.tsx`

- Add a **"Pending Approval"** tab that filters events with `status=submitted` (visible to admin only).
- Show submitted events with the blue "Submitted" badge.

---

## Acceptance Criteria Checklist

- [ ] Club leader submitting a draft event changes status to `submitted`
- [ ] Club leader cannot directly publish an event
- [ ] Admin can approve (→ published) or reject (→ rejected) submitted events
- [ ] Rejection notes are stored and shown to the club leader
- [ ] Students and unauthenticated users only see published events
- [ ] All state transitions are recorded in audit_logs
- [ ] Notifications fire on submit, approve, and reject

---

## Files Summary

| Action | File |
|---|---|
| Create | `apps/backend/migrations/011_event_approval_workflow.sql` |
| Modify | `apps/backend/src/models/event.model.ts` |
| Modify | `apps/backend/src/controllers/events.controller.ts` |
| Modify | `apps/backend/src/routes/events.routes.ts` |
| Modify | `apps/frontend/src/api/events.ts` |
| Modify | `apps/frontend/src/pages/EventDetailPage.tsx` |
| Modify | `apps/frontend/src/pages/EventsPage.tsx` |
| Copy from neo | `badge.tsx`, `alert.tsx`, `textarea.tsx`, `alert-dialog.tsx`, `dialog.tsx` |
