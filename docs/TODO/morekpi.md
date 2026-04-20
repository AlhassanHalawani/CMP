# More KPI — Dashboard and KPI Page Expansion

**Priority:** High
**Status:** Planned (the app already has a working dashboard and KPI page, but the current KPI surface is narrow and does not show rolling trend analytics such as events and attendance over the last 6 months)

---

## Summary

Expand the admin and club leader analytics experience with richer KPI cards and trend charts on both:

- `DashboardPage`
- `KpiPage`

The main new examples requested are:

- events in the last 6 months
- attendance across all clubs in the last 6 months

The reference image maps well to a V1 implementation:

- `Events Overview` monthly bar chart
- `Attendance Trend` monthly line/area chart

This feature should help admins and club leaders answer:

- How many events have we been publishing recently?
- Is attendance going up or down over the last 6 months?
- Which clubs are active?
- Are registrations converting into real attendance?

---

## Current Implementation Snapshot

The current codebase already has a strong base for KPI expansion:

- `apps/frontend/src/pages/DashboardPage.tsx`
  - admin dashboard shows quick stats, visitors, leaderboard preview, upcoming events
  - club leader dashboard shows club stats, leaderboard preview, upcoming events
- `apps/frontend/src/pages/KpiPage.tsx`
  - has leaderboard, club breakdown, and student rankings
  - already supports semester and department filters
- `apps/backend/src/models/kpi.model.ts`
  - already computes:
    - `attendance_count`
    - `member_count`
    - student XP/attendance summaries
- `apps/backend/src/controllers/clubs.controller.ts`
  - already exposes useful club-level metrics:
    - `published_events`
    - `registered_participants`
    - `unique_attendees`
    - `total_attendance`
    - `attendance_rate`
- `apps/frontend` already uses `recharts`
  - no new charting dependency is needed for V1

Important limitation:

- the current KPI model is mostly snapshot/leaderboard oriented
- it does not yet expose rolling monthly trend data such as "last 6 months"

Important cleanup item discovered during exploration:

- `apps/frontend/src/pages/DashboardPage.tsx` currently renders leaderboard bars using `total_score`
- `kpiApi.getLeaderboard()` returns `attendance_count` and `member_count`, not `total_score`
- that mismatch should be fixed before or during this KPI expansion

---

## Goal

Add clearer, more decision-useful KPI analytics for admins and club leaders without overcomplicating the current app.

V1 should make it easy to see:

- total published events in the last 6 months
- total attendance in the last 6 months
- month-by-month event volume
- month-by-month attendance trend
- registration-to-attendance conversion
- club activity and participation quality

---

## V1 Product Scope

### In scope

- new rolling 6-month KPI cards for dashboard and KPI page
- monthly event overview chart
- monthly attendance trend chart
- additional KPI cards based on existing source tables
- platform-wide view for admins
- club-scoped view for club leaders
- KPI page expansion with overview/trend-focused sections or tabs

### Out of scope for V1

- predictive analytics
- year-over-year comparisons
- CSV/PDF export for every new chart
- student-facing KPI-heavy dashboard changes
- storing historical monthly KPI snapshots in a new table unless live querying proves too slow

---

## Recommended KPI Set

### Core V1 KPIs

These should be the first new metrics added because they map directly to the current data model:

| KPI | Why it matters | Source |
|---|---|---|
| Published events in last 6 months | Shows activity volume | `events` |
| Attendance check-ins in last 6 months | Shows actual participation | `attendance` + `events` |
| Average attendance per event | Shows event quality, not just quantity | `attendance` + `events` |
| Unique attendees in last 6 months | Shows reach across students | `attendance` + `events` |
| Confirmed registrations in last 6 months | Shows intent/demand | `registrations` + `events` |
| Attendance rate | Shows conversion from registration to attendance | `attendance` + `registrations` + `events` |
| Active clubs in last 6 months | Shows how many clubs are truly operating | `events` |

### Strong V1+ suggestions

These are good additions if time permits and still fit the existing data cleanly:

| KPI | Why it matters |
|---|---|
| Monthly registrations trend | Helps explain attendance changes |
| Monthly active clubs trend | Shows whether platform engagement is broad or concentrated |
| Top clubs by events in last 6 months | Useful companion to attendance leaderboard |
| Top clubs by attendance rate | Highlights event effectiveness, not just scale |
| No-show count / no-show rate | Useful if registration quality matters operationally |

### Suggested dashboard cards

For admin:

- Events last 6 months
- Attendance last 6 months
- Unique attendees
- Attendance rate

For club leader:

- My club events last 6 months
- My club attendance last 6 months
- My club unique attendees
- My club average attendance per event

---

## Data and Calculation Rules

To keep numbers consistent across dashboard and KPI page:

- use `published` events only for event-volume KPIs
- use a rolling 6-month window by default for the new overview widgets
- bucket by calendar month in chronological order
- return zero-value months explicitly so charts stay stable
- platform-wide admin metrics aggregate across all clubs
- club leader metrics aggregate only for the leader’s owned club

