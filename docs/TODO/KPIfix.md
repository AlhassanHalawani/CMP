# KPI Fix Plan - Always-Visible Zero-State KPIs and Real-Time Updates

**Priority:** High
**Status:** Planned

---

## Summary

The KPI system currently disappears or falls back to `"No activity yet"` when there are no KPI rows. That makes the dashboard look broken and hides clubs or students that should still be visible with zero values.

The fix should make KPI screens entity-first instead of activity-first:

- always list all clubs in club KPI views, even when every metric is `0`
- add a student KPI dataset/view that lists all students, even when every metric is `0`
- always render charts, tables, and summary cards in zero-state form instead of replacing them with plain text
- make counts and graphs refresh automatically so totals change when members join, attendance is recorded, achievements are added, or KPI recompute runs

Recommended assumption for safety:

- campus-wide student KPIs should be `admin` visible by default
- club leaders can keep their current club-scoped KPI access unless you want a broader student leaderboard later

---

## Confirmed Signals From The Codebase

- [`apps/frontend/src/pages/KpiPage.tsx`](/workspaces/CMP/apps/frontend/src/pages/KpiPage.tsx) explicitly swaps multiple KPI areas to `t('kpi.noActivityYet', 'No activity yet')` when the dataset is empty.
- [`apps/frontend/src/pages/LeaderboardPage.tsx`](/workspaces/CMP/apps/frontend/src/pages/LeaderboardPage.tsx) shows `common.noData` instead of rendering a zero-state leaderboard.
- [`apps/frontend/src/pages/DashboardPage.tsx`](/workspaces/CMP/apps/frontend/src/pages/DashboardPage.tsx) hides the mini leaderboard completely unless KPI data exists.
- [`apps/backend/src/models/kpi.model.ts`](/workspaces/CMP/apps/backend/src/models/kpi.model.ts) builds the leaderboard from `kpi_metrics km JOIN clubs c`, so clubs with no KPI rows are excluded entirely.
- [`apps/backend/src/models/kpi.model.ts`](/workspaces/CMP/apps/backend/src/models/kpi.model.ts) returns club summary rows only for metric keys that already exist, so empty clubs have no chartable shape.
- There is no existing websocket/SSE layer. The app already uses React Query invalidation heavily, and [`apps/frontend/src/components/layout/Topbar.tsx`](/workspaces/CMP/apps/frontend/src/components/layout/Topbar.tsx) already uses `refetchInterval: 30_000`, so polling is the safest first real-time mechanism.
- The current KPI API is club-focused. If we want "all students even when stats are zero", we need a student KPI endpoint or a new dashboard aggregate endpoint based on `users`, not `kpi_metrics`.

---

## Likely Root Cause

The current KPI flow depends on activity rows existing first:

1. backend queries start from `kpi_metrics`
2. only clubs with saved KPI rows are returned
3. empty result sets reach the frontend
4. frontend replaces graphs and rows with `"No activity yet"`
5. dashboard KPI sections are hidden instead of showing zero values

That means "no rows" is being treated as "render nothing" instead of "render the full entity list with zeroes".

---

## Fix Strategy

Recommended direction:

1. make backend KPI endpoints return stable, zero-filled shapes
2. make frontend charts/tables/cards render those shapes even when values are zero
3. add polling plus targeted cache invalidation so KPI screens refresh automatically
4. expand KPI coverage with a few graph types that still make sense in empty or early-stage systems

The key design rule should be:

> KPI widgets should never depend on non-empty activity rows in order to exist.

---

## Execution Plan

### 1. Normalize Club KPI Data To Include All Clubs

**Likely files**

- [`apps/backend/src/models/kpi.model.ts`](/workspaces/CMP/apps/backend/src/models/kpi.model.ts)
- [`apps/backend/src/controllers/kpi.controller.ts`](/workspaces/CMP/apps/backend/src/controllers/kpi.controller.ts)
- [`apps/frontend/src/api/kpi.ts`](/workspaces/CMP/apps/frontend/src/api/kpi.ts)
- [`apps/frontend/src/api/clubs.ts`](/workspaces/CMP/apps/frontend/src/api/clubs.ts)

**Tasks**

- Change leaderboard aggregation to start from `clubs` and `LEFT JOIN` KPI aggregates instead of starting from `kpi_metrics`.
- Keep `COALESCE(..., 0)` for `attendance_count`, `achievement_count`, `member_count`, and `total_score`.
- Preserve semester and department filters without dropping zero-metric clubs.
- Return a deterministic order even when many clubs tie at `0`.
- Update `getClubSummary()` so it always returns a fixed metric set for a selected club:
  - `attendance_count`
  - `achievement_count`
  - `member_count`
  - `total_score`
- Update frontend types so club department is typed consistently instead of relying on `any`.

**Why this matters**

This fixes the current issue where a club simply vanishes from KPI screens when it has no KPI rows yet.

### 2. Add A Student KPI Dataset That Includes Every Student

**Likely files**

