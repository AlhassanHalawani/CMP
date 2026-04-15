# CMP Web App — Gap Analysis & Next Steps

> Audit date: 2026-04-15
> Method: product-strategy-auditor (see `docs/agents/strat agent.md`)
> Basis: full codebase scan + prior gap analysis (`docs/complete/gap-analysis.md`) + CMPv2 plan (`docs/complete/CMPv2.md`)

---

## Audit Summary

The CMP platform has a solid core: authentication, club and event CRUD, role-based access,
attendance QR check-in, KPI dashboards, admin tooling, and a basic reports layer are all
functional. Several major features were planned in prior gap analyses and migration files
exist for them — but the backend logic and frontend UI were never wired up. The result is
a platform that works but feels unfinished: notification bell that never rings, achievements
that are hardcoded on the frontend, and a CI/CD pipeline that is a placeholder.

The audit categorises every area as **Build**, **Maintain**, or **Defer/Kill** and
produces a prioritised next-step roadmap.

---

## Feature Classification

### BUILD — High Potential, Underserved

These are features the codebase is scaffolded for but never completed. They deliver
the highest user-visible impact per engineering hour.

| Feature | Why Build | Where It Lives |
|---|---|---|
| **CMP v2 Achievement Engine** | Migrations, static frontend rules, and CMPv2 plan all exist. Only the backend evaluation service and `achievement_definitions` / `achievement_unlocks` tables are missing. Students and clubs have no live recognition today. | `apps/backend/src/services/`, new migrations |
| **Email & In-App Notification Triggers** | `email.service.ts` and `NotificationModel` exist but are never called. Migration 012 added `notification_preferences`. Users never receive any alert: no event approval, no registration confirm, no membership decision. | `apps/backend/src/services/notifications.service.ts` (new) |
| **CI/CD Pipelines** | `ci.yml` and `deploy.yml` in `.github/workflows/` exist but contain only structural skeletons. No automated lint, test, or ARM64 build runs on push. The k3s cluster has no automated delivery path. | `.github/workflows/` |
| **Login Streak Tracking** | CMPv2 requires a `POST /api/users/me/login-activity` endpoint + `user_login_activity` table. This feeds the most engaging student achievements. The hook point in the frontend auth flow is already clear. | New migration + backend controller |
| **Club Logo Upload** | `logo_url` is a plain string. The admin and club leader forms have no file picker. CLAUDE.md flags this explicitly as missing. | `apps/backend/src/controllers/clubs.controller.ts`, frontend `ClubFormDialog.tsx` |

---

### MAINTAIN — Stable, Delivers Value

These features work and should not be touched unless a bug appears or a small gap closes
naturally alongside adjacent work.

| Feature | Notes |
|---|---|
| **KPI Page** (`/kpi`) | Fully functional: leaderboard, club breakdown, student rankings, semester filter, department filter, CSV/PDF export, manual KPI compute. Stable — no work needed. |
| **Admin Page** (`/admin`) | User role management, leader request approval workflow, audit log, semester management all working. The only extension worth adding is a Semester CRUD form (currently read-only). |
| **Dashboard** (`/`) | Role-specific views for admin, club leader, and student. Charts, upcoming events, leaderboard preview — all functional with 30-second polling. |
| **Attendance Reports** (`/reports`) | Date-range, club-scoped, CSV/PDF export all working. No-show detection is the only meaningful gap here (left join registrations ↔ attendance). |
| **Auth & Roles** | Keycloak OIDC in prod, HS256 dev tokens, `requireRole()` middleware, ownership service — fully hardened. No work needed. |
| **Event Approval Workflow** | Migration 011 added `submitted` and `rejected` states. Backend controllers were implemented. Frontend submit/approve/reject UI exists on `EventDetailPage`. **Verify** that the `submitted → rejected → resubmit` round-trip flow is tested end-to-end. |
| **Club Membership** | Migration 013 created `memberships`. Backend join/leave/approve endpoints exist. Frontend join/leave UI exists on `ClubDetailPage`. Mark as maintained but confirm `members_only` event enforcement is active. |

---

### DEFER / KILL — High Cost, Low Near-Term Value

These were mentioned in requirements but have disproportionate cost vs. benefit for the
current user base (a university club management platform, not a consumer product).