Recommended formulas:

- `events_last_6_months` = count of published events whose `starts_at` is within the rolling 6-month window
- `attendance_last_6_months` = count of attendance rows joined to published events within the window
- `unique_attendees_last_6_months` = count of distinct `attendance.user_id` joined to published events within the window
- `registrations_last_6_months` = count of confirmed registrations joined to published events within the window
- `average_attendance_per_event` = attendance check-ins / published events
- `attendance_rate` = attendance check-ins / confirmed registrations * 100
- `active_clubs_last_6_months` = count of distinct clubs with at least one published event in the window

Important product rule:

- the existing semester filter and manual `compute KPI` flow should remain for leaderboard/snapshot use cases
- the new rolling 6-month charts should query source tables directly instead of depending on `kpi_metrics`

Reason:

- rolling month trends are a live analytics concern
- `kpi_metrics` is currently better suited to semester snapshots and ranking summaries

---

## Recommended Technical Approach

Use a hybrid KPI architecture:

1. Keep existing `kpi_metrics` behavior for semester-based leaderboard and manual compute.
2. Add new live aggregate queries for rolling-window charts and summary cards.
3. Reuse the same backend endpoint shapes for both Dashboard and KpiPage.

This avoids a migration in V1 and keeps the implementation aligned with the current schema.

---

## Step 0 — Baseline Cleanup

**File:** `apps/frontend/src/pages/DashboardPage.tsx`

Fix the existing leaderboard preview mismatch:

- current chart uses `total_score`
- current API returns `attendance_count` and `member_count`

Recommended action:

- switch the preview charts to `attendance_count` for now
- if a real composite score is added later, introduce it explicitly in the API instead of assuming it exists

---

## Step 1 — Add KPI Overview/Trend Endpoint(s)

**Files:**

- `apps/backend/src/controllers/kpi.controller.ts`
- `apps/backend/src/models/kpi.model.ts`
- `apps/backend/src/routes/kpi.routes.ts`

Recommended new endpoint:

```txt
GET /api/kpi/overview?window=6m
GET /api/kpi/overview?window=6m&club_id=12
```

Recommended auth:

- require authentication
- allow `admin` to query platform scope or any club scope
- allow `club_leader` to query only their owned club scope

Recommended response shape:

```json
{
  "scope": "platform",
  "window": "6m",
  "summary": {
    "events_count": 109,
    "attendance_count": 642,
    "registrations_count": 781,
    "unique_attendees": 294,
    "attendance_rate": 82,
    "avg_attendance_per_event": 5.9,
    "active_clubs": 14
  },
  "series": {
    "events_by_month": [
      { "month": "2026-01", "label": "Jan", "value": 12 },
      { "month": "2026-02", "label": "Feb", "value": 19 }
    ],
    "attendance_by_month": [
      { "month": "2026-01", "label": "Jan", "value": 340 },
      { "month": "2026-02", "label": "Feb", "value": 510 }
    ],
    "registrations_by_month": [
      { "month": "2026-01", "label": "Jan", "value": 402 },
      { "month": "2026-02", "label": "Feb", "value": 566 }
    ]
  },
  "rankings": {
    "top_clubs_by_events": [
      { "club_id": 1, "club_name": "AI Club", "value": 9 }
    ],
    "top_clubs_by_attendance": [
      { "club_id": 2, "club_name": "Cyber Club", "value": 88 }
    ]
  }
}
```

Why one overview endpoint is a good V1 choice:

- fewer frontend round trips
- same payload can power both dashboard and KPI page
- easier to keep cards and charts numerically consistent

---

## Step 2 — Add Live Aggregate Query Methods

**File:** `apps/backend/src/models/kpi.model.ts`

Add dedicated methods for rolling analytics, for example:

- `getOverview(options)`
- `getMonthlyEventSeries(options)`
- `getMonthlyAttendanceSeries(options)`
- `getMonthlyRegistrationSeries(options)`
- `getTopClubsByEvents(options)`
- `getTopClubsByAttendance(options)`

Implementation notes:

- use existing source tables:
  - `events`
  - `attendance`
  - `registrations`
  - `memberships`
- support both:
  - platform scope
  - club scope
- fill missing months with zeroes in application code if SQLite returns sparse rows

Recommended SQL pattern:

- filter on event dates for event/registration trends
- join `attendance` to `events` and filter by event month or checked-in month consistently

V1 recommendation:

- use event month for event/registration charts
- use check-in month for attendance charts

That keeps each chart semantically honest.

---

## Step 3 — Extend Frontend KPI API Types

**File:** `apps/frontend/src/api/kpi.ts`

Add a new typed client method, for example:

```ts
getOverview: (params?: { window?: '6m'; club_id?: number }) => ...
```

Also define frontend interfaces for:

- KPI summary cards
- month series points
- ranking mini-lists

This will make both `DashboardPage` and `KpiPage` consume the same typed data contract.

---

## Step 4 — Expand DashboardPage

**File:** `apps/frontend/src/pages/DashboardPage.tsx`

### Admin dashboard

Add a new overview section near the top with:

- summary cards for:
  - events last 6 months
  - attendance last 6 months
  - unique attendees
  - attendance rate
- `Events Overview` monthly bar chart
- `Attendance Trend` monthly line or area chart

Optional secondary chart if space allows:

- `Registrations vs Attendance` dual-series chart

### Club leader dashboard

Use the same visual pattern, but scoped to the leader’s club:

- my club events last 6 months
- my club attendance last 6 months
- my club unique attendees
- my club average attendance per event

### Student dashboard

Do not expand with platform KPI charts in V1.

Reason:

- the student dashboard is already moving toward a feed-like experience
- heavy KPI blocks are more useful for admins and club leaders than for students

---

## Step 5 — Expand KpiPage

**File:** `apps/frontend/src/pages/KpiPage.tsx`

Recommended V1 structure:

- keep existing tabs:
  - Leaderboard
  - Club Breakdown
  - Students
- add one new top-level tab:
  - `Overview`

Inside `Overview`, show:

- platform or club-scoped summary cards
- `Events Overview` chart for last 6 months
- `Attendance Trend` chart for last 6 months
- optional registration trend
- mini ranking cards:
  - top clubs by events
  - top clubs by attendance

Recommended filter behavior:

- keep semester filter for existing leaderboard/student ranking flows
- introduce a separate rolling-window selector for overview charts later if needed
- for V1, default the new overview to last 6 months without adding too many controls

This avoids mixing:

- semester snapshot analytics
- rolling live trend analytics

in one confusing filter model.

---

## Step 6 — Add i18n Labels and Chart Copy

**Files:**

- `apps/frontend/src/i18n/locales/en/translation.json`
- `apps/frontend/src/i18n/locales/ar/translation.json`

New keys likely needed:

- `kpi.overview`
- `kpi.eventsLast6Months`
- `kpi.attendanceLast6Months`
- `kpi.uniqueAttendees`
- `kpi.attendanceRate`
- `kpi.avgAttendancePerEvent`
- `kpi.activeClubs`
- `kpi.eventsOverview`
- `kpi.attendanceTrend`
- `kpi.registrationsTrend`
- `kpi.topClubsByEvents`
- `kpi.topClubsByAttendance`

---

## Step 7 — Verification and Tests

No KPI integration tests currently showed up during exploration, so this work should add at least backend endpoint coverage.

Recommended verification:

- add backend integration tests for new overview endpoint behavior
- verify both platform scope and club scope
- verify zero-filled month buckets
- verify `published`-only event counting
- verify attendance-rate math

Recommended commands:

- `npm run lint --workspace=apps/frontend`
- `npm run build --workspace=apps/frontend`
- backend test command used by the repo for integration coverage

Manual QA:

- admin sees platform-wide 6-month cards and charts
- club leader sees only owned-club KPIs
- KpiPage overview matches dashboard totals for the same scope
- months with no activity still render as zero-value buckets
- existing leaderboard, club breakdown, and student tabs still work

---

## Acceptance Criteria Checklist

- [ ] Dashboard shows `Events Overview` for the last 6 months
- [ ] Dashboard shows `Attendance Trend` for the last 6 months
- [ ] Admin dashboard uses platform-wide KPI data
- [ ] Club leader dashboard uses club-scoped KPI data
- [ ] KPI page includes richer overview metrics beyond attendance/member count
- [ ] New KPI cards include at least events, attendance, unique attendees, and attendance rate
- [ ] Existing semester leaderboard flow remains intact
- [ ] Dashboard leaderboard preview no longer depends on nonexistent `total_score`
- [ ] No database migration is required for the V1 implementation

---

## Files Summary

| Action | File |
|---|---|
| Modify | `apps/backend/src/controllers/kpi.controller.ts` |
| Modify | `apps/backend/src/models/kpi.model.ts` |
| Modify | `apps/backend/src/routes/kpi.routes.ts` |
| Modify | `apps/frontend/src/api/kpi.ts` |
| Modify | `apps/frontend/src/pages/DashboardPage.tsx` |
| Modify | `apps/frontend/src/pages/KpiPage.tsx` |
| Modify | `apps/frontend/src/i18n/locales/en/translation.json` |
| Modify | `apps/frontend/src/i18n/locales/ar/translation.json` |
| Create | `apps/backend/src/tests/integration/kpi.test.ts` |

---

## Notes

- This plan intentionally uses the current schema and existing tables first.
- The best V1 implementation is likely live-query based, not snapshot-table based.
- If performance later becomes a concern, a follow-up can add materialized monthly KPI snapshots without changing the frontend contract.
