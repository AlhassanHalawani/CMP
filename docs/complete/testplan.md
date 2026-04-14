# CMP System Test Plan

> Generated: 2026-04-05
> Scope: whole system testing strategy for `apps/backend` and `apps/frontend`
> Purpose: execution-ready plan that an AI coding agent can follow incrementally

## Goal

Build a testing system that gives fast feedback on the CMP product at four layers:

1. Backend integration tests for API behavior and authorization.
2. Backend unit tests for isolated logic and edge cases.
3. Frontend unit and component tests for UI behavior and state.
4. End-to-end smoke tests for the highest-value user journeys.

The plan below is based on the current codebase, not a generic template.

## Current Baseline

### Repo and tooling

- Root workspace test command exists in `/workspaces/CMP/package.json` as `npm test`.
- Backend test command exists in `/workspaces/CMP/apps/backend/package.json` as `jest --passWithNoTests`.
- Frontend currently has no test script and no test runner configured.
- Today, root `npm test` effectively covers backend only because frontend has no `test` script yet.

### Backend test setup that already exists

- Jest config exists at `/workspaces/CMP/apps/backend/jest.config.js`.
- Tests currently live under `/workspaces/CMP/apps/backend/src/tests/integration`.
- Shared backend test helpers already exist:
  - `/workspaces/CMP/apps/backend/src/tests/setup.ts`
  - `/workspaces/CMP/apps/backend/src/tests/createTestApp.ts`
- The current backend harness uses:
  - in-memory SQLite via `better-sqlite3`
  - mocked env and database injection
  - mocked external services where needed
  - `supertest` against an Express app instance

### Verified backend baseline

- Command run: `npm test --workspace=apps/backend -- --runInBand`
- Result: `7` suites passed, `130` tests passed
- Note: in this environment the command needed permission to open a local listener because `supertest` creates a local server internally.

### Important gaps found during the audit

- `/workspaces/CMP/apps/backend/tests/integration` and `/workspaces/CMP/apps/backend/tests/unit` exist but are empty.
- The test app in `/workspaces/CMP/apps/backend/src/tests/createTestApp.ts` does not mount all production routes.
- Production app mounts these routes that the test app currently misses:
  - `/api/notifications`
  - `/api/admin`
  - `/api/leader-requests`
- Frontend has no automated tests today:
  - no `vitest.config.*`
  - no `playwright.config.*`
  - no `__tests__` or `tests` directory

## Coverage Snapshot

| Area | Current state | Notes |
|---|---|---|
| Auth signup | Covered | Good integration coverage exists |
| Auth-protected access | Covered | Good auth and token-path coverage exists |
| Event registration and visibility | Covered | Good coverage exists |
| Ownership and role update flows | Covered | Strong integration coverage exists |
| Attendance core flow | Covered | QR, manual check-in, and list paths covered |
| Users routes | Partial | `/me`, profile update, and list behavior still need direct suites |
| Clubs routes | Partial | membership self-service, logo upload, delete, and stats need direct coverage |
| Events routes | Partial | submit, approve, reject, ICS export, categories, and calendar export need direct coverage |
| Attendance advanced flow | Partial | open, close, finalize, and club report need direct coverage |
| Achievements routes | Partial | read/report flows need direct coverage |
| KPI routes | Partial | leaderboard, club summary, students, and compute need direct coverage |
| Notifications routes | None | production route exists, not mounted in test app today |
| Admin routes | None | production route exists, not mounted in test app today |
| Leader requests routes | None | production route exists, not mounted in test app today |
| Backend services and middleware | Minimal | no dedicated unit-test layer yet |
| Frontend API, hooks, components, pages | None | no runner or suites exist yet |
| End-to-end system tests | None | no browser automation exists yet |

## Rules For AI Execution

These rules are part of the plan. Follow them on every implementation pass.

