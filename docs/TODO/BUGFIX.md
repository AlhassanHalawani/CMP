# BUGFIX Plan - Auth, Role Sync, KPI Empty States, Club Leader Permissions, and Arabic i18n

## Summary
This plan groups the reported bugs into phased work so an AI agent can execute them safely and in the right order. The first phases focus on auth/session deadlocks because they currently block signup, refresh, and permission propagation. Later phases cover empty-state chart rendering, club leader capabilities, and missing Arabic translations.

## Current Signals From The Codebase
- `apps/frontend/src/contexts/AuthContext.tsx` initializes Keycloak with `silentCheckSsoRedirectUri`, but `apps/frontend/public/silent-check-sso.html` is missing. That is a likely cause of the stuck auth bootstrap on signup and refresh.
- `apps/frontend/src/pages/SignupPage.tsx` auto-calls `register()` inside `useEffect`. In React Strict Mode this can fire more than once unless it is guarded.
- Frontend authorization currently depends on Keycloak token roles in `AuthContext`, while backend authorization depends on the local DB role in `apps/backend/src/middleware/auth.ts`.
- `apps/backend/src/controllers/users.controller.ts` updates the local DB role only. It does not update Keycloak realm roles, so another browser can keep stale permissions until the session is fully restarted.
- `apps/frontend/src/pages/KpiPage.tsx` explicitly swaps charts for `common.noData` when the dataset is empty. That matches the KPI issue you described.
- `apps/frontend/src/pages/NotificationsPage.tsx` contains hardcoded English labels and helper text for notification preferences.
- Club leader actions in the frontend are gated by `hasRole('club_leader')` and ownership checks from `useCurrentUser()`, so stale role/session data can directly block edit club, create event, and member approval flows.

## Execution Order
1. Fix auth bootstrap and refresh deadlocks.
2. Fix cross-browser role propagation and permission freshness.
3. Re-verify club leader access after role sync is stable.
4. Replace KPI empty screens with zero-state charts.
5. Complete Arabic translation coverage for notification preferences.
6. Run regression coverage for signup, refresh, roles, club leader flows, and KPI rendering.

## Phase 1 - Stabilize Auth Bootstrap And Infinite Loading
### Goal
Stop the infinite loading after signup and after refresh so users can reach the app without closing the tab.

### Likely Files
- `apps/frontend/src/contexts/AuthContext.tsx`
- `apps/frontend/src/pages/SignupPage.tsx`
- `apps/frontend/src/components/layout/ProtectedRoute.tsx`
- `apps/frontend/src/config/keycloak.ts`
- `apps/frontend/public/silent-check-sso.html` (new)

### Tasks
- Add the missing `silent-check-sso.html` asset required by Keycloak `check-sso`.
- Harden `AuthContext` so `initialized` always resolves cleanly on:
  - successful auth
  - unauthenticated `check-sso`
  - token refresh failure
  - post-signup callback edge cases
- Replace the one-shot auth bootstrap logic with explicit event handling for:
  - auth success
  - auth logout
  - token refresh success
  - token expiry / refresh failure
- Guard `SignupPage` so `register()` is triggered once per visit and does not loop under Strict Mode.
- Add a controlled fallback if Keycloak redirect fails so the page shows a recoverable error state instead of a permanent spinner.
- Verify that hard refresh on protected routes returns the user to the right screen without hanging.

### Done When
- A new user can complete signup and land on `/dashboard` without a stuck loader.
- Refreshing `/dashboard`, `/clubs/:id`, and `/events` does not freeze.
- Closing and reopening the tab is no longer required to recover the session.

## Phase 2 - Make Roles And Permissions Update Across Browsers
### Goal
When an admin changes a user role or assigns a club leader, the target user's session should refresh predictably and the UI should reflect the new permissions without the "close tab, reopen" workaround.

### Likely Files
- `apps/backend/src/controllers/users.controller.ts`
- `apps/backend/src/controllers/clubs.controller.ts`
- `apps/backend/src/services/keycloakAdmin.service.ts`
- `apps/backend/src/middleware/auth.ts`
- `apps/frontend/src/contexts/AuthContext.tsx`
- `apps/frontend/src/hooks/useCurrentUser.ts`
- `apps/frontend/src/components/layout/Sidebar.tsx`
- `apps/frontend/src/components/layout/ProtectedRoute.tsx`

### Tasks
- Choose a single source of truth for authorization and keep frontend and backend aligned.
- Recommended direction:
  - backend remains authoritative for permissions
  - frontend derives effective app permissions from `/users/me` or another backend capability payload
  - Keycloak token roles are refreshed or synchronized only as needed for session continuity
- Extend the role update flows so they do not stop at the local DB:
  - admin role change
  - club leader assignment
  - club leader reassignment and demotion
- Add Keycloak role sync helpers for grant and revoke operations if the app continues to depend on token roles.
- Refresh auth-derived frontend state when the window regains focus or when `/users/me` changes.
- Invalidate cached queries that depend on permissions after role changes:
  - current user
  - sidebar/nav visibility
  - protected route access
  - owned club/event lists
- Handle stale sessions gracefully:
  - either silently refresh token/claims
  - or show a clear "permissions updated, reloading session" path

### Done When
- Changing a user to `admin` or `club_leader` updates their visible permissions in another browser without a broken refresh cycle.
- The user can refresh the page after the role change and still enter the app normally.
- Sidebar links and protected routes reflect the new role consistently.

