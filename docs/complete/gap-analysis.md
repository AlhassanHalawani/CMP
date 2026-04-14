# CMP Gap Analysis — Functional Requirements vs Implementation

> Generated: 2026-03-01
> Basis: `functional-requirement.md` (FR-001 through FR-010) vs full codebase audit

---

## Individual Implementation Plans

Each FR has a dedicated implementation plan file ready for use with an AI coding assistant:

| Plan File | FR | Title |
|---|---|---|
| [FR-001-achievement-report.md](FR-001-achievement-report.md) | FR-001 | Student Achievement Report |
| [FR-002-event-approval-workflow.md](FR-002-event-approval-workflow.md) | FR-002 | Event Approval Workflow |
| [FR-003-qr-attendance-hardening.md](FR-003-qr-attendance-hardening.md) | FR-003 | QR Attendance Hardening |
| [FR-004-kpi-auto-compute.md](FR-004-kpi-auto-compute.md) | FR-004 | KPI Auto-Computation & Export |
| [FR-005-club-membership.md](FR-005-club-membership.md) | FR-005 | Club Membership System |
| [FR-007-event-calendar-discovery.md](FR-007-event-calendar-discovery.md) | FR-007 | Event Calendar & Discovery |
| [FR-008-notification-triggers.md](FR-008-notification-triggers.md) | FR-008 | Notification Triggers & Preferences |
| [FR-009-club-profile.md](FR-009-club-profile.md) | FR-009 | Club Profile & Logo Upload |
| [FR-010-attendance-report.md](FR-010-attendance-report.md) | FR-010 | Attendance Report Export |

> **Note on frontend components:** All plan files include a "Neo Components to Copy" section. The `neo` folder at `/workspaces/CMP/neo/src/components/ui/` contains 46 neobrutalism-styled UI components built on Radix UI + Tailwind v4. Copy the listed files into `apps/frontend/src/components/ui/`. When copying, replace any Next.js-specific imports (`next/link`, `next/navigation`) with their `react-router-dom` equivalents.

---

## Summary Table

| FR | Title | Status | Gap Severity |
|----|-------|--------|--------------|
| FR-001 | Student Achievement Report | Partial | Medium |
| FR-002 | Event Approval Workflow | **Missing** | **High** |
| FR-003 | QR Code Attendance | Partial | Low |
| FR-004 | Semester KPI Report | Partial | Medium |
| FR-005 | Club Registration & Membership | **Missing** | **High** |
| FR-006 | User Auth & Authorization | Complete | — |
| FR-007 | Event Calendar & Discovery | Partial | Medium |
| FR-008 | Notification System | Partial | **High** |
| FR-009 | Club Profile Management | Partial | Low |
| FR-010 | Attendance Report for Club Managers | Partial | Medium |

---

## FR-001 — Student Achievement Report Generation

### What's Implemented
- `GET /api/achievements/user/:userId/report` downloads a PDF via `pdfkit`
- PDF includes: student name, list of achievements with titles/descriptions and award dates
- `AchievementsPage` in frontend displays user achievements

### Gaps

| # | Gap | Detail |
|---|-----|--------|
| 1.1 | **Semester/filter params on report endpoint** | Report always dumps all achievements regardless of term; FR requires semester + optional activity-type/club filters |
| 1.2 | **Attendance & volunteer hours in PDF** | PDF only includes achievements table; FR requires verified attendances and volunteer hours summary |
| 1.3 | **Verification QR / code in PDF** | No verification code or QR embedded in the PDF; FR mandates authenticity check mechanism |
| 1.4 | **Student ID in PDF** | PDF header contains name only; FR requires student name + ID |
| 1.5 | **Summary totals** | No total counts (events attended, awards, hours) in PDF |
| 1.6 | **Deterministic regeneration** | `Generated: new Date()` timestamp changes on every call, violating AC-4 |
| 1.7 | **Frontend report UI** | No semester/filter selection UI; AchievementsPage has no download button with filter options |

---

## FR-002 — Event Approval Workflow

### What's Implemented
- Events have statuses: `draft | published | cancelled | completed`
- Club leaders and admins can set status via `PATCH /api/events/:id`
- Audit logs capture update actions

### Gaps