1. Never start by editing `dist/`. All testing work should target source files under `apps/*/src` and config files.
2. Keep each implementation slice small:
   - one harness improvement, or
   - one route family, or
   - one frontend page/flow, or
   - one E2E journey
3. Extend shared test helpers before creating one-off mocks in individual test files.
4. Mock only real external boundaries:
   - Keycloak
   - SMTP
   - QR generation
   - PDF generation
   - clock/time where determinism matters
5. For backend work, prefer integration tests first, then add unit tests only for isolated logic.
6. For frontend work, establish Vitest plus React Testing Library before adding Playwright.
7. Every bug fix or feature change should add at least one automated regression test.
8. Run the narrowest relevant test command first, then the broader suite.
9. Keep noisy logging out of test output where possible.
10. Do not mark a phase done until commands and exit criteria both pass.

## Phase 0 - Harden The Test Foundation

### Goal

Make the existing backend harness production-like and create the missing frontend testing foundation.

### Work items

- Update `/workspaces/CMP/apps/backend/src/tests/createTestApp.ts` so it matches `/workspaces/CMP/apps/backend/src/app.ts` route coverage as closely as possible.
- Add missing production route mounts to the test app:
  - notifications
  - admin
  - leader requests
- Centralize reusable seeding helpers in the backend test layer so future tests do not duplicate raw SQL unnecessarily.
- Add a test-safe logger strategy so passing tests do not spam console output.
- Add explicit backend test scripts if needed:
  - `test:integration`
  - `test:unit`
  - `test:coverage`
- Add frontend test stack in `/workspaces/CMP/apps/frontend`:
  - Vitest
  - React Testing Library
  - `@testing-library/jest-dom`
  - `@testing-library/user-event`
  - `jsdom`
  - MSW
- Add frontend test setup files:
  - `vitest.config.ts`
  - `src/test/setup.ts`
- Decide and implement the frontend auth testing seam:
  - component tests should mock `keycloak-js`
  - later E2E should use a dedicated test-auth mode or seeded auth state

### Deliverables

- Backend test app covers all production routers.
- Frontend can run at least one smoke test in CI/local.
- Shared test helpers exist and are the default place for future setup logic.

### Exit criteria

- Backend tests still pass after harness changes.
- Frontend has a working `npm run test --workspace=apps/frontend` command.
- At least one frontend smoke test passes.

## Phase 1 - Complete Backend Route Coverage

### Goal

Close the biggest API coverage holes before adding more infrastructure.

### Priority order

1. Routes present in production but absent from the current test harness.
2. Untested endpoints inside already-covered routers.
3. Negative-path and regression cases around authorization, validation, and state transitions.

### Suggested test files to add

- `/workspaces/CMP/apps/backend/src/tests/integration/users.test.ts`
- `/workspaces/CMP/apps/backend/src/tests/integration/clubs.test.ts`
- `/workspaces/CMP/apps/backend/src/tests/integration/events-workflow.test.ts`
- `/workspaces/CMP/apps/backend/src/tests/integration/events-export.test.ts`
- `/workspaces/CMP/apps/backend/src/tests/integration/attendance-session.test.ts`
- `/workspaces/CMP/apps/backend/src/tests/integration/achievements.test.ts`
- `/workspaces/CMP/apps/backend/src/tests/integration/kpi.test.ts`
- `/workspaces/CMP/apps/backend/src/tests/integration/notifications.test.ts`
- `/workspaces/CMP/apps/backend/src/tests/integration/admin.test.ts`
- `/workspaces/CMP/apps/backend/src/tests/integration/leader-requests.test.ts`

### Backend route backlog

#### Users

- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/users`
- direct auth and role-failure cases

#### Clubs and membership

- `GET /api/clubs`
- `GET /api/clubs/:id`
- `POST /api/clubs`
- `DELETE /api/clubs/:id`
- `GET /api/clubs/:id/stats`
- `POST /api/clubs/:id/logo`
- `POST /api/clubs/:id/join`
- `DELETE /api/clubs/:id/membership`
- `GET /api/clubs/:id/membership/me`

#### Events

- `GET /api/events/categories`
- `GET /api/events/calendar.ics`
- `GET /api/events/:id/ics`
- `POST /api/events/:id/submit`
- `POST /api/events/:id/approve`
- `POST /api/events/:id/reject`
- validation and invalid-state transitions around draft/submitted/published/rejected

#### Attendance

- `GET /api/attendance`
- `POST /api/attendance/:eventId/open`
- `POST /api/attendance/:eventId/close`
- `POST /api/attendance/:eventId/finalize`

#### Achievements

- `GET /api/achievements/user/:userId`
- `GET /api/achievements/user/:userId/report`
- `GET /api/achievements/club/:clubId`

#### KPI

- `GET /api/kpi/leaderboard`
- `GET /api/kpi/students`
- `GET /api/kpi/club/:clubId`
- `POST /api/kpi/compute`

#### Notifications

- `GET /api/notifications/preferences`
- `PATCH /api/notifications/preferences`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

#### Admin

- `GET /api/admin/stats`
- `GET /api/admin/audit-log`
- `GET /api/admin/semesters`
- `POST /api/admin/semesters`
- `PATCH /api/admin/semesters/:id/activate`
- `DELETE /api/admin/semesters/:id`

#### Leader requests

- `POST /api/leader-requests`
- `GET /api/leader-requests/mine`
- `GET /api/leader-requests`
- `PATCH /api/leader-requests/:id/approve`
- `PATCH /api/leader-requests/:id/reject`

### Exit criteria

- Every production router has at least one dedicated integration test file.
- Every endpoint has at least:
  - one happy-path test
  - one permission or auth test
  - one validation or state-failure test where applicable

## Phase 2 - Add Backend Unit Tests For Isolated Logic

### Goal

Use unit tests only where they provide faster and clearer feedback than route-level integration tests.

### Highest-value unit targets

- `/workspaces/CMP/apps/backend/src/middleware/auth.ts`
- `/workspaces/CMP/apps/backend/src/middleware/roles.ts`
- `/workspaces/CMP/apps/backend/src/middleware/validate.ts`
- `/workspaces/CMP/apps/backend/src/middleware/errorHandler.ts`
- `/workspaces/CMP/apps/backend/src/services/ownership.service.ts`
- `/workspaces/CMP/apps/backend/src/services/notifications.service.ts`
- `/workspaces/CMP/apps/backend/src/services/audit.service.ts`
- `/workspaces/CMP/apps/backend/src/jobs/event-reminders.job.ts`

### Lower-priority unit targets

- `/workspaces/CMP/apps/backend/src/services/pdf.service.ts`
- `/workspaces/CMP/apps/backend/src/services/qrcode.service.ts`
- model helper logic only if there is pure logic worth isolating

### Exit criteria

- Middleware behavior is covered without needing full route tests for every branch.
- Services with non-trivial branching have direct deterministic tests.
- Time-based reminder logic has explicit regression coverage.

## Phase 3 - Establish Frontend Unit And Component Testing

### Goal

Create fast UI feedback for auth state, data fetching, permission-based rendering, and form behavior.

### First-wave targets

- `/workspaces/CMP/apps/frontend/src/contexts/AuthContext.tsx`
- `/workspaces/CMP/apps/frontend/src/components/layout/ProtectedRoute.tsx`
- `/workspaces/CMP/apps/frontend/src/api/client.ts`
- `/workspaces/CMP/apps/frontend/src/hooks/useCurrentUser.ts`
- `/workspaces/CMP/apps/frontend/src/pages/SignupPage.tsx`
- `/workspaces/CMP/apps/frontend/src/pages/LoginPage.tsx`
- `/workspaces/CMP/apps/frontend/src/pages/NotificationsPage.tsx`
- `/workspaces/CMP/apps/frontend/src/pages/KpiPage.tsx`
- `/workspaces/CMP/apps/frontend/src/pages/ClubsPage.tsx`
- `/workspaces/CMP/apps/frontend/src/pages/EventsPage.tsx`
- `/workspaces/CMP/apps/frontend/src/components/events/EventFormDialog.tsx`
- `/workspaces/CMP/apps/frontend/src/components/clubs/ClubFormDialog.tsx`

### Frontend testing strategy

- Mock `keycloak-js` in component tests.
- Use MSW to stub backend responses.
- Assert:
  - loading states
  - success states
  - error states
  - role-based UI visibility
  - English and Arabic rendering where user-visible text matters

### Exit criteria

- AuthProvider and ProtectedRoute have direct tests for initialized vs uninitialized vs authenticated states.
- Critical pages render correctly for success, empty, and error data states.
- At least one form flow is covered with realistic user interaction.

## Phase 4 - Add End-To-End Smoke Tests

### Goal

Cover a small number of system-critical journeys across frontend and backend together.

### Recommended tool

- Playwright

### Required preparation

- Create a stable E2E auth strategy.
- Recommended approach:
  - add a test-only auth mode for the frontend, or
  - add a Playwright helper that seeds a known authenticated state
- Do not make browser tests depend on manual Keycloak interaction.

### First E2E journeys

1. Student views published events, registers, and cancels registration.
2. Club leader creates an event, submits it, and opens attendance.
3. Admin approves or rejects an event.
4. Admin changes a user role and the UI reflects the change after refresh/focus.
5. Notification page loads preferences and marks notifications read.
6. KPI and report pages load without crashing, including empty-state scenarios.

### Exit criteria

- A small smoke suite runs reliably in headless mode.
- Failures point to real regressions, not flaky auth bootstrapping.

## Phase 5 - Add Coverage Gates And CI Enforcement

### Goal

Make testing automatic and hard to bypass.

### Work items

- Add coverage commands for backend and frontend.
- Publish coverage reports in CI artifacts if available.
- Start with practical thresholds, then tighten later.

### Recommended initial gates

- Backend:
  - every router has dedicated integration coverage
  - coverage thresholds can start modestly and increase over time
- Frontend:
  - critical auth and page-shell logic covered first
  - do not enforce high global percentages before the test base exists
- E2E:
  - smoke suite required on PRs once stable

### Exit criteria

- CI runs lint plus backend tests on every PR.
- CI runs frontend unit tests once the stack exists.
- CI runs a minimal E2E smoke suite once auth is stabilized.

## AI Work Queue

Use this exact order unless a production bug forces reprioritization.

1. Make the backend test app match the production app route surface.
2. Add direct integration tests for notifications, admin, and leader requests.
3. Add direct integration tests for the remaining untested users, clubs, events, attendance, achievements, and KPI endpoints.
4. Reduce duplicated backend test setup into shared factories and helpers.
5. Add frontend test runner and first smoke test.
6. Add frontend auth, ProtectedRoute, and API client tests.
7. Add tests for critical pages and forms.
8. Add Playwright smoke coverage with a stable test-auth path.
9. Add CI coverage gates.

## Commands To Use During Execution

### Backend

- `npm test --workspace=apps/backend -- --runInBand`
- `npm test --workspace=apps/backend -- --runInBand src/tests/integration/<file>.test.ts`

### Frontend after setup

- `npm run test --workspace=apps/frontend`
- `npm run test --workspace=apps/frontend -- --watch=false`

### Whole repo

- `npm test`
- `npm run lint`

## Definition Of Done For The Whole Plan

The system testing plan is complete when all of the following are true:

- Backend production routes are all covered by automated tests.
- Backend critical services and middleware have direct unit coverage where it adds value.
- Frontend has a real unit/component test stack and coverage for critical auth and page flows.
- A reliable E2E smoke suite exists for the top user journeys.
- CI enforces the test suite so regressions are caught before merge.
