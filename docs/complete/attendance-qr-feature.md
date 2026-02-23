# Attendance QR Feature

## Overview

The Attendance QR system enables event check-in via QR codes and manual entry. Club leaders (supervisor-equivalent) and admins manage attendance; students scan QR codes or enter tokens to check in.

## Role Matrix

| Action                | student | club_leader | admin |
|-----------------------|---------|-------------|-------|
| Generate QR           | -       | Yes         | Yes   |
| QR Check-in           | Yes     | Yes*        | Yes*  |
| Manual Check-in       | -       | Yes         | Yes   |
| View Attendance List  | -       | Yes         | Yes   |
| View Registrations    | -       | Yes         | Yes   |

> *QR check-in requires a confirmed registration for the event.

**Note:** Supervisor role is temporarily mapped to `club_leader` permissions.

## Flow

### QR Check-in Flow

1. **Admin/Leader** navigates to `/events/:id/attendance`
2. Clicks "Generate QR Code" → backend returns a token (`eventId:randomHash`) and QR data URL
3. QR is displayed for attendees to scan
4. **Student** on `/events/:id` enters the token (or scans QR) in the check-in section
5. Backend validates: token format → event exists & published → user is registered → no duplicate → insert attendance record
6. Success/error/duplicate feedback shown to student

### Manual Check-in Flow

1. **Admin/Leader** on `/events/:id/attendance`
2. Enters user ID in manual check-in form
3. Backend validates: event exists & published → no duplicate → insert attendance record

## API Endpoints

### `POST /api/attendance/:eventId/qr`
- **Auth:** admin, club_leader
- **Response:** `{ token: string, qr: string }` (data URL)
- **Errors:** 404 (event not found), 400 (event not published)

### `POST /api/attendance/check-in`
- **Auth:** any authenticated user
- **Body:** `{ token: string }`
- **Response:** 201 with attendance record
- **Errors:** 400 (invalid token, not published), 403 (not registered), 404 (event not found), 409 (duplicate)

### `POST /api/attendance/:eventId/manual`
- **Auth:** admin, club_leader
- **Body:** `{ user_id: number }`
- **Response:** 201 with attendance record
- **Errors:** 400 (invalid user_id, not published), 404 (event not found), 409 (duplicate)

### `GET /api/attendance/:eventId`
- **Auth:** admin, club_leader
- **Response:** `{ data: Attendance[], total: number }`

### `GET /api/attendance/:eventId/registrations`
- **Auth:** admin, club_leader
- **Response:** `{ data: Registration[], total: number }`

## Database Schema

```sql
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checked_in_at TEXT NOT NULL DEFAULT (datetime('now')),
  method TEXT NOT NULL DEFAULT 'qr' CHECK (method IN ('qr', 'manual')),
  qr_token TEXT,
  UNIQUE(event_id, user_id)
);
```

## Validation Rules

1. QR generation only allowed for **published** events
2. Check-in only allowed for **published** events
3. QR check-in requires a **confirmed registration** (not cancelled)
4. Duplicate check-in prevented by UNIQUE constraint + application-level check (409 response)
5. Token format: `eventId:hexString` (64-char random hex)

## Frontend Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/events/:id/attendance` | admin, club_leader | Attendance management (QR gen, manual check-in, list) |
| `/events/:id` | all authenticated | Event detail with student check-in section |

## i18n

All attendance UI strings are translated in both English (`en`) and Arabic (`ar`) under the `attendance.*` namespace.
