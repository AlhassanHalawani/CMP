# V2 Bug Fix Plan

## Goal

Fix the current V2 dashboard, leaderboard, events, achievements, and KPI issues for club managers without guessing around the existing code. This plan is based on the current frontend, backend, and local SQLite data in this repo.

## What I Found In The Codebase

- `apps/frontend/src/pages/DashboardPage.tsx` is not club-manager-aware. It shows global club and event counts plus a club-only mini leaderboard.
- `apps/frontend/src/pages/DashboardPage.tsx` renders the home leaderboard as cards, not as a proper chart.
- `apps/frontend/src/pages/EventsPage.tsx` splits list mode into `upcoming` and `past` tabs instead of one all-time feed with status badges.
- `apps/frontend/src/pages/EventsPage.tsx` calendar mode only shows published upcoming events and requires the user to click a day before anything appears.
- `apps/frontend/src/pages/AchievementsPage.tsx` only loads `achievementsApi.listForUser(currentUser.id)`, so a club manager never sees club achievements there.
- `apps/frontend/src/pages/LeaderboardPage.tsx` only renders clubs.
- `apps/frontend/src/pages/KpiPage.tsx` has a student leaderboard, but it is admin-only.
- `apps/backend/src/models/kpi.model.ts` reads club leaderboard values from `kpi_metrics`, so the UI depends on precomputed rows instead of live club activity.
- `apps/backend/src/models/achievement.model.ts` and the `achievements` table only store awarded achievement records. There is no catalog for achievement rules, tiers, thresholds, or points.
- `apps/backend/src/routes/achievements.routes.ts` exposes user and club achievement reads without auth scoping, which does not match the requested "only my club / only me" behavior.

## Current Local Data Signal

The local DB explains part of the zero-value KPI problem:

- `clubs = 3`
- `events = 5`
- `published_events = 4`
- `attendance = 4`
- `achievements = 0`
- `memberships_active = 0`
- `kpi_metrics = 0`

That means the app already has real event and attendance data, but the leaderboard and KPI views still read as zero because there are no computed KPI rows yet. It also means any "students in club" metric currently based on active memberships will stay `0` until memberships are approved, so we need to define whether that card means `active members`, `registered participants`, or `unique attendees`.

## Root Causes

### 1. Club manager dashboard is using the wrong data shape

The current dashboard is global-first, not owner-first. A club leader does not get a summary for their own club, attendance rate, member count, or club points.

### 2. Leaderboards are only half-built

The home dashboard and `/leaderboard` page only show clubs, while student ranking exists only inside `/kpi` and only for admins.

### 3. KPI values are stale-by-design

All-time leaderboard views depend on `kpi_metrics`, but there is no automatic all-time compute path. The current `POST /api/kpi/compute` flow is admin-only and semester-based.

### 4. Events discovery is still interaction-heavy

List view is split across tabs, and calendar view hides useful content until the user selects a day.

### 5. Achievements are missing both scope and rule metadata

The app can show awarded achievements, but it cannot explain how to earn them because there is no achievement-rule catalog with thresholds, medals, or points.

## Recommended Implementation Order

1. Fix KPI data sources first so the dashboard and leaderboard stop showing misleading zeroes.
2. Add a real club-manager dashboard summary endpoint and wire `DashboardPage` to it.
3. Rebuild the home leaderboard and full leaderboard around club and student datasets.
4. Simplify `EventsPage` into an all-time list plus a full-page calendar.
5. Split achievements into "my student achievements" and "my club achievements", then add the "how to earn" guidance UI.
6. Lock in the behavior with backend tests and manual frontend smoke checks.

## Workstream 1 - Club Manager Dashboard

### Outcome

When a club manager opens `/dashboard`, they should see stats for their own club instead of platform-wide totals.

### Recommended backend change

Add a dedicated club-manager dashboard endpoint instead of trying to reuse the generic KPI leaderboard response.

Suggested endpoint:

- `GET /api/clubs/:id/dashboard`

Suggested response shape:

- `club_id`
- `club_name`
- `published_events`
- `total_events`
- `active_members`
- `registered_participants`
- `unique_attendees`
- `total_attendance`
- `attendance_rate`
- `total_points`
- `recent_events`

### Notes

- Reuse ownership checks from `apps/backend/src/services/ownership.service.ts`.
- If one leader can own multiple clubs, add a club switcher on the dashboard instead of hardcoding the first owned club.
- Attendance rate should match the existing attendance summary rule already used in `apps/backend/src/controllers/attendance.controller.ts`: `present / total_registered`.

