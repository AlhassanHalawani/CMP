# Dashboard And KPI Bug Fix Plan

## Goal

Fix the currently reported dashboard, sidebar, achievements, and KPI presentation bugs in a phased order that another AI can execute safely without re-exploring the repo.

## What I Found In The Current Code

- `apps/frontend/src/pages/DashboardPage.tsx` renders only `Welcome back, {user?.name}` and does not show the database role beside the greeting.
- `apps/frontend/src/hooks/useCurrentUser.ts` and `apps/frontend/src/api/users.ts` already expose the authoritative backend user record, including `role` and `avatar_url`.
- `apps/frontend/src/components/layout/Sidebar.tsx` renders only header + nav content. It does not use the available `SidebarFooter`, and it has no profile block at the bottom.
- `apps/frontend/src/pages/DashboardPage.tsx` uses a Recharts `AreaChart`, but the series is drawn from sparse traffic rows and the `<Area>` components do not set a smoothing type. The graph therefore looks angular instead of close to the reference image.
- `apps/backend/src/models/pageView.model.ts` returns only dates that already have page views. Missing days are not zero-filled, which makes the traffic graph jump between uneven points.
- `apps/frontend/src/pages/AchievementsPage.tsx` only loads:
  - the current user's achievements
  - the owned club's achievements for club leaders
- `apps/frontend/src/pages/AchievementsPage.tsx` has no admin/global view for student achievements and club achievements, so an admin can see `No data available` even when other users or clubs do have achievements.
- `apps/frontend/src/pages/KpiPage.tsx` uses a `PieChart` for `attendance_count`, `achievement_count`, `member_count`, and `total_score`. That chart is misleading because those metrics are not parts of one whole, and `total_score` is a derived value.
- `apps/frontend/src/pages/KpiPage.tsx` also renders raw metric keys like `attendance_count` instead of human-friendly labels.

## Local Data Warning

The local SQLite database in `apps/backend/data/cmp.db` currently contains:

- `achievements = 0`
- `memberships = 0`
- `attendance = 4`
- `clubs = 3`

That means the local repo does not currently contain achievement rows to prove the Achievements bug end-to-end. If the real environment has achievements, Phase 0 should first confirm whether the app is pointed at a different database or seeded dataset.

## AI Execution Rules

- Complete one phase at a time.
- Verify each phase before moving on.
- Do not redesign unrelated pages.
- Prefer role-aware fixes over one-size-fits-all UI shortcuts.
- Reuse the existing component system instead of adding a second sidebar/profile pattern.

## Phase 0 - Data And Reproduction Sanity Check

### Objective

Make sure the bug is reproduced against the intended environment before changing the UI.

### Files To Inspect

- `apps/backend/data/cmp.db`
- `apps/frontend/src/pages/AchievementsPage.tsx`
- `apps/backend/src/models/achievement.model.ts`
- `apps/backend/src/models/pageView.model.ts`

### Tasks

- Confirm which role reproduces each bug: `admin`, `student`, or `club_leader`.
- Confirm whether the target environment really contains achievements for students and clubs.
- If testing locally, add or seed at least:
  - 1 student achievement
  - 1 club achievement
  - 1 user with `avatar_url`
- Confirm the dashboard traffic chart has enough `page_views` rows to visually validate smoothing.

### Done When

- The AI can clearly say whether the reported empty Achievements state is:
  - a real UI/data-scope bug
  - local empty data
  - environment mismatch

## Phase 1 - Dashboard Greeting And Sidebar Profile Footer

### Objective

Show the user's role beside the welcome text and place a profile block with profile picture at the bottom of the sidebar.

### Main Files

- `apps/frontend/src/pages/DashboardPage.tsx`
- `apps/frontend/src/components/layout/Sidebar.tsx`
- `apps/frontend/src/hooks/useCurrentUser.ts`
- `apps/frontend/src/api/users.ts`
- `apps/frontend/src/i18n/locales/en/translation.json`
- `apps/frontend/src/i18n/locales/ar/translation.json`

### Tasks

- Update the dashboard heading so it renders:
  - `Welcome back, Alhassan`
  - `Role: Admin` or `Role: Student` or `Role: Club Leader`
- Use `currentUser.role` from the backend user record instead of relying only on Keycloak token roles for the display label.
- Add a small role formatter so `club_leader` becomes `Club Leader`.
- Add a `SidebarFooter` section to `AppSidebar`.
- In the footer, render:
  - avatar image if `avatar_url` exists
  - fallback initials if it does not
  - user name
  - email or role
  - link or button that routes to `/profile`
- Make sure the footer still behaves correctly when the sidebar is collapsed.

### Implementation Notes

- Reuse `apps/frontend/src/components/ui/avatar.tsx`.
- Keep the footer consistent with the current design system instead of copying the reference image literally.
- If needed, fetch `currentUser` in `Sidebar.tsx` directly so the footer has access to `avatar_url` and the DB role.

### Done When

- The top of the dashboard shows the user's name and formatted role.
- The bottom of the sidebar shows the user's avatar and profile entry.
- The footer stays visible in desktop layout and remains usable in collapsed mode.

## Phase 2 - Smooth The Dashboard Traffic Graph

### Objective

Make the visitor graph closer to the reference by giving it stable daily points and a smoothed curve.

### Main Files

- `apps/frontend/src/pages/DashboardPage.tsx`
- `apps/backend/src/models/pageView.model.ts`
- `apps/frontend/src/api/analytics.ts`

### Tasks