- [`apps/backend/src/models/kpi.model.ts`](/workspaces/CMP/apps/backend/src/models/kpi.model.ts)
- [`apps/backend/src/controllers/kpi.controller.ts`](/workspaces/CMP/apps/backend/src/controllers/kpi.controller.ts)
- [`apps/backend/src/routes/kpi.routes.ts`](/workspaces/CMP/apps/backend/src/routes/kpi.routes.ts)
- [`apps/frontend/src/api/kpi.ts`](/workspaces/CMP/apps/frontend/src/api/kpi.ts)
- [`apps/frontend/src/pages/KpiPage.tsx`](/workspaces/CMP/apps/frontend/src/pages/KpiPage.tsx)

**Tasks**

- Add a new endpoint such as `GET /api/kpi/students`.
- Build it from `users` filtered to `role = 'student'` and `LEFT JOIN` aggregated activity subqueries.
- Return every student even if all metrics are `0`.
- Support optional semester filtering.
- Recommended per-student metrics from the current schema:
  - `attendance_count`
  - `achievement_count`
  - `registration_count`
  - `active_memberships` if memberships are available
  - `engagement_score` as a simple derived score
- Add safe visibility rules:
  - `admin`: all students
  - `club_leader`: either do not expose this view yet, or scope it to students tied to the leader's club(s)

**Why this matters**

Your request explicitly calls for listing all students even when their stats are zero. The current club-only KPI API cannot satisfy that requirement by itself.

### 3. Replace Empty-State Branches With Zero-State Visuals

**Likely files**

- [`apps/frontend/src/pages/KpiPage.tsx`](/workspaces/CMP/apps/frontend/src/pages/KpiPage.tsx)
- [`apps/frontend/src/pages/LeaderboardPage.tsx`](/workspaces/CMP/apps/frontend/src/pages/LeaderboardPage.tsx)
- [`apps/frontend/src/pages/DashboardPage.tsx`](/workspaces/CMP/apps/frontend/src/pages/DashboardPage.tsx)
- [`apps/frontend/src/components/ui/chart.tsx`](/workspaces/CMP/apps/frontend/src/components/ui/chart.tsx)

**Tasks**

- Remove branches that replace KPI sections with `No activity yet` or `common.noData`.
- Add small adapter helpers that convert empty API payloads into chart-safe arrays.
- Always render axes, labels, cards, and legends even when all values are `0`.
- Use supportive captions instead of blank states, for example:
  - `"0 activity this semester"`
  - `"No attendance recorded yet"`
  - `"No achievements awarded yet"`
- Keep loading and empty states separate:
  - loading = spinner/skeleton
  - loaded with zero data = visible chart with zero values

**Zero-state behavior per view**

- Leaderboard bar chart: render all clubs/students with bar length `0`
- KPI table: render all rows with zero values
- Club metric breakdown: render fixed categories with `0`
- Pie chart: render either neutral zero slices or a single neutral placeholder slice with total `0`
- Dashboard stat cards: show `0`, never hide the card
- Dashboard mini leaderboard: show top zero-valued rows instead of hiding the section

### 4. Add Real-Time Refresh Using Polling Plus Cache Invalidation

**Likely files**

- [`apps/frontend/src/pages/KpiPage.tsx`](/workspaces/CMP/apps/frontend/src/pages/KpiPage.tsx)
- [`apps/frontend/src/pages/LeaderboardPage.tsx`](/workspaces/CMP/apps/frontend/src/pages/LeaderboardPage.tsx)
- [`apps/frontend/src/pages/DashboardPage.tsx`](/workspaces/CMP/apps/frontend/src/pages/DashboardPage.tsx)
- mutation pages that change KPI-driving data:
  - [`apps/frontend/src/pages/EventAttendancePage.tsx`](/workspaces/CMP/apps/frontend/src/pages/EventAttendancePage.tsx)
  - [`apps/frontend/src/pages/ClubDetailPage.tsx`](/workspaces/CMP/apps/frontend/src/pages/ClubDetailPage.tsx)
  - achievement-related pages/components

**Tasks**

- Add React Query polling to KPI and dashboard queries.
- Recommended polling baseline:
  - dashboard counters: `15_000` to `30_000`
  - KPI tables/charts: `30_000`
  - `refetchOnWindowFocus: true`
- Standardize invalidation after KPI-relevant mutations:
  - attendance check-in
  - manual attendance
  - achievement create/delete
  - membership join
  - membership approval/decline
  - club create/update
  - KPI compute
- Add a small shared helper such as `invalidateKpiQueries(queryClient)` so all related views stay in sync.

**Recommended note**

For this fix, "real time" should mean automatic refresh within seconds and immediate refresh after user actions. True push-based live updates can be a later enhancement if needed.

### 5. Expand The KPI Surface With Useful Graph Types

Use the chart design examples under [`neo/src/examples/ui/chart`](/workspaces/CMP/neo/src/examples/ui/chart) and the registry in [`neo/src/data/charts.ts`](/workspaces/CMP/neo/src/data/charts.ts) as the design source.

copy from neo to my own project files

**Recommended KPI cards**