### Likely files

- `apps/backend/src/controllers/clubs.controller.ts`
- `apps/backend/src/models/club.model.ts`
- `apps/backend/src/routes/clubs.routes.ts`
- `apps/frontend/src/pages/DashboardPage.tsx`
- `apps/frontend/src/api/clubs.ts`
- `apps/frontend/src/hooks/useCurrentUser.ts`

## Workstream 2 - Home Leaderboard And Full Leaderboard

### Outcome

Both the home dashboard and `/leaderboard` should show:

- best clubs
- best students
- charts instead of card-only rankings

### Recommended frontend change

Replace the current mini-card leaderboard on `DashboardPage` with chart-based widgets.

Recommended Neo chart references:

- `neo/src/examples/ui/chart/chart-bar-horizontal.tsx`
- `neo/src/examples/ui/chart/chart-bar-label.tsx`
- `neo/src/examples/ui/chart/chart-bar-multiple.tsx`

Recommended page behavior:

- `DashboardPage`: compact chart for top clubs and top students
- `LeaderboardPage`: tabs for `Clubs` and `Students`
- `KpiPage`: keep the detailed analytics page, but stop making student ranking admin-only if club leaders are meant to see it

### Recommended backend change

Keep club and student leaderboard endpoints separate, but make both available to the roles that need them.

Suggested shape:

- `GET /api/kpi/leaderboard?entity=clubs`
- `GET /api/kpi/leaderboard?entity=students`

or keep:

- `GET /api/kpi/leaderboard`
- `GET /api/kpi/students`

and widen access to `club_leader` where appropriate.

### Likely files

- `apps/frontend/src/pages/DashboardPage.tsx`
- `apps/frontend/src/pages/LeaderboardPage.tsx`
- `apps/frontend/src/pages/KpiPage.tsx`
- `apps/frontend/src/api/kpi.ts`
- `apps/backend/src/controllers/kpi.controller.ts`
- `apps/backend/src/models/kpi.model.ts`
- `apps/backend/src/routes/kpi.routes.ts`

## Workstream 3 - Events Dashboard UX

### Outcome

The events screen should show all visible events in one list, mark them clearly as `Upcoming` or `Past`, and load a full-page calendar without forcing the user to pick a date first.

### List view change

Replace the current `upcoming/past/pending` tab split in `apps/frontend/src/pages/EventsPage.tsx` with one all-time feed.

Recommended behavior:

- keep existing role-based event visibility
- sort all events by `starts_at DESC`
- add a computed time badge:
  - `Upcoming` when `starts_at > now`
  - `Past` when `starts_at <= now`
- keep workflow badges like `draft`, `submitted`, `published`, and `rejected` where relevant

### Calendar view change

The current calendar view should stop depending on `calendarDate`.

Recommended behavior:

- load the calendar already populated with all visible events
- make the calendar full-width or main-column dominant
- show month navigation, but do not require day selection to reveal content
- show an agenda pane or grouped event list for the visible month and nearby dates on first load
- keep past and upcoming events in the dataset, not only upcoming published events

### Likely files

- `apps/frontend/src/pages/EventsPage.tsx`
- `apps/frontend/src/api/events.ts`
- optional backend tweaks in `apps/backend/src/controllers/events.controller.ts`
- optional backend tweaks in `apps/backend/src/models/event.model.ts`

## Workstream 4 - Achievement Scope And Guidance

### Outcome

A club manager should see:

- their own student achievements
- their own club's achievements only
- guidance on how student and club achievements are earned

### Scope change

Split `AchievementsPage` into separate sections instead of a single user-only list.

Recommended sections:

- `My Achievements`
- `My Club Achievements`
- `How To Earn Achievements`

### Backend scoping change

Harden achievement reads so they are authenticated and ownership-aware.

Recommended rules:

- user achievements: only the user themselves or admin
- club achievements: only the club leader of that club or admin

### Rule catalog change

The current schema cannot support "bronze / gold / 10 points / 20 points / get 50 participants" in a stable way because awarded achievements do not store rule definitions.

Recommended V2 addition:

- create an `achievement_definitions` source with:
  - `audience_type` = `student` or `club`
  - `code`
  - `title`
  - `title_ar`
  - `description`
  - `description_ar`
  - `tier`
  - `points`
  - `threshold`
  - `metric_source`

This can start as a backend table or a typed config file, but a backend-backed catalog is the safer long-term choice because leaderboard points will need the same definitions.