- Update `PageViewModel.getTraffic()` so it returns a complete daily series for `7d`, `30d`, and `90d`.
- Zero-fill missing dates instead of omitting them.
- In `VisitorsChart`, switch the area rendering to a smoothed curve:
  - preferred: `type="monotone"`
  - acceptable alternative: `type="natural"`
- Keep the current desktop/mobile split, but ensure the chart looks intentional rather than jagged.
- Improve x-axis date formatting so the timeline reads cleanly.
- If useful, add a legend matching the reference style.

### Important Reason

Right now the chart is not only missing smoothing. It is also missing empty dates, so the geometry itself is unstable.

### Done When

- `7d`, `30d`, and `90d` always render a full continuous timeline.
- The curve looks smooth rather than sharply triangular.
- Zero-traffic days still appear as explicit points at `0`.

## Phase 3 - Fix Achievements Visibility For Students And Clubs

### Objective

Make the Achievements page show the right data for the right role instead of only showing the current user's personal achievements.

### Main Files

- `apps/frontend/src/pages/AchievementsPage.tsx`
- `apps/frontend/src/api/achievements.ts`
- `apps/backend/src/controllers/achievements.controller.ts`
- `apps/backend/src/models/achievement.model.ts`
- `apps/backend/src/routes/achievements.routes.ts`
- `apps/frontend/src/api/users.ts`
- `apps/frontend/src/api/clubs.ts`

### Root Cause

The current page is scope-limited:

- student sees only their own achievements
- club leader sees their own achievements plus their owned club's achievements
- admin still sees only their own achievements

So if achievements exist for other users or clubs, the page can still show `No data available`.

### Tasks

- Add an authenticated achievements listing flow that supports filters such as:
  - `user_id`
  - `club_id`
  - `semester_id`
  - optional role-oriented scope
- Add role-aware UI tabs or sections:
  - `Student Achievements`
  - `Club Achievements`
  - `How to Earn`
- For `admin`, allow browsing all student achievements and all club achievements.
- For `club_leader`, keep personal achievements and owned club achievements.
- For `student`, keep personal achievements only.
- Replace `Club #id` with real club names where possible.
- Keep the current report download flow, but make sure the visible list is not limited to the report scope.

### Security Note

If new list endpoints are added, do not leave them public. The current read routes are not authenticated, and that should be reviewed before exposing broader achievement data.

### Done When

- Admin can see student achievements and club achievements when records exist.
- Club leaders can see their club's achievements.
- Students still see their own achievement history.
- The page no longer shows a false empty state just because the logged-in user has no personal achievements.

## Phase 4 - Replace The KPI Pie Chart With A Better Breakdown

### Objective

Replace the current KPI `PieChart` with a graph that actually matches the meaning of the data.

### Main Files

- `apps/frontend/src/pages/KpiPage.tsx`
- `apps/frontend/src/components/ui/chart.tsx`
- `apps/frontend/src/api/kpi.ts`

### Root Cause

The current pie chart is not suitable because:

- `attendance_count`, `achievement_count`, and `member_count` are separate counts, not slices of one total
- `total_score` is derived from other metrics, so treating it like another pie slice is misleading

### Recommended Replacement

Replace the pie with a horizontal bar chart or vertical bar chart.

Recommended display:

- chart:
  - `attendance_count`
  - `achievement_count`
  - `member_count`
- separate highlight card:
  - `total_score`

### Tasks

- Remove `PieChart`, `Pie`, and `Cell` usage from the club breakdown panel.
- Add a label map so raw keys become readable labels:
  - `Attendance`
  - `Achievements`
  - `Members`
  - `Total Score`
- Render the three primary metrics as bars.
- Keep `total_score` as a standalone badge/card so it is visible but not double-counted in the chart.
- Preserve a good zero state so clubs with no activity still show a valid chart with zero bars.

### Done When

- The KPI club breakdown no longer uses a pie chart.
- The chart communicates the three primary counts clearly.
- `total_score` is visible without being mixed into a misleading pie slice.
- Metric labels are human-readable.

## Phase 5 - Regression Pass And Acceptance Checks

### Objective

Lock in the fixes and prevent the same bugs from returning.

### Main Files

- `apps/frontend/src/pages/DashboardPage.tsx`
- `apps/frontend/src/components/layout/Sidebar.tsx`
- `apps/frontend/src/pages/AchievementsPage.tsx`
- `apps/frontend/src/pages/KpiPage.tsx`
- relevant backend test files under `apps/backend/src/tests`

### Tasks

- Add or update tests for any new backend achievements filtering.
- Manually verify the dashboard greeting for:
  - admin
  - student
  - club leader
- Manually verify the sidebar footer in:
  - expanded desktop sidebar
  - collapsed sidebar
  - smaller viewport
- Verify the visitor chart on `7d`, `30d`, and `90d`.
- Verify Achievements page behavior for all supported roles.
- Verify KPI club breakdown with:
  - populated metrics
  - all-zero metrics

### Acceptance Checklist

- Dashboard header shows `Welcome back, <name>` plus `Role: <role>`.
- Sidebar bottom contains profile entry + profile picture.
- Traffic graph is smooth and stable across ranges.
- Achievements page can show student and club achievement data when it exists.
- KPI breakdown no longer uses the pie chart.

## Suggested Execution Order

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5

## Optional Nice-To-Have Cleanup

- Update `apps/frontend/src/api/clubs.ts` type definitions so `department` is typed instead of using `any` in KPI-related UI.
- Consider adding shared formatters for user role labels and KPI metric labels so the same strings are not repeated across pages.