| Feature | Decision | Reason |
|---|---|---|
| **WhatsApp Notifications** | **Defer indefinitely** | Requires a paid WhatsApp Business API account, webhook infrastructure, phone number verification. The user base can be served adequately by email + in-app. |
| **ICS / Calendar Export** | **Defer to Phase 3** | Low discovery impact. A calendar view on EventsPage is more valuable than `.ics` file export. Add this only after calendar UI ships. |
| **Advanced Export — Multi-format achievements PDF** | **Maintain minimal** | The existing single-call PDF export is sufficient. Do not expand the PDF report surface until the achievement engine itself is live. |
| **Event Calendar Month View** | **Defer to Phase 2** | The card grid works. A full calendar view requires a calendar library and significant UX work. Do after notification and achievement work ships. |
| **No-Show Detection in Reports** | **Defer to Phase 2** | The SQL is a simple LEFT JOIN. Add it as a filter to the existing reports endpoint, but it is not blocking anything. |

---

## Gap Reference: What Was Planned vs. What Shipped

The table below cross-references `docs/complete/gap-analysis.md` with the current codebase
to show which gaps from the original analysis have been closed.

| FR | Title | Gap Analysis Status | Current Status |
|----|-------|---------------------|----------------|
| FR-001 | Student Achievement Report | Partial | Partial — PDF endpoint exists, no semester/filter params, no QR embed |
| FR-002 | Event Approval Workflow | Missing | **Closed** — migration 011, backend controllers, frontend UI all present |
| FR-003 | QR Attendance | Partial | Partial — check-in window open/close added (migration 016), finalize endpoint unclear |
| FR-004 | KPI Auto-Computation | Partial | **Closed** — `POST /api/kpi/compute` exists, CSV/PDF export added to KpiPage |
| FR-005 | Club Membership | Missing | **Closed** — migration 013, backend endpoints, frontend join/leave UI present |
| FR-006 | Auth & Authorization | Complete | Complete — no change |
| FR-007 | Event Calendar & Discovery | Partial | Partial — category added (migration 017), date filters added; calendar view still missing |
| FR-008 | Notifications | Partial | Partial — preferences migration added; triggers still never fire |
| FR-009 | Club Profile | Partial | Partial — stats shown; logo upload still missing |
| FR-010 | Attendance Report | Partial | **Closed** — ReportsPage ships date-range, club-scoped, CSV/PDF export |

---

## Prioritised Next Steps

### Step 1 — Wire Notification Triggers (1–2 days)

**Why first:** The infrastructure (service, table, migration) already exists. This is a
pure wiring task. Users currently receive zero feedback from the system.

What to do:
1. Create `apps/backend/src/services/notifications.service.ts` — a single `notify(userId, title, body, type, targetUrl?)` helper that writes an in-app record and calls `sendEmail()` when the user's preference allows it.
2. Call `notify()` in these four places:
   - `apps/backend/src/controllers/events.controller.ts` — on `approveEvent` and `rejectEvent`
   - `apps/backend/src/controllers/events.controller.ts` — on `registerForEvent` confirmation
   - Any membership approval/rejection controller — on membership status change
3. Add `GET /api/notifications/preferences` and `PATCH /api/notifications/preferences` endpoints.
4. Add a preferences toggle UI to `apps/frontend/src/pages/ProfilePage.tsx`.

Files to touch: `notifications.service.ts` (new), `events.controller.ts`, `clubs.controller.ts` (or membership controller), `notifications.routes.ts`, `ProfilePage.tsx`.

---

### Step 2 — CMP v2 Achievement Engine, Phase A: Student Achievements ()

**Why second:** AchievementsPage already renders hardcoded static rules. The CMPv2 plan
(`docs/complete/CMPv2.md`) is detailed and ready to implement. This is the highest
engagement feature in the platform.