## Phase 3 - Restore Full Club Leader Capability
### Goal
Ensure a club leader can edit their club, create and manage events for their own club, and approve or decline club membership requests.

### Likely Files
- `apps/frontend/src/pages/ClubDetailPage.tsx`
- `apps/frontend/src/pages/EventsPage.tsx`
- `apps/frontend/src/pages/EventDetailPage.tsx`
- `apps/frontend/src/hooks/useCurrentUser.ts`
- `apps/backend/src/routes/clubs.routes.ts`
- `apps/backend/src/routes/events.routes.ts`
- `apps/backend/src/controllers/clubs.controller.ts`
- `apps/backend/src/controllers/events.controller.ts`
- `apps/backend/src/services/ownership.service.ts`

### Tasks
- Re-test club leader permissions after Phase 2 because stale role data is likely the main blocker.
- Confirm the leader can manage only clubs they own, not all clubs.
- Verify these frontend conditions:
  - edit button appears for the correct club leader
  - create event button appears when the leader owns at least one club
  - members tab appears for the owned club
- Verify these backend conditions:
  - leader can update only their own club
  - leader can create, edit, submit, and delete events only in their own club
  - leader can approve or decline members only in their own club
- Fix any remaining mismatch between:
  - token role
  - DB role
  - current user DB id
  - `clubs.leader_id`
- Add regression tests for:
  - leader of club A
  - leader of club B
  - normal student
  - admin

### Done When
- A club leader can edit their club profile.
- A club leader can create events for their club.
- A club leader can approve and decline membership requests for their club.
- A non-owner club leader cannot manage a different club.

## Phase 4 - Replace KPI "No Data" Screens With Zero-State Charts
### Goal
Always render KPI widgets and charts even when there is no data, using flat lines, zero bars, empty pies, and zero-valued summary cards instead of plain "no data" text.

### Likely Files
- `apps/frontend/src/pages/KpiPage.tsx`
- `apps/frontend/src/components/ui/chart.tsx`
- `apps/frontend/src/api/kpi.ts`
- optional backend normalization if chart payloads need consistent empty shapes

### Tasks
- Remove early return branches in KPI views that replace the chart area with `common.noData`.
- Create chart adapter helpers that normalize empty datasets into graph-friendly series.
- Define zero-state behavior per visualization:
  - leaderboard bar chart: render axes and bars at `0`
  - club breakdown chart: render categories with `0`
  - pie chart: render empty slices or a single neutral zero slice
  - tables/cards: render rows or metrics with zero values
- Add labels or captions that clarify "No activity yet" without removing the graph.
- Make sure empty-state rendering is lightweight and does not trigger avoidable re-renders.
- Check related pages that may need the same pattern:
  - leaderboard
  - reports
  - dashboard KPI summaries

### Done When
- KPI pages still show charts when the dataset is empty.
- Users can visually understand that the value is zero instead of thinking the page is broken.
- Empty analytics states remain responsive and do not flash between spinner and `noData` text.

## Phase 5 - Complete Arabic Translation For Notification Preferences
### Goal
Remove hardcoded English copy from the notification preferences page and move all strings into `en` and `ar` translations.

### Likely Files
- `apps/frontend/src/pages/NotificationsPage.tsx`
- `apps/frontend/src/i18n/locales/en/translation.json`
- `apps/frontend/src/i18n/locales/ar/translation.json`

### Tasks
- Replace hardcoded labels in `NotificationsPage` with translation keys:
  - tab labels
  - unread text
  - "Mark all read"
  - preferences intro copy
  - table headers
  - notification preference names
  - default channel labels
- Add matching Arabic translations.
- Verify layout in RTL so the preference table and labels remain readable.

### Done When
- The notification preferences page is fully translated in Arabic.
- No visible English strings remain on that page when Arabic is active.

## Phase 6 - Regression, Monitoring, And Release Safety
### Goal
Make the fixes safe to merge by locking in the reported user journeys with automated and manual checks.

### Tests To Add Or Update
- Frontend auth/session tests for signup redirect and protected route refresh.
- Backend tests for role update, leader assignment, and ownership-restricted actions.
- Frontend integration tests for:
  - role-based nav visibility
  - club leader buttons and tabs
  - KPI zero-state charts
  - Arabic notification preferences
- Manual smoke checks for:
  - signup in a fresh browser
  - refresh on protected routes
  - admin promotes another user
  - promoted user refreshes existing session
  - club leader edits club and approves member
  - KPI page with empty dataset

### Release Notes / Rollout Checks
- Clear any stale browser storage only if required by the auth fix.
- Rebuild frontend assets after adding `silent-check-sso.html`.
- If Keycloak role sync is introduced, verify service credentials and role-mapping permissions in non-dev and production environments.

## Suggested Delivery Breakdown For AI Agents
1. Agent A: Phase 1 auth bootstrap and refresh deadlock.
2. Agent B: Phase 2 role propagation and session freshness.
3. Agent C: Phase 3 club leader regression pass after role sync lands.
4. Agent D: Phase 4 KPI zero-state chart rendering.
5. Agent E: Phase 5 Arabic translation cleanup.
6. Final integration pass: Phase 6 tests and end-to-end verification.

## Success Criteria
- Signup no longer ends in an infinite loader.
- Refresh no longer traps users on a loading screen.
- Role changes take effect in other browsers without forcing users to close the tab.
- Club leaders can perform their expected management actions.
- KPI pages render useful zero-state graphs instead of a blank "no data" message.
- Notification preferences are fully localized in Arabic.