| # | Gap | Detail |
|---|-----|--------|
| 2.1 | **`submitted` status missing** | Event state machine lacks a "Submitted" state; leaders can jump directly to `published` |
| 2.2 | **`rejected` status missing** | No rejected state; admin has no way to formally reject with notes |
| 2.3 | **`rejection_notes` field missing** | No DB column to carry rejection comments back to the club manager |
| 2.4 | **Submit-for-review action** | No dedicated `POST /api/events/:id/submit` endpoint; only a generic PATCH on status |
| 2.5 | **Approve / reject actions** | No dedicated `POST /api/events/:id/approve` or `POST /api/events/:id/reject` endpoints; FR requires these to be distinct, audited actions |
| 2.6 | **Only published events visible to students** | Currently `listEvents` filters by `status` but nothing enforces that students only see `published`; the frontend does filter, but the API itself returns draft events if queried |
| 2.7 | **Notification on approval/rejection** | No notification sent to club manager when admin acts on a proposal |
| 2.8 | **Preserve inputs on rejection** | While data isn't deleted, there is no structured "resubmit from rejected" flow |

---

## FR-003 — QR Code Attendance Tracking

### What's Implemented
- `POST /api/attendance/:eventId/qr` generates a signed QR token for a published event
- `POST /api/attendance/check-in` validates token, prevents duplicate check-in
- `POST /api/attendance/:eventId/manual` for manual check-in
- Registration is validated before allowing check-in
- Timestamps and event IDs stored

### Gaps

| # | Gap | Detail |
|---|-----|--------|
| 3.1 | **Check-in window open/close** | QR is valid for the entire duration of a `published` event; FR requires club managers to explicitly open and close the check-in window, and closed sessions must reject new scans |
| 3.2 | **Capacity enforced at check-in** | Capacity is checked at registration time (`registerForEvent`), but not re-checked at check-in; if capacity was reduced after registration, over-capacity check-ins are possible |
| 3.3 | **Session finalization** | No `POST /api/attendance/:eventId/finalize` endpoint; FR mentions the manager must finalize the session |

---

## FR-004 — Semester KPI Report Generation

### What's Implemented
- `GET /api/kpi/leaderboard` with optional semester filter
- `GET /api/kpi/club/:clubId` with optional semester filter
- `POST /api/kpi` to manually record a metric
- KPI dashboard in frontend (`KpiPage`) with charts and leaderboard
- Admin can manage semesters

### Gaps

| # | Gap | Detail |
|---|-----|--------|
| 4.1 | **KPIs are manually entered, not computed** | FR requires the system to auto-aggregate verified attendance and achievements into KPIs; currently a club leader or admin must POST a raw `metric_key/metric_value`, which is not derived from real data |
| 4.2 | **No CSV export** | `GET /api/kpi/leaderboard` returns JSON only; FR requires CSV export |
| 4.3 | **No PDF export** | FR requires PDF export of KPI reports |
| 4.4 | **Department filter missing** | FR specifies filters by department; no `department` field on users or clubs |
| 4.5 | **Tied ranks** | Leaderboard `ORDER BY total_score DESC` does not handle ties with `RANK()` or equivalent |

---

## FR-005 — Club Registration & Membership

### What's Implemented
- Event `registrations` table exists (for event sign-ups, not club membership)
- Users have a single global role (`student | club_leader | admin`)

### Gaps  *(entire feature missing)*

| # | Gap | Detail |
|---|-----|--------|
| 5.1 | **`memberships` table missing** | No DB table for club membership (user_id, club_id, status, requested_at) |
| 5.2 | **Request membership endpoint** | No `POST /api/clubs/:id/join` |
| 5.3 | **Approve/decline membership endpoint** | No `PATCH /api/clubs/:id/members/:userId` for club manager |
| 5.4 | **Leave club endpoint** | No `DELETE /api/clubs/:id/membership` |
| 5.5 | **List club members endpoint** | No `GET /api/clubs/:id/members` |
| 5.6 | **Membership status tracking** | Pending → Active → Inactive states not implemented |
| 5.7 | **Member-only events** | Events have no `members_only` flag; no access check against membership |
| 5.8 | **Member communications** | Notifications to active members not implemented |
| 5.9 | **Frontend join/leave UI** | Club detail page has no join/leave/membership management UI |

---

## FR-006 — User Authentication & Authorization (SSO RBAC)

