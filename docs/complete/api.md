# FCIT CMP — API Reference

> Auto-generated from implemented routes. Last updated: 2026-02-26.

## Base URL

All endpoints are prefixed with `/api`.

## Authentication

Protected routes require a `Bearer` token in the `Authorization` header.
Tokens are issued by Keycloak (OIDC). In development mode, tokens signed with
`JWT_SECRET` and containing `"dev": true` are also accepted.

## Common Error Shape

All error responses include an `error` string field:

```json
{ "error": "Human-readable message" }
```

Validation errors (422) additionally include an `errors` array with
field-level detail:

```json
{
  "error": "First validation message",
  "errors": [
    { "type": "field", "msg": "...", "path": "email", "location": "body" }
  ]
}
```

## Email Verification — Deferred

Email verification is **not yet implemented**. Signup creates the user in
Keycloak with `emailVerified: true` immediately. A future milestone will
add verification endpoints and flows.

---

## Auth

### POST /auth/signup

Create a new user account.

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| email | string | yes | Valid email; domain must be `stu.kau.edu.sa` or `kau.edu.sa` |
| name | string | yes | 1–100 characters |
| password | string | yes | 8–128 chars, >= 1 uppercase, >= 1 lowercase, >= 1 digit |

**Rate limit:** 10 requests per IP per 15-minute window.

**Responses:**

| Status | Body |
|--------|------|
| 201 | `{ "ok": true }` |
| 409 | `{ "error": "An account with this email already exists." }` |
| 422 | `{ "error": "...", "errors": [...] }` |
| 429 | `{ "error": "Too many signup attempts. Please try again later." }` |
| 500 | `{ "error": "Registration failed. Please try again." }` |

---

## Users

All user endpoints require authentication.

### GET /users/me

Returns the currently authenticated user.

### PATCH /users/me

Update own profile.

| Field | Type | Required |
|-------|------|----------|
| name | string | no |
| avatar_url | string | no |

### GET /users

List all users. **Admin only.**

| Query | Type | Default |
|-------|------|---------|
| role | string | — |
| limit | integer | 50 |
| offset | integer | 0 |

**Response:** `{ "data": [...], "total": number }`

### PATCH /users/:id/role

Change a user's role. **Admin only.**

| Field | Type | Required |
|-------|------|----------|
| role | string | yes |

---

## Clubs

### GET /clubs

List clubs (public).

| Query | Type | Default |
|-------|------|---------|
| limit | integer | 50 |
| offset | integer | 0 |

**Response:** `{ "data": [...], "total": number }`

### GET /clubs/:id

Get a single club (public).

### POST /clubs

Create a club. **Admin only.**

| Field | Type | Required |
|-------|------|----------|
| name | string | yes |
| name_ar | string | yes |
| description | string | no |
| description_ar | string | no |
| logo_url | string | no |
| leader_id | integer | no |

### PATCH /clubs/:id

Update a club. **Admin or club_leader (owner only).**

Ownership rules:
- `admin`: may update any club, including changing `leader_id`.
- `club_leader`: may only update clubs where `clubs.leader_id === req.user.id`. Attempting to set `leader_id` returns **403** (only admins may reassign leadership).

| Status | Meaning |
|--------|---------|
| 200 | Updated |
| 403 | Not the club owner, or tried to set `leader_id` |
| 404 | Club not found |

### DELETE /clubs/:id

Delete a club. **Admin only.**

---

## Events

### GET /events

List events (public).

| Query | Type | Default |
|-------|------|---------|
| status | string | — |
| club_id | integer | — |
| limit | integer | 50 |
| offset | integer | 0 |

**Response:** `{ "data": [...], "total": number }`

### GET /events/:id

Get a single event (public).

### POST /events

Create an event. **Admin or club_leader (owned club only).**

Ownership rule: `club_leader` must be the `leader_id` of the target `club_id`.

| Field | Type | Required |
|-------|------|----------|
| club_id | integer | yes |
| title | string | yes |
| title_ar | string | yes |
| description | string | no |
| description_ar | string | no |
| location | string | no |
| starts_at | string (ISO) | yes |
| ends_at | string (ISO) | yes |
| capacity | integer | no |
| status | string | no (default: draft) |

| Status | Meaning |
|--------|---------|
| 201 | Created |
| 403 | Leader does not own `club_id` |

### PATCH /events/:id

Update an event. **Admin or club_leader (owner only).**

Ownership rule: `club_leader` must own the event's current club. If `club_id` is changed, leader must also own the target club.

| Status | Meaning |
|--------|---------|
| 200 | Updated |
| 403 | Leader does not own event (or target club) |
| 404 | Event not found |

### DELETE /events/:id

Delete an event. **Admin or club_leader (owner only).**

Ownership rule: `club_leader` must own the event's club.

| Status | Meaning |
|--------|---------|
| 204 | Deleted |
| 403 | Leader does not own event |
| 404 | Event not found |

### POST /events/:id/register

Register for a published event. **Auth required.**

| Status | Meaning |
|--------|---------|
| 201 | Registered |
| 400 | Not open or at capacity |
| 404 | Event not found |
| 409 | Already registered |