### Example UI content

- club rule: "Reach 50 participants in one event -> Gold achievement -> 20 points"
- student rule: "Attend 5 events -> Bronze medal -> 10 points"

### Likely files

- `apps/frontend/src/pages/AchievementsPage.tsx`
- `apps/frontend/src/api/achievements.ts`
- `apps/frontend/src/i18n/locales/en/translation.json`
- `apps/frontend/src/i18n/locales/ar/translation.json`
- `apps/backend/src/controllers/achievements.controller.ts`
- `apps/backend/src/models/achievement.model.ts`
- `apps/backend/src/routes/achievements.routes.ts`
- new migration and model files if `achievement_definitions` is added

## Workstream 5 - KPI Correctness And Zero-Value Fixes

### Outcome

Club KPI numbers should reflect real data and stop defaulting to zero when activity exists.

### Recommended direction

Stop relying on precomputed `kpi_metrics` for all-time views.

Recommended rule:

- all-time dashboard and leaderboard values should be computed live from base tables
- semester reports can still use `semester_id` bounds or stored snapshots if needed

### Why

Right now:

- there are events and attendance records in the DB
- `kpi_metrics` is empty
- the leaderboard reads from `kpi_metrics`
- result: misleading zeroes

### Metrics that need clear definitions

- `students in club`
- `members`
- `participants`
- `points earned`

Recommended interpretation for V2:

- `active_members` = approved memberships
- `registered_participants` = registrations for the club's events
- `unique_attendees` = distinct users with attendance in the club's events
- `points` = score derived from achievement definitions and KPI scoring rules, not just `attendance_count + achievement_count`

### Data update triggers

After any of these actions, invalidate dashboard and leaderboard queries:

- membership approval or decline
- event publish or unpublish status change
- event registration
- attendance check-in
- achievement create or delete

If semester snapshots remain in use, also decide whether `computeKpi` should run:

- manually for reports only
- automatically after KPI-driving mutations
- or via a scheduled job

### Likely files

- `apps/backend/src/models/kpi.model.ts`
- `apps/backend/src/controllers/kpi.controller.ts`
- `apps/backend/src/models/membership.model.ts`
- `apps/backend/src/models/attendance.model.ts`
- `apps/backend/src/models/event.model.ts`
- `apps/frontend/src/pages/DashboardPage.tsx`
- `apps/frontend/src/pages/KpiPage.tsx`
- `apps/frontend/src/pages/LeaderboardPage.tsx`
- `apps/frontend/src/pages/ClubDetailPage.tsx`

## Workstream 6 - QA And Regression Coverage

### Backend tests to add

- club dashboard summary returns owned-club data only
- leaderboard includes both live club data and student data correctly
- club leader can read only their own club achievements
- user can read only their own achievements
- events list returns all visible events and time-status tags are computed correctly
- calendar feed still works after list/calendar changes

Recommended backend test targets:

- `apps/backend/src/tests/integration/ownership-authorization.test.ts`
- new KPI and achievements integration tests under `apps/backend/src/tests/integration/`

### Frontend verification

The frontend workspace currently has `build` and `lint`, but no dedicated test runner configured in `apps/frontend/package.json`, so V2 should at minimum include:

- `npm run build --workspace=apps/frontend`
- `npm run lint --workspace=apps/frontend`
- manual smoke pass for:
  - dashboard as club leader
  - leaderboard as club leader
  - achievements as club leader
  - events list and calendar
  - club detail stats

## Definition Of Done

- club leaders see their own club dashboard stats on `/dashboard`
- home dashboard leaderboard uses charts, not only rank cards
- home and full leaderboard show both clubs and students
- events list shows all visible events in one all-time feed with `Upcoming` or `Past` labels
- events calendar loads as a full-page calendar without forcing a day pick first
- achievements page shows only the manager's own student achievements and their own club's achievements
- achievements page explains how achievements are earned for clubs and students
- KPI cards and leaderboards stop showing misleading zeroes when live event and attendance data already exists

## Assumptions To Keep In Mind During Implementation

- The codebase currently allows a leader to own more than one club, even though the user request speaks about "his club" in the singular.
- The meaning of "students in AI club" needs to be finalized before implementation, because the current schema supports `memberships`, `registrations`, and `attendance` as three different counts.
- If achievement points become the real ranking source, the existing `total_score = attendance_count + achievement_count` formula in `apps/backend/src/models/kpi.model.ts` should be replaced instead of patched around.