### What's Implemented
- Keycloak 26.1 OIDC integration (JWKS RS256 in prod, HS256 dev mode)
- Three roles: `student | club_leader | admin`
- `requireRole()` middleware on all protected routes
- Unauthorized actions blocked with 403
- Audit logs capture actor + action + timestamp
- Session managed by Keycloak (timeout, refresh)

### Gaps

| # | Gap | Detail |
|---|-----|--------|
| 6.1 | **No login/logout API routes** | CLAUDE.md mentions `POST /api/auth/login` and `POST /api/auth/logout` but these do not exist; auth is fully delegated to Keycloak redirect flow — acceptable but differs from documented API surface |

> **Overall:** Largely complete. No blocking gaps.

---

## FR-007 — Event Calendar & Discovery

### What's Implemented
- `EventsPage` lists events in a grid (upcoming vs past tabs)
- Filter by `status` and `club_id` on API
- Event detail page with capacity and registration state

### Gaps

| # | Gap | Detail |
|---|-----|--------|
| 7.1 | **No calendar view** | Events are shown as a card grid/list, not a month/week calendar UI |
| 7.2 | **No `category` field on events** | FR requires filter by category; the events DB table and model have no `category` column |
| 7.3 | **No location filter** | API `listEvents` supports no location filter; no location query param |
| 7.4 | **No date range filter** | API has no `starts_after` / `ends_before` query params; frontend uses crude upcoming/past tabs |
| 7.5 | **No ICS export** | FR requires per-event and calendar-level ICS export; not implemented anywhere |
| 7.6 | **Available seats not shown on listings** | Event cards do not display remaining capacity |

---

## FR-008 — Notification System

### What's Implemented
- `notifications` DB table with `create / listForUser / markRead / markAllRead`
- In-app notification list page with unread count badge
- `email.service.ts` exists with `sendEmail()` using nodemailer

### Gaps

| # | Gap | Detail |
|---|-----|--------|
| 8.1 | **No email notification triggers** | `sendEmail()` is never called anywhere in the codebase; no event approval, registration, or reminder emails are sent |
| 8.2 | **No in-app notification triggers** | `NotificationModel.create()` is never called outside tests; no controller creates notifications |
| 8.3 | **No WhatsApp notifications** | FR mentions WhatsApp as a delivery channel; no integration exists |
| 8.4 | **No user notification preferences** | No opt-in/opt-out per channel/type; no `notification_preferences` table |
| 8.5 | **No scheduled reminders** | No cron job or scheduler for pre-event reminders |
| 8.6 | **No delivery status logging** | `sendEmail` resolves/rejects but no delivery record is written to DB |
| 8.7 | **Approval / membership triggers missing** | No notification fired on event approve/reject, membership approve/decline, or report ready |

---

## FR-009 — Club Profile Management

### What's Implemented
- Club CRUD with bilingual name/description, `logo_url`, `leader_id`
- `ClubDetailPage` shows club info and leader
- Only the club leader (or admin) can update the profile

### Gaps

| # | Gap | Detail |
|---|-----|--------|
| 9.1 | **No image upload** | `logo_url` is a plain URL string; no file upload endpoint exists (CLAUDE.md also flags this) |
| 9.2 | **No verified stats on public profile** | Club detail page does not show computed stats (total events, total attendees, total achievements) |
| 9.3 | **No recent-events showcase section** | Club detail page links to events but has no dedicated "showcase" section with highlighted recent events |

---

## FR-010 — Attendance Report for Club Managers

### What's Implemented
- `GET /api/attendance/:eventId` returns attendance list for a single event (JSON)
- `GET /api/attendance/:eventId/registrations` returns registrations (JSON)

### Gaps

| # | Gap | Detail |
|---|-----|--------|
| 10.1 | **No CSV export** | FR requires downloadable CSV; API returns JSON only |
| 10.2 | **No PDF export** | FR requires downloadable PDF; not implemented |
| 10.3 | **No date-range / multi-event report** | API is per-event only; FR requires manager to generate a report across a date range |
| 10.4 | **No no-show detection** | No way to query "registered but did not check in" (cross-join registrations ↔ attendance); no `status` filter |
| 10.5 | **No attendance status filter** | API has no `?status=present|no_show` query param |
| 10.6 | **No frontend report generation UI** | `EventAttendancePage` shows attendance list but has no export/download button |

---

## Prioritized Implementation Roadmap

