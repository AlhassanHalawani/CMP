# Codex Fix Prompt

```text
You are working in `/workspaces/CMP` on the CMP monorepo (`apps/frontend` React + TypeScript, `apps/backend` Express + TypeScript + SQLite migrations). Implement the following changes end-to-end. Do not stop at analysis or planning.

Current repo state you should account for:
- Legacy achievements are still exposed in places like `apps/frontend/src/App.tsx`, `apps/frontend/src/components/layout/Sidebar.tsx`, `apps/frontend/src/pages/AchievementsPage.tsx`, `apps/frontend/src/pages/ClubDetailPage.tsx`, `apps/backend/src/services/achievement-engine.service.ts`, `apps/backend/src/models/kpi.model.ts`, and `apps/backend/src/controllers/clubs.controller.ts`.
- XP already exists in parallel through `apps/backend/src/services/gamification.service.ts`, `xp_transactions`, attendance flow, daily questions, dashboard/profile pages, and related APIs.
- The app currently mixes achievements, badges, points, score, and XP. Clean this up so the product only uses badges and XP.
- Notifications currently support `target_url` only. Membership actions already exist through `PATCH /api/clubs/:id/members/:userId`.
- Event Twitter/X embed support does not appear to be fully wired in the live event model and UI.

Requirements

1. Remove achievements completely from the product surface.
- Remove the `/achievements` route, page, sidebar item, dead frontend imports, dead i18n copy, and legacy achievement API usage.
- Remove student achievements and club achievements as user-facing concepts.
- Keep badges and club badges only.
- If the current club-badge surface is powered by the achievement engine or achievement tables, refactor or rename the implementation so the UI and API only expose "badges" and "club badges", never "achievements".
- Do not leave orphaned pages, routes, nav items, or unused imports behind.

2. Keep leaderboard only under KPI.
- Remove the leaderboard item from the sidebar.
- Keep the leaderboard inside `apps/frontend/src/pages/KpiPage.tsx`, below the KPI content.
- If `apps/frontend/src/pages/LeaderboardPage.tsx` becomes redundant, remove the route and any dead code that only exists for that page.
- Update links and copy so users reach leaderboard content through KPI, not a separate sidebar destination.

3. Remove the points system and keep XP only.
- There must be no user-facing points system anywhere in the app.
- XP sources must be limited to:
  - attending events
  - unlocking student badges
  - answering daily questions
- Remove or disable other XP awards currently in the codebase, including:
  - `daily_login`
  - `membership_joined`
  - `profile_completed`
  - `weekly_task_completed`
  - `club_activity_participated`
- If `LoginActivityTracker` or related login-activity XP logic becomes unused after this change, remove or repurpose it cleanly.
- Replace points/score semantics with XP semantics everywhere relevant. This includes labels and backend/frontend fields currently named like `points`, `total_points`, `total_score`, and similar score-based presentation.
- If a numeric reward currently stored as `points` is still needed for badges, migrate or relabel it to XP or `xp_reward`. Do not keep "points" as a product term.
- Student badge unlock XP awarding must be idempotent via `xp_transactions.reference_key`.
- Club badges should remain as recognition for clubs, but they must not show or depend on points. If the UI currently sums badge `points` for club badges, remove that points display and replace it with a badge count or another non-points summary.
- Update APIs, controllers, models, pages, charts, exports, and translations so the app no longer refers to points.
- Keep the existing XP history and level progression experience working for students.

4. Restrict KPI and leaderboard logic so it does not depend on achievements or points.
- Remove legacy achievement-count-based scoring from KPI calculations.
- Students should rank by XP, not points.
- Clubs should use non-points KPI data only. Do not reintroduce points under another label like "score".
- If a club ranking formula is still needed, use existing non-points metrics already in the system and document the formula clearly in code.

5. Add or restore event Twitter/X embed support.
- Club leaders and admins must be able to set an optional Twitter/X post URL on an event.
- Accept only valid Twitter/X status URLs.
- Show the embedded post on the event detail page.
- If embedding fails, fall back to a normal external link instead of breaking the page.
- Update the backend model, migration, validation, frontend form, API typings, and page rendering.
- Prefer a lightweight implementation and avoid adding a large dependency unless it is clearly necessary.

6. Add actionable notifications.
- Notifications should support actions, not just `target_url`.
- For a new club membership request notification, the recipient should be able to:
  - approve directly from the notification
  - deny directly from the notification
  - or open the club members page
- Reuse the existing membership management endpoint where appropriate: `PATCH /api/clubs/:id/members/:userId`.
- Design notification action metadata cleanly, for example with a JSON column such as `actions_json`, and keep backward compatibility for existing notifications that only have `target_url`.
- Update both backend and frontend notification handling.

Implementation guidance

- Prefer a forward-only migration strategy. Remove achievements from live behavior, product copy, and public API usage, but avoid risky destructive schema changes unless they are clearly safe and required.
- Remove dead imports, routes, translations, types, and unused code after the refactor.
- Keep role-based behavior intact for admin, club leader, and student users.
- Make focused changes rather than rewriting unrelated parts of the app.
- Run targeted tests or builds after your edits and fix issues you introduced.

Likely files to inspect and update

Frontend:
- `apps/frontend/src/App.tsx`
- `apps/frontend/src/components/layout/Sidebar.tsx`
- `apps/frontend/src/pages/AchievementsPage.tsx`
- `apps/frontend/src/pages/BadgesPage.tsx`
- `apps/frontend/src/pages/LeaderboardPage.tsx`
- `apps/frontend/src/pages/KpiPage.tsx`
- `apps/frontend/src/pages/DashboardPage.tsx`
- `apps/frontend/src/pages/ClubDetailPage.tsx`
- `apps/frontend/src/pages/EventDetailPage.tsx`
- `apps/frontend/src/pages/NotificationsPage.tsx`
- `apps/frontend/src/components/events/EventFormDialog.tsx`
- `apps/frontend/src/components/app/LoginActivityTracker.tsx`
- `apps/frontend/src/api/achievements.ts`
- `apps/frontend/src/api/badges.ts`
- `apps/frontend/src/api/kpi.ts`
- `apps/frontend/src/api/clubs.ts`
- `apps/frontend/src/api/events.ts`
- `apps/frontend/src/api/notifications.ts`
- `apps/frontend/src/i18n/locales/en/translation.json`
- `apps/frontend/src/i18n/locales/ar/translation.json`

Backend:
- `apps/backend/src/services/gamification.service.ts`
- `apps/backend/src/services/badge-engine.service.ts`
- `apps/backend/src/services/achievement-engine.service.ts`
- `apps/backend/src/controllers/badges.controller.ts`
- `apps/backend/src/controllers/users.controller.ts`
- `apps/backend/src/controllers/membership.controller.ts`
- `apps/backend/src/controllers/notifications.controller.ts`
- `apps/backend/src/controllers/events.controller.ts`
- `apps/backend/src/controllers/clubs.controller.ts`
- `apps/backend/src/models/badge.model.ts`
- `apps/backend/src/models/kpi.model.ts`
- `apps/backend/src/models/event.model.ts`
- `apps/backend/src/models/notification.model.ts`
- `apps/backend/src/routes/notifications.routes.ts`
- `apps/backend/src/routes/clubs.routes.ts`
- `apps/backend/src/routes/events.routes.ts`
- `apps/backend/migrations/023_achievement_definitions.sql`
- `apps/backend/migrations/025_create_student_xp_system.sql`
- `apps/backend/migrations/027_replace_achievements_with_badges.sql`
- any new migration(s) needed for event social URLs and notification actions

Acceptance criteria

- No achievements page, route, or sidebar item remains.
- The product only exposes badges and club badges, not achievements.
- Sidebar no longer shows leaderboard.
- Leaderboard content is available through KPI only.
- No user-facing points label remains.
- XP is awarded only for event attendance, student badge unlocks, and daily questions.
- Club badges remain visible without any points display.
- KPI and leaderboard logic no longer depend on points or legacy achievement scoring.
- Events support an optional Twitter/X embed URL and render it safely.
- Membership-request notifications allow approve, deny, or navigation to the club members page.
- Relevant typecheck/tests/build commands for touched areas pass.

At the end, summarize:
- files changed
- migrations added
- tests/build commands run and results
- any assumptions you had to make, especially around badge XP values and club leaderboard ranking
```