What to do:
1. Add migration `023_achievement_definitions.sql` — creates `achievement_definitions` and `achievement_unlocks` tables.
2. Add migration `024_user_login_activity.sql` — creates `user_login_activity` table.
3. Seed `achievement_definitions` with the student rules from CMPv2 (attend_1 through attend_25, login streak milestones).
4. Add `POST /api/users/me/login-activity` — upserts today's login row, runs the evaluator.
5. Create `apps/backend/src/services/achievement-engine.service.ts` — the evaluator: given entity type + id, compute metrics, compare against active definitions, insert unlocks, return results.
6. Call the evaluator after: verified check-in, membership approval, manual achievement grant.
7. Expand `AchievementsPage.tsx` to show: total points, unlocked badges, progress to next tier.
8. Add a compact achievements summary card to `ProfilePage.tsx`.

Files to touch: 2 new migrations, `achievement-engine.service.ts` (new), `achievements.controller.ts`, `users.controller.ts`, `AchievementsPage.tsx`, `ProfilePage.tsx`.

---

### Step 3 — CI/CD Pipelines ()

**Why third:** The platform is deployed on k3s but has no automated delivery. A push to
`main` currently does nothing. This is a reliability gap that grows more painful as the
codebase grows.

What to do:
1. Complete `ci.yml` — add lint (`npm run lint`), test (`npm run test`), and build (`npm run build`) steps. Cache Node modules.
2. Complete `deploy.yml` — add ARM64 buildx steps using `scripts/build-arm64.sh`, push to GHCR, trigger `scripts/release-k3s.sh` via SSH or `kubectl rollout`.
3. Add repository secrets: `GHCR_TOKEN`, `K3S_HOST`, `K3S_SSH_KEY`.

Files to touch: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`.

---

### Step 4 — Club Logo Upload ()

**Why fourth:** Every club in the UI shows a placeholder. This is the most visible
cosmetic gap. The backend route just needs a multipart handler; the frontend needs a
file input in `ClubFormDialog.tsx`.

What to do:
1. Add `POST /api/clubs/:id/logo` — accepts `multipart/form-data`, saves to `./data/uploads/`, returns the public URL.
2. Serve uploads statically from Express (`/uploads`).
3. Add a logo file input to `apps/frontend/src/components/clubs/ClubFormDialog.tsx`.
4. Display the logo on `ClubDetailPage.tsx` and club cards.

Files to touch: `clubs.controller.ts`, `clubs.routes.ts`, `app.ts` (static middleware), `ClubFormDialog.tsx`, `ClubDetailPage.tsx`.

---

### Step 5 — CMP v2 Phase B: Club Achievements (2–3 days)

**Why fifth:** Builds directly on Phase A infrastructure. Club leaders are the most
active users and will notice the leaderboard enrichment immediately.

What to do:
1. Seed `achievement_definitions` with club rules from CMPv2 (member milestones, attendance milestones, event count milestones).
2. Create `apps/backend/src/services/club-achievement-metrics.service.ts` — computes active_member_count, published_event_count, verified_attendance_total, achievement_awards_count, avg_attendance_per_event.
3. Run the evaluator after: new membership approval, check-in recorded, new event published.
4. Add a club achievements section to `ClubDetailPage.tsx` — badges earned, progress to next milestone.
5. Update `LeaderboardPage.tsx` to show top badges alongside score.

Files to touch: `club-achievement-metrics.service.ts` (new), `achievement-engine.service.ts`, `ClubDetailPage.tsx`, `LeaderboardPage.tsx`.

---

## Effort Overview

| Step | Feature | Estimated Effort | Impact |
|---|---|---|---|
| 1 | Notification triggers | 1–2 days | High — closes a trust gap users feel immediately |
| 2 | Achievement engine Phase A | 3–5 days | High — most engaging new user feature |
| 3 | CI/CD pipelines | 0.5 days | High — reliability, unblocks safe deployment |
| 4 | Club logo upload | 1 day | Medium — visible polish |
| 5 | Achievement engine Phase B | 2–3 days | High — differentiates clubs on the leaderboard |

Total estimate: ~8–12 days of focused development to fully close the highest-impact gaps.

---

## What Not to Build Next

- **WhatsApp integration** — defer indefinitely (see above)
- **ICS / `.ics` export** — defer until after calendar view ships
- **Frontend test suite** — valuable but not urgent; add alongside CI/CD (Step 3) as a low-cost first pass with Vitest
- **No-show report filter** — low effort SQL tweak, but no user is blocked by its absence today
- **Semester CRUD in Admin** — semesters are read-only in the UI; adding create/edit is 1 day but lower impact than all of the above