Items ordered by FR priority (High → Medium) and inter-dependency.

### Phase 1 — Critical Missing Features (High Priority FRs)

#### 1-A: Event Approval Workflow (FR-002)
1. Add migration: add `submitted` and `rejected` to events status enum; add `rejection_notes TEXT` column
2. Add `POST /api/events/:id/submit` — club leader moves draft → submitted
3. Add `POST /api/events/:id/approve` — admin moves submitted → published
4. Add `POST /api/events/:id/reject` — admin moves submitted → rejected, stores notes
5. Enforce: club leaders cannot directly set status to `published`
6. Enforce: API `listEvents` returns only `published` events for unauthenticated / student role
7. Wire notification on approve/reject (see FR-008 triggers)
8. Frontend: "Submit for Review" button (leader); approve/reject UI with notes (admin)

#### 1-B: Club Membership (FR-005)
1. Add migration: create `memberships` table (`id, club_id, user_id, status ENUM(pending,active,inactive), requested_at, updated_at`)
2. Add `POST /api/clubs/:id/join` — student submits membership request
3. Add `GET /api/clubs/:id/members` — club leader / admin views members list
4. Add `PATCH /api/clubs/:id/members/:userId` — approve or decline (sets status)
5. Add `DELETE /api/clubs/:id/membership` — student leaves club (sets status → inactive)
6. Add `members_only BOOLEAN DEFAULT 0` column to events; enforce membership check on registration
7. Wire notification on membership approval (see FR-008)
8. Frontend: join/leave button on ClubDetailPage; membership management tab for club leaders

#### 1-C: Notification Triggers (FR-008)
1. Add `notification_preferences` table (`user_id, channel ENUM(in_app,email), type, enabled`)
2. Create `notifications.service.ts` — single `notify(userId, title, body, type)` that writes in-app record and conditionally sends email
3. Fire triggers:
   - Event submitted → notify all admins
   - Event approved → notify club manager
   - Event rejected → notify club manager (with notes)
   - Registration confirmed → notify student
   - Membership approved/declined → notify student
   - KPI report ready → notify admins
4. Add scheduled job (e.g., `node-cron`) for pre-event reminder (24h / 1h before)
5. Add `GET /api/notifications/preferences` and `PATCH /api/notifications/preferences` endpoints

### Phase 2 — Report Completeness (High Priority FRs)

#### 2-A: Achievement Report Enhancement (FR-001)
1. Add `semester_id` query param to `GET /api/achievements/user/:userId/report`
2. Add `club_id` filter query param
3. Include attendance records in PDF (count + list)
4. Add summary totals section: events attended, achievements, hours (if tracked)
5. Embed a verification QR in the PDF (hash of userId + semesterId + report date)
6. Add student ID to PDF header (store student ID in users table or derive from email)
7. Make generation deterministic — use fixed report date passed as param, not `new Date()`
8. Frontend: Add "Download Report" button with semester selector on AchievementsPage

#### 2-B: KPI Auto-Computation (FR-004)
1. Add `POST /api/kpi/compute?semester_id=X` — admin triggers KPI recomputation from verified data (attendance counts, achievement counts per club)
2. Add CSV export: `GET /api/kpi/leaderboard?format=csv`
3. Add PDF export: `GET /api/kpi/leaderboard?format=pdf`
4. Add `department` field to clubs table; add department filter to leaderboard endpoint
5. Fix tied-rank query: use window function or application-level rank assignment

### Phase 3 — Medium Priority Features

#### 3-A: Event Calendar & Discovery (FR-007)
1. Add `category TEXT` column to events table (migration)
2. Add `?category=`, `?location=`, `?starts_after=`, `?ends_before=` query params to `GET /api/events`
3. Add `GET /api/events/:id/ics` — return iCalendar file for a single event
4. Add `GET /api/events/calendar.ics` — iCalendar feed for all upcoming published events
5. Frontend: add category/location/date-range filter controls to EventsPage
6. Frontend: add calendar view toggle (month grid using a lightweight library)
7. Frontend: display remaining seats on event cards