- Total members
- Total students
- Total clubs
- Total published events
- Total attendances
- Total achievements
- Active memberships
- Average attendance per event

**Recommended graphs**

- `Members over time` using an area or line chart
  - Neo references: `chart-area-default`, `chart-line-default`, `chart-line-interactive`
- `Attendance vs achievements vs members by club` using grouped or stacked bars
  - Neo references: `chart-bar-multiple`, `chart-bar-stacked`
- `Student engagement leaderboard` using horizontal bars
  - Neo references: `chart-bar-horizontal`, `chart-bar-label`
- `Membership status breakdown` using donut/pie
  - Neo references: `chart-pie-donut`, `chart-pie-donut-text`, `chart-pie-legend`
- `Semester trend` using interactive area/line charts
  - Neo references: `chart-area-interactive`, `chart-line-multiple`
- `Attendance by month` using line/area
  - Neo references: `chart-area-linear`, `chart-line-step`
- `Top clubs vs all-zero clubs` using labeled bars
  - Neo references: `chart-bar-label`, `chart-bar-active`

**Zero-data rule for every graph**

- if there is no data yet, still render the graph shell
- use zeroed series with category labels intact
- never remove the card just because all values are zero

### 6. Add Backend Support For Stable Graph Shapes

**Likely files**

- [`apps/backend/src/models/kpi.model.ts`](/workspaces/CMP/apps/backend/src/models/kpi.model.ts)
- [`apps/backend/src/controllers/kpi.controller.ts`](/workspaces/CMP/apps/backend/src/controllers/kpi.controller.ts)

**Tasks**

- Return consistent metric keys in the same order for club summaries.
- For pie charts, return a normalized shape the frontend can map safely even when total is `0`.
- Consider adding lightweight aggregate endpoints for dashboard KPIs instead of forcing the frontend to stitch together several independent calls.
- If needed, add a dedicated endpoint for live dashboard stats, for example:
  - total clubs
  - total students
  - total members
  - total published events
  - total attendances

**Why this matters**

Stable backend shapes make the frontend much simpler and prevent chart-specific empty-state bugs from coming back.

### 7. Testing And Verification

**Backend tests**

- leaderboard returns all clubs even when `kpi_metrics` is empty
- club summary returns fixed zero-valued metrics for a club with no KPI rows
- student KPI endpoint returns all students even when attendance/achievement data is empty
- semester filter still works with zero-filled results
- department filter still works with zero-filled results

**Frontend tests**

- [`apps/frontend/src/pages/KpiPage.tsx`](/workspaces/CMP/apps/frontend/src/pages/KpiPage.tsx) renders charts and rows when values are all zero
- [`apps/frontend/src/pages/LeaderboardPage.tsx`](/workspaces/CMP/apps/frontend/src/pages/LeaderboardPage.tsx) no longer falls back to `common.noData`
- [`apps/frontend/src/pages/DashboardPage.tsx`](/workspaces/CMP/apps/frontend/src/pages/DashboardPage.tsx) keeps KPI cards and mini leaderboard visible at zero
- polling refreshes values after a mocked refetch
- mutation-driven invalidation refreshes KPI queries after membership and attendance changes

**Manual smoke checks**

- new system with no KPI rows still shows all clubs at `0`
- student KPI tab lists all students at `0`
- approving a membership increases member-related KPIs after invalidation/polling
- checking in attendance changes charts without a hard refresh
- creating an achievement changes the relevant score/count after invalidation/polling
- dashboard member count updates when a new member joins

---

## Recommended Delivery Order

1. Fix backend club leaderboard/summary to include zero-value clubs.
2. Replace frontend empty-state branches with zero-state rendering.
3. Add polling and shared KPI query invalidation.
4. Update dashboard KPI sections to remain visible at zero.
5. Add the student KPI dataset and student-facing graphs/table.
6. Add tests and manual smoke verification.

This order gives you a visible improvement quickly without blocking on the student KPI extension.

---

## Done When

- KPI cards, tables, and graphs are visible even when every value is `0`.
- Club KPI views list every club, not only clubs that already have KPI rows.
- Student KPI views list every student, not only students with activity.
- Dashboard KPI sections stay visible and show zero values instead of disappearing.
- KPI screens refresh automatically after data changes and also on a short interval.
- The chart designs used for new KPI visuals align with the Neo chart examples in [`neo/src`](/workspaces/CMP/neo/src).

---

## Files Summary

| Action | File |
|---|---|
| Create | `docs/TODO/KPIfix.md` |
| Modify later | `apps/backend/src/models/kpi.model.ts` |
| Modify later | `apps/backend/src/controllers/kpi.controller.ts` |
| Modify later | `apps/backend/src/routes/kpi.routes.ts` |
| Modify later | `apps/frontend/src/api/kpi.ts` |
| Modify later | `apps/frontend/src/api/clubs.ts` |
| Modify later | `apps/frontend/src/pages/KpiPage.tsx` |
| Modify later | `apps/frontend/src/pages/LeaderboardPage.tsx` |
| Modify later | `apps/frontend/src/pages/DashboardPage.tsx` |
