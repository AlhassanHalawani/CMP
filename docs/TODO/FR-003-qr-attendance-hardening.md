# FR-003 — QR Code Attendance Tracking (Hardening)

**Priority:** High
**Status:** Partial (core check-in works; missing check-in window control and session finalization)

---

## Context

QR generation, token validation, duplicate prevention, and capacity-at-registration all work. Missing pieces:

1. Club managers need explicit open/close control over the check-in window per event — currently QR tokens are valid for the entire lifetime of a `published` event.
2. There is no finalization step to lock a completed session.
3. Capacity is not re-validated at check-in time.

---

## Neo Components to Copy

Copy the following from `/workspaces/CMP/neo/src/components/ui/` into `apps/frontend/src/components/ui/`:

| Neo file | Purpose in this FR |
|---|---|
| `switch.tsx` | Check-in window open/close toggle |
| `badge.tsx` | Session state badge (Open / Closed / Finalized) |
| `alert.tsx` | Warning when check-in is closed |
| `button.tsx` | Open / Close / Finalize buttons |

> **Adaptation note:** Neo components use Next.js (`next/link`). Replace with `react-router-dom` equivalents.

---

## Step 1 — Database Migration

**Create file:** `apps/backend/migrations/015_events_checkin_window.sql`

```sql
ALTER TABLE events ADD COLUMN checkin_open    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN checkin_finalized INTEGER NOT NULL DEFAULT 0;
```

- `checkin_open = 1` → currently accepting QR scans
- `checkin_finalized = 1` → session permanently closed (no more scans or manual check-ins)

---

## Step 2 — Backend: Attendance Controller

**File:** `apps/backend/src/controllers/attendance.controller.ts`

### 2a — `openCheckin`
```
POST /api/attendance/:eventId/open
Auth: admin or club_leader (must own event)
```
- Load event. Return 404 if not found.
- Check ownership.
- Validate: event must be `published` and `checkin_finalized = 0`.
- Set `checkin_open = 1`.
- Return updated event.

### 2b — `closeCheckin`
```
POST /api/attendance/:eventId/close
Auth: admin or club_leader (must own event)
```
- Load event. Return 404 if not found.
- Check ownership.
- Set `checkin_open = 0`.
- Return updated event.

### 2c — `finalizeCheckin`
```
POST /api/attendance/:eventId/finalize
Auth: admin or club_leader (must own event)
```
- Load event. Return 404 if not found.
- Check ownership.
- Set `checkin_open = 0`, `checkin_finalized = 1`.
- Log audit action `finalize_attendance`.
- Return updated event.

### 2d — Update `checkIn` (QR scan validation)
Add two new guards before recording attendance:

```ts
if (!event.checkin_open) {
  res.status(400).json({ error: 'Check-in window is not open for this event' });
  return;
}
if (event.checkin_finalized) {
  res.status(400).json({ error: 'Attendance for this event has been finalized' });
  return;
}
```

### 2e — Update `manualCheckIn` (same guards)
Add the same two guards to `manualCheckIn`.

### 2f — Capacity check at check-in
Add capacity re-validation in `checkIn`:
```ts
if (event.capacity) {
  const attended = AttendanceModel.countByEvent(parsed.eventId);
  if (attended >= event.capacity) {
    res.status(400).json({ error: 'Event has reached capacity' });
    return;
  }
}
```

---

## Step 3 — Backend: Event Model

**File:** `apps/backend/src/models/event.model.ts`

`findById` already returns all columns — ensure the two new columns are included in the returned type:
```ts
checkin_open: number;       // 0 | 1
checkin_finalized: number;  // 0 | 1
```

Add a dedicated update method for checkin state (or reuse existing `update()`).

---

## Step 4 — Backend: Routes

**File:** `apps/backend/src/routes/attendance.routes.ts`

Add:
```
POST /:eventId/open      → authenticate, requireRole('admin','club_leader'), openCheckin
POST /:eventId/close     → authenticate, requireRole('admin','club_leader'), closeCheckin
POST /:eventId/finalize  → authenticate, requireRole('admin','club_leader'), finalizeCheckin
```

---

## Step 5 — Frontend: EventAttendancePage

**File:** `apps/frontend/src/pages/EventAttendancePage.tsx`

### Session state badge
At the top of the attendance section, show a neo `Badge`:
- `checkin_finalized = 1` → "Finalized" (gray)
- `checkin_open = 1` → "Check-in Open" (green)
- default → "Check-in Closed" (red)

### Open / Close toggle
For club_leader and admin:
- Show a neo `Switch` labeled "Check-in Window"
- When toggled ON → call `openCheckin(eventId)`
- When toggled OFF → call `closeCheckin(eventId)`
- Disable when `checkin_finalized = 1`

### Finalize button
Show a **"Finalize Session"** button (neo `Button`, destructive variant).
- Show `AlertDialog` to confirm: "This will permanently lock attendance. Cannot be undone."
- On confirm, call `finalizeCheckin(eventId)`.
- After finalization, disable all attendance actions.

### Closed session warning
If student tries to scan a QR for a closed session, the API returns an error. The frontend already shows API errors — make sure the error message is displayed in a neo `Alert` component.

---

## Step 6 — Frontend: API Client

**File:** `apps/frontend/src/api/attendance.ts`

Add:
```ts
export const openCheckin     = (eventId: number) => client.post(`/attendance/${eventId}/open`);
export const closeCheckin    = (eventId: number) => client.post(`/attendance/${eventId}/close`);
export const finalizeCheckin = (eventId: number) => client.post(`/attendance/${eventId}/finalize`);
```

---

## Acceptance Criteria Checklist

- [ ] QR scan is rejected when `checkin_open = 0`
- [ ] QR scan is rejected when `checkin_finalized = 1`
- [ ] Manual check-in is also blocked when window is closed or finalized
- [ ] Club manager can open and close the check-in window
- [ ] Finalizing permanently locks the session
- [ ] Capacity is enforced at check-in time (not only at registration)
- [ ] Session state badge shows correct status on EventAttendancePage
- [ ] Finalize action requires confirmation dialog

---

## Files Summary

| Action | File |
|---|---|
| Create | `apps/backend/migrations/015_events_checkin_window.sql` |
| Modify | `apps/backend/src/controllers/attendance.controller.ts` |
| Modify | `apps/backend/src/models/event.model.ts` |
| Modify | `apps/backend/src/routes/attendance.routes.ts` |
| Modify | `apps/frontend/src/pages/EventAttendancePage.tsx` |
| Modify | `apps/frontend/src/api/attendance.ts` |
| Copy from neo | `switch.tsx`, `badge.tsx`, `alert.tsx`, `button.tsx`, `alert-dialog.tsx` |