#### 3-B: Attendance Report Export (FR-010)
1. Add `?format=csv` to `GET /api/attendance/:eventId` — stream CSV response
2. Add `?format=pdf` — generate attendance PDF via pdfkit
3. Add `GET /api/attendance?club_id=X&starts_after=Y&ends_before=Z` — cross-event range report (club manager scoped)
4. Compute no-show list: LEFT JOIN registrations on attendance WHERE attendance.id IS NULL
5. Add `?status=present|no_show` filter
6. Frontend: add export buttons (CSV/PDF) on EventAttendancePage; add date-range report UI

#### 3-C: FR-003 QR Attendance Hardening
1. Add `checkin_open BOOLEAN DEFAULT 0` to events table (migration)
2. Add `POST /api/events/:id/checkin/open` and `POST /api/events/:id/checkin/close` endpoints (admin/leader)
3. In `checkIn` controller, validate `event.checkin_open === true` before accepting token
4. Add `POST /api/events/:id/attendance/finalize` — marks session done, rejects future scans
5. Frontend: open/close check-in window toggle on EventAttendancePage

#### 3-D: Club Profile (FR-009)
1. Add `POST /api/clubs/:id/logo` — file upload endpoint (multipart, saves to local storage or S3)
2. Add `GET /api/clubs/:id/stats` — returns computed stats (total published events, total attendance, total achievements, member count)
3. Frontend: display stats section on ClubDetailPage; add logo upload UI for club leader

---

## Quick Reference: Files to Create / Modify Per Phase

### Phase 1-A (Event Approval)
- `apps/backend/migrations/011_event_approval_workflow.sql`
- `apps/backend/src/controllers/events.controller.ts` — add `submitEvent`, `approveEvent`, `rejectEvent`
- `apps/backend/src/routes/events.routes.ts` — register new endpoints
- `apps/frontend/src/pages/EventDetailPage.tsx` — submit/approve/reject UI
- `apps/frontend/src/api/events.ts` — add `submit()`, `approve()`, `reject()`

### Phase 1-B (Club Membership)
- `apps/backend/migrations/011_create_memberships.sql`
- `apps/backend/src/models/membership.model.ts` — new file
- `apps/backend/src/controllers/membership.controller.ts` — new file
- `apps/backend/src/routes/clubs.routes.ts` — add membership sub-routes
- `apps/frontend/src/pages/ClubDetailPage.tsx` — join/leave/manage UI
- `apps/frontend/src/api/clubs.ts` — add membership API calls

### Phase 1-C (Notification Triggers)
- `apps/backend/migrations/012_notification_preferences.sql`
- `apps/backend/src/services/notifications.service.ts` — new file
- `apps/backend/src/controllers/events.controller.ts` — call notify on approve/reject
- `apps/backend/src/controllers/events.controller.ts` — call notify on registration confirm
- `apps/backend/src/routes/notifications.routes.ts` — add preferences endpoints

### Phase 2-A (Achievement Report)
- `apps/backend/src/services/pdf.service.ts` — rewrite `generateAchievementReport()`
- `apps/backend/src/controllers/achievements.controller.ts` — pass query params to report
- `apps/frontend/src/pages/AchievementsPage.tsx` — add download UI

### Phase 2-B (KPI Auto-Compute)
- `apps/backend/src/controllers/kpi.controller.ts` — add `computeKpi`, export endpoints
- `apps/backend/src/routes/kpi.routes.ts` — register new endpoints
- `apps/backend/migrations/013_clubs_add_department.sql`

### Phase 3-A (Calendar & Discovery)
- `apps/backend/migrations/014_events_add_category.sql`
- `apps/backend/src/controllers/events.controller.ts` — add filter params, ICS endpoints
- `apps/frontend/src/pages/EventsPage.tsx` — filter UI, calendar view

### Phase 3-B (Attendance Reports)
- `apps/backend/src/controllers/attendance.controller.ts` — add format/range/no-show
- `apps/frontend/src/pages/EventAttendancePage.tsx` — export buttons

### Phase 3-C (QR Hardening)
- `apps/backend/migrations/015_events_checkin_window.sql`
- `apps/backend/src/controllers/attendance.controller.ts` — open/close/finalize
- `apps/frontend/src/pages/EventAttendancePage.tsx` — toggle UI

### Phase 3-D (Club Profile)
- `apps/backend/src/controllers/clubs.controller.ts` — logo upload, stats endpoint
- `apps/backend/src/routes/clubs.routes.ts` — register new endpoints
- `apps/frontend/src/pages/ClubDetailPage.tsx` — stats, logo upload