### POST /events/:id/cancel

Cancel own registration. **Auth required.**

---

## Attendance

All endpoints require authentication.

### POST /attendance/:eventId/qr

Generate QR code for event check-in. **Admin or club_leader (owner only).**

Event must be in `published` status. Ownership rule: `club_leader` must own the event's club.

**Response:** `{ "token": "...", "qr": "<data-url>" }`

| Status | Meaning |
|--------|---------|
| 200 | QR generated |
| 400 | Event not published |
| 403 | Leader does not own event |
| 404 | Event not found |

### POST /attendance/check-in

Check in via QR token. **Auth required (any role).**

Requires a confirmed registration for the event. Event must be in `published` status.

| Field | Type | Required |
|-------|------|----------|
| token | string | yes |

| Status | Meaning |
|--------|---------|
| 201 | Checked in |
| 400 | Invalid token / event not published |
| 403 | Not registered for event |
| 404 | Event not found |
| 409 | Already checked in |

### POST /attendance/:eventId/manual

Manual check-in. **Admin or club_leader (owner only).**

Event must be in `published` status. Ownership rule: `club_leader` must own the event's club.

| Field | Type | Required |
|-------|------|----------|
| user_id | integer | yes |

| Status | Meaning |
|--------|---------|
| 201 | Checked in |
| 400 | Invalid user_id / event not published |
| 403 | Leader does not own event |
| 404 | Event not found |
| 409 | Already checked in |

### GET /attendance/:eventId

List attendance records. **Admin or club_leader (owner only).**

Ownership rule: `club_leader` must own the event's club.

**Response:** `{ "data": [...], "total": number }`

| Status | Meaning |
|--------|---------|
| 200 | OK |
| 403 | Leader does not own event |
| 404 | Event not found |

### GET /attendance/:eventId/registrations

List event registrations (for manual check-in lookup). **Admin or club_leader (owner only).**

Ownership rule: `club_leader` must own the event's club.

**Response:** `{ "data": [...], "total": number }`

| Status | Meaning |
|--------|---------|
| 200 | OK |
| 403 | Leader does not own event |
| 404 | Event not found |

---

## Achievements

### GET /achievements/user/:userId

List achievements for a user (public).

### GET /achievements/user/:userId/report

Download PDF achievement report (public).

### GET /achievements/club/:clubId

List achievements for a club (public).

### POST /achievements

Award an achievement. **Admin or club_leader (owned club only).**

Ownership rule: `club_leader` must be the `leader_id` of `club_id`.

| Field | Type | Required |
|-------|------|----------|
| user_id | integer | yes |
| club_id | integer | yes |
| title | string | yes |
| title_ar | string | yes |
| description | string | no |
| description_ar | string | no |
| semester_id | integer | no |

| Status | Meaning |
|--------|---------|
| 201 | Created |
| 403 | Leader does not own `club_id` |

### DELETE /achievements/:id

Delete an achievement. **Admin or club_leader (owned club only).**

Ownership rule: achievement's `club_id` must match a club where `leader_id === req.user.id`.

| Status | Meaning |
|--------|---------|
| 204 | Deleted |
| 403 | Leader does not own the achievement's club |
| 404 | Achievement not found |

---

## KPI

### GET /kpi/leaderboard

Club leaderboard (public). Optional `semester_id` query.

### GET /kpi/club/:clubId

KPI summary for a club (public). Optional `semester_id` query.

### POST /kpi

Record a KPI metric. **Admin or club_leader (owned club only).**

Ownership rule: `club_leader` must be the `leader_id` of `club_id`.

| Field | Type | Required |
|-------|------|----------|
| club_id | integer | yes |
| semester_id | integer | no |
| metric_key | string | yes |
| metric_value | number | yes |

| Status | Meaning |
|--------|---------|
| 201 | Created |
| 403 | Leader does not own `club_id` |

---

## Notifications

All endpoints require authentication.

### GET /notifications

List own notifications.

| Query | Type | Default |
|-------|------|---------|
| limit | integer | 50 |
| offset | integer | 0 |

**Response:** `{ "data": [...], "unread": number }`

### PATCH /notifications/:id/read

Mark one notification as read.

### PATCH /notifications/read-all

Mark all notifications as read.

---

## Admin

All endpoints require authentication with admin role.

### GET /admin/stats

Dashboard statistics.

**Response:** `{ "users": number, "clubs": number, "events": number }`

### GET /admin/audit-log

List audit log entries.

| Query | Type | Default |
|-------|------|---------|
| limit | integer | 50 |
| offset | integer | 0 |
| entity_type | string | — |

### GET /admin/semesters

List semesters.

### POST /admin/semesters

Create a semester.

| Field | Type | Required |
|-------|------|----------|
| name | string | yes |
| starts_at | string (ISO) | yes |
| ends_at | string (ISO) | yes |

### PATCH /admin/semesters/:id/activate

Activate a semester (deactivates all others).

### DELETE /admin/semesters/:id

Delete a semester.

---

## Health

### GET /health

**Response:** `{ "status": "ok", "timestamp": "..." }`
