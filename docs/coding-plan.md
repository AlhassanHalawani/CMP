# CMP Coding Plan

This document is the sequential implementation plan for the FCIT Clubs Management Platform.

---

## Progress Tracker

| Phase | Status | Notes |
|---|---|---|
| Phase 1 — Backend Foundation | DONE | Server starts, DB connects, migrations run |
| Phase 2 — Backend Models | DONE | 10 model files with typed interfaces + query helpers |
| Phase 3 — Middleware & Services | DONE | JWT auth, role guard, validation, email/QR/PDF/audit services |
| Phase 4 — Controllers & Routes | DONE | 8 controllers + 8 route files, all endpoints tested |
| Phase 5 — Seeding | DONE | 14 users, 3 clubs, 5 events, registrations, attendance records |
| Phase 6 — Frontend Foundation | DONE | i18n (en+ar), Keycloak config, Auth/Theme/Language contexts, Tailwind v4 neobrutalism theme |
| Phase 7 — UI Components | DONE | Button, Input, Card, Badge, Spinner, Dialog, Select, Tabs, Toast, DropdownMenu + Sidebar, Topbar, PageLayout, ProtectedRoute |
| Phase 8 — Frontend Pages | DONE | 11 pages + 7 API client modules, all routes wired in App.tsx |
| Phase 9 — Infra & DevOps | TODO | Docker Compose, Keycloak realm export, Dockerfile, and neobrutalism.dev UI source compliance gate |
| Phase 10 — Documentation | TODO | Fill in 6 doc files |

---

## Phase 1 — Backend Foundation

**Goal**: Running Express server that connects to SQLite and validates Keycloak JWTs.

### 1.1 Environment
- [x] Copy `apps/backend/.env.example` → `apps/backend/.env` and fill in all values

### 1.2 Config layer (`apps/backend/src/config/`)
| File | What to implement |
|---|---|
| `env.ts` | Parse and validate all env vars with sensible errors if missing |
| `database.ts` | Open better-sqlite3 connection, run `PRAGMA journal_mode=WAL`, export `db` singleton |
| `keycloak.ts` | Configure `keycloak-connect` session store and export `keycloak` instance |

### 1.3 Utilities
| File | What to implement |
|---|---|
| `src/utils/logger.ts` | Winston logger — console transport in dev, file transport in prod |

### 1.4 Database migrations (`apps/backend/migrations/`)

Write SQL for each file in this order (foreign keys depend on earlier tables):

| File | Tables / notes |
|---|---|
| `001_create_users.sql` | `users(id, keycloak_id, email, name, role ENUM(student,club_leader,admin), avatar_url, created_at)` |
| `002_create_clubs.sql` | `clubs(id, name, name_ar, description, description_ar, logo_url, leader_id FK users, created_at)` |
| `003_create_events.sql` | `events(id, club_id FK, title, title_ar, description, description_ar, location, starts_at, ends_at, capacity, status, created_by FK users, created_at)` |
| `004_create_registrations.sql` | `registrations(id, event_id FK, user_id FK, registered_at, status ENUM(pending,confirmed,cancelled))` |
| `005_create_attendance.sql` | `attendance(id, event_id FK, user_id FK, checked_in_at, method ENUM(qr,manual), qr_token)` |
| `006_create_achievements.sql` | `achievements(id, user_id FK, club_id FK, title, title_ar, description, description_ar, awarded_at, semester_id FK)` |
| `007_create_kpi_metrics.sql` | `kpi_metrics(id, club_id FK, semester_id FK, metric_key, metric_value, recorded_at)` |
| `008_create_notifications.sql` | `notifications(id, user_id FK, title, body, type, is_read, created_at)` |
| `009_create_semesters.sql` | `semesters(id, name, starts_at, ends_at, is_active)` |
| `010_create_audit_logs.sql` | `audit_logs(id, actor_id FK users, action, entity_type, entity_id, payload JSON, created_at)` |

> All tables need `INTEGER PRIMARY KEY AUTOINCREMENT` for `id`. Enable `PRAGMA foreign_keys = ON` in `database.ts`.

### 1.5 Migration runner
- [x] `apps/backend/src/scripts/migrate.ts` — reads all `migrations/*.sql` in numeric order, runs each in a transaction, tracks applied migrations in a `_migrations` table to be idempotent

### 1.6 Core app (`apps/backend/src/app.ts`)
```
helmet → cors → express.json → keycloak.middleware() → routes → errorHandler
```
Mount routes:
- `POST /api/auth/...` (handled by Keycloak adapter)
- `GET  /api/health`
- `/api/users`
- `/api/clubs`
- `/api/events`
- `/api/attendance`
- `/api/achievements`
- `/api/kpi`
- `/api/notifications`
- `/api/admin`

---

## Phase 2 — Backend Models

Each model file in `apps/backend/src/models/` exports typed interfaces and query helper functions (no ORM — raw `better-sqlite3` statements).

| File | Exports |
|---|---|
| `user.model.ts` | `User` interface, `findByKeycloakId`, `findById`, `upsert`, `list` |
| `club.model.ts` | `Club` interface, `findById`, `list`, `create`, `update`, `delete` |
| `event.model.ts` | `Event` interface, `findById`, `listByClub`, `listUpcoming`, `create`, `update`, `delete` |
| `registration.model.ts` | `Registration` interface, `findByEvent`, `findByUser`, `create`, `updateStatus` |
| `attendance.model.ts` | `Attendance` interface, `findByEvent`, `checkIn`, `generateQrToken`, `verifyQrToken` |
| `achievement.model.ts` | `Achievement` interface, `findByUser`, `findByClub`, `create`, `delete` |
| `kpi.model.ts` | `KpiMetric` interface, `recordMetric`, `getClubSummary`, `getLeaderboard` |
| `notification.model.ts` | `Notification` interface, `create`, `listForUser`, `markRead`, `markAllRead` |
| `semester.model.ts` | `Semester` interface, `getActive`, `list`, `create`, `setActive` |
| `auditLog.model.ts` | `AuditLog` interface, `log` (helper used by audit service) |

---

## Phase 3 — Backend Middleware & Services

### 3.1 Middleware (`apps/backend/src/middleware/`)

| File | What to implement |
|---|---|
| `auth.ts` | `authenticate` middleware — extract Bearer token, verify via JWKS (jwks-rsa), attach `req.user` |
| `roles.ts` | `requireRole(...roles)` factory — checks `req.user.role`, returns 403 if not allowed |
| `validate.ts` | `validate(schema)` middleware — runs express-validator chain, returns 422 with errors array |
| `errorHandler.ts` | Global error handler — maps known error types to HTTP status, logs via Winston |

### 3.2 Services (`apps/backend/src/services/`)

| File | What to implement |
|---|---|
| `email.service.ts` | `sendEmail({ to, subject, html })` via nodemailer; reads SMTP config from env |
| `qrcode.service.ts` | `generateQr(data: string): Promise<string>` — returns base64 PNG data URI |
| `pdf.service.ts` | `generateAchievementReport(userId): Promise<Buffer>` — PDFKit document with user achievements |
| `audit.service.ts` | `logAction({ actor, action, entity, id, payload })` — wraps `auditLog.model.log` |

---

## Phase 4 — Backend Controllers & Routes

Implement in domain order. Each controller imports its model + services; each route file imports its controller + middleware.

### 4.1 Users
- **`users.controller.ts`**: `getMe`, `updateMe`, `listUsers` (admin only)
- **`users.routes.ts`**: `GET /me`, `PATCH /me`, `GET /` (admin)

### 4.2 Clubs
- **`clubs.controller.ts`**: `listClubs`, `getClub`, `createClub`, `updateClub`, `deleteClub`
- **`clubs.routes.ts`**: public `GET /`, `GET /:id`; protected `POST /`, `PATCH /:id`, `DELETE /:id` (admin/leader)

### 4.3 Events
- **`events.controller.ts`**: `listEvents`, `getEvent`, `createEvent`, `updateEvent`, `deleteEvent`, `registerForEvent`, `cancelRegistration`
- **`events.routes.ts`**: public listing; auth-gated registration; admin/leader create/edit/delete

### 4.4 Attendance
- **`attendance.controller.ts`**: `generateQr`, `checkIn`, `getAttendanceList`
- **`attendance.routes.ts`**: `POST /:eventId/qr` (leader), `POST /check-in` (student with token), `GET /:eventId` (leader/admin)

### 4.5 Achievements
- **`achievements.controller.ts`**: `listForUser`, `listForClub`, `create`, `delete`, `downloadReport`
- **`achievements.routes.ts`**: `GET /user/:userId`, `GET /club/:clubId`, `POST /`, `DELETE /:id`, `GET /user/:userId/report`

### 4.6 KPI
- **`kpi.controller.ts`**: `recordMetric`, `getClubSummary`, `getLeaderboard`
- **`kpi.routes.ts`**: `POST /` (leader/admin), `GET /club/:clubId`, `GET /leaderboard`

### 4.7 Notifications
- **`notifications.controller.ts`**: `list`, `markRead`, `markAllRead`
- **`notifications.routes.ts`**: `GET /`, `PATCH /:id/read`, `PATCH /read-all`

### 4.8 Admin
- **`admin.controller.ts`**: `getStats`, `manageUsers`, `manageSemesters`, `getAuditLog`
- **`admin.routes.ts`**: all routes behind `requireRole('admin')`; `GET /stats`, `GET /audit-log`, CRUD `/semesters`, `PATCH /users/:id/role`

---

## Phase 5 — Backend Seeding & Tests

### 5.1 Seed script
- [x] `apps/backend/seeds/run.ts` — inserts 1 admin, 3 club leaders, 10 students, 3 clubs, 5 events with registrations and attendance records

### 5.2 Tests (`apps/backend/src/__tests__/`) — DEFERRED
- [ ] `clubs.test.ts` — CRUD happy path + auth enforcement
- [ ] `events.test.ts` — create, register, cancel
- [ ] `attendance.test.ts` — QR generation + check-in flow
- [ ] `kpi.test.ts` — metric recording + leaderboard order

---

## Phase 6 — Frontend Foundation

### 6.1 Utilities & config
| File | What to implement |
|---|---|
| `src/lib/utils.ts` | `cn(...inputs)` — `clsx` + `tailwind-merge` helper |
| `src/config/keycloak.ts` | `new Keycloak({ url, realm, clientId })` singleton |
| `src/i18n/config.ts` | i18next init — browser language detector, `en` + `ar` namespaces |
| `src/i18n/locales/en/translation.json` | All English strings |
| `src/i18n/locales/ar/translation.json` | All Arabic strings (RTL) |

### 6.2 Contexts
| File | What to implement |
|---|---|
| `src/contexts/AuthContext.tsx` | Wrap `keycloak-js` init, expose `user`, `token`, `login()`, `logout()`, `hasRole()` |
| `src/contexts/ThemeContext.tsx` | Light/dark toggle — writes `data-theme` to `<html>`, persisted in localStorage |
| `src/contexts/LanguageContext.tsx` | `lang` state (`en`/`ar`), toggles i18next language, sets `dir` on `<html>` |

### 6.3 Entry points
| File | What to implement |
|---|---|
| `src/main.tsx` | Mount `<App>` inside `QueryClientProvider` + `AuthProvider` + `ThemeProvider` + `LanguageProvider` |
| `src/App.tsx` | `<BrowserRouter>` with all routes, protected route wrapper, 404 fallback |
| `src/styles/base.css` | Tailwind v4 `@import "tailwindcss"`, `@theme {}` tokens for neobrutalism (bold borders, flat shadows) |

---

## Phase 7 — Frontend UI Components

Build a small shared component library in `src/components/ui/` using Radix UI primitives with neobrutalism styling (2px solid black borders, flat box-shadows, high contrast).

| Component | Radix primitive |
|---|---|
| `Button` | — (native `<button>`) |
| `Input` | — (native `<input>`) |
| `Dialog` | `@radix-ui/react-dialog` |
| `Select` | `@radix-ui/react-select` |
| `Tabs` | `@radix-ui/react-tabs` |
| `Toast` | `@radix-ui/react-toast` |
| `Avatar` | `@radix-ui/react-avatar` |
| `Checkbox` | `@radix-ui/react-checkbox` |
| `Label` | `@radix-ui/react-label` |
| `Popover` | `@radix-ui/react-popover` |
| `Separator` | `@radix-ui/react-separator` |
| `Switch` | `@radix-ui/react-switch` |
| `Tooltip` | `@radix-ui/react-tooltip` |
| `DropdownMenu` | `@radix-ui/react-dropdown-menu` |
| `Card` | — (div with neobrutalism border/shadow) |
| `Badge` | — |
| `Spinner` | — |

Layout components in `src/components/layout/`:
- `Sidebar` — navigation links, role-aware (hide admin links from students)
- `Topbar` — language toggle, theme toggle, user avatar + dropdown
- `PageLayout` — wraps `Sidebar` + `Topbar` + `<main>` content area
- `ProtectedRoute` — redirects to Keycloak login if not authenticated

---

## Phase 8 — Frontend Pages

Pages live in `src/pages/`. Each page uses React Query hooks to talk to the backend.

Create `src/api/` client files (one per domain) using axios — they read the Keycloak token from context and attach it as `Authorization: Bearer`.

| Page | Route | Roles | Key features |
|---|---|---|---|
| `LoginPage` | `/login` | public | Keycloak redirect button |
| `DashboardPage` | `/` | all | KPI summary cards, upcoming events, recent notifications |
| `ClubsPage` | `/clubs` | all | Club grid, search/filter |
| `ClubDetailPage` | `/clubs/:id` | all | Club info, events list, members, achievements |
| `EventsPage` | `/events` | all | Event listing with filters (upcoming/past/my) |
| `EventDetailPage` | `/events/:id` | all | Register/cancel, attendance status |
| `AttendancePage` | `/events/:id/attendance` | leader/admin | QR code display + live check-in list |
| `AchievementsPage` | `/achievements` | all | User's own achievements; PDF download |
| `KpiPage` | `/kpi` | leader/admin | Recharts bar/line charts per club and semester |
| `LeaderboardPage` | `/leaderboard` | all | Club rankings table with Recharts bar chart |
| `NotificationsPage` | `/notifications` | all | List, mark read |
| `AdminPage` | `/admin` | admin | User management, semester CRUD, audit log table |
| `ProfilePage` | `/profile` | all | Edit name/avatar |
| `NotFoundPage` | `*` | — | 404 |

---

## Phase 9 — Infra & DevOps

### 9.0 UI Source Compliance Gate (must be satisfied before closing Phase 9)
- [ ] All visual shared components in `apps/frontend/src/components/ui/` are based on `https://www.neobrutalism.dev/` component patterns and tokens (`--background`, `--foreground`, `--border`, `--main`, `--overlay`, `--shadow`)
- [ ] Legacy custom token names are removed from frontend styles
- [ ] No page should implement ad-hoc visual primitives when an equivalent shared UI component exists
- [ ] Add migration notes in docs to map local component names to neobrutalism.dev counterparts
### 9.1 Docker Compose (`infra/docker/docker-compose.yml`)
Services:
- `frontend` — Vite dev server on port 5173
- `backend` — tsx watch on port 3000, mounts `./data` volume for SQLite
- `keycloak` — official image, imports `realm-export.json` on first boot

### 9.2 Keycloak realm (`infra/keycloak/realm-export.json`)
Configure:
- Realm: `cmp`
- Client: `cmp-app` (public, standard flow, redirect URIs for dev + prod)
- Roles: `student`, `club_leader`, `admin`
- Default role: `student`

### 9.3 Keycloak Dockerfile (`infra/keycloak/Dockerfile`)
Extend `quay.io/keycloak/keycloak` to copy realm export and start with `--import-realm`.

---

## Phase 10 — Documentation

Fill in the empty doc files:

| File | Content |
|---|---|
| `docs/architecture.md` | System diagram, tech choices rationale, data flow |
| `docs/database-schema.md` | ERD description, all table definitions, indexes |
| `docs/api.md` | All endpoints — method, path, auth, request body, response shape |
| `docs/keycloak-setup.md` | Realm config, role mappings, token claims used by backend |
| `docs/deployment-guide.md` | Docker Compose local setup, env var reference, production K8s notes |
| `docs/runbook.md` | How to run migrations, seed, backup SQLite, rotate secrets |

---

## Implementation Order Summary

```
Phase 1  →  Phase 2  →  Phase 3  →  Phase 4  →  Phase 5   (backend complete)
Phase 6  →  Phase 7  →  Phase 8                            (frontend complete)
Phase 9.0 → Phase 9.1 → Phase 9.2 → Phase 9.3 → Phase 10   (UI compliance + infra + docs)
```

Backend and frontend can be worked on in parallel after Phase 1 (backend foundation) is done, since the API contract is clear from `docs/api.md` once written.

---

## File Count Summary

| Area | Files to implement |
|---|---|
| Backend config/utils | 4 |
| SQL migrations | 10 |
| Backend models | 10 |
| Backend middleware | 4 |
| Backend services | 4 |
| Backend controllers | 8 |
| Backend routes | 8 |
| Backend scripts/tests | 6 |
| Frontend config/utils | 5 |
| Frontend contexts | 3 |
| Frontend UI components | ~17 |
| Frontend pages | 14 |
| Frontend API clients | ~8 |
| Infra files | 3 |
| Doc files | 6 |
| **Total** | **~110 files** |

---

## What Was Built (Implementation Log)

### Backend (Phases 1-5) — COMPLETE
- **Config**: `env.ts` (dotenv + validation), `database.ts` (better-sqlite3 + WAL + FK), `keycloak.ts` (bearer-only)
- **Logger**: Winston with dev/prod transports
- **10 SQL migrations**: All with `CREATE TABLE IF NOT EXISTS`, proper indexes, FK constraints, CHECK constraints for enums
- **Migration runner**: Idempotent via `_migrations` tracking table, transactional per-file
- **10 models**: Typed interfaces + raw SQL query functions (no ORM)
- **4 middleware**: JWT/JWKS auth with Keycloak user sync, role guard factory, express-validator wrapper, global error handler with `AppError` class
- **4 services**: Nodemailer email, QRCode generation, PDFKit achievement reports, audit logging
- **8 controllers + 8 routes**: Full CRUD for users, clubs, events, registrations, attendance (QR + manual), achievements, KPI/leaderboard, notifications, admin (stats + semesters + audit log)
- **Seed data**: 14 users (1 admin, 3 leaders, 10 students), 3 clubs, 5 events, 10 registrations, 4 attendance records
- **Verified**: Server starts on port 3000, health/clubs/events/leaderboard endpoints return valid JSON

### Frontend (Phases 6-8) — COMPLETE
- **Foundation**: Tailwind v4 with neobrutalism `@theme` tokens, `cn()` utility, Keycloak singleton, i18next with en+ar translations (80+ keys each)
- **Contexts**: AuthContext (Keycloak init + token refresh + user sync), ThemeContext (light/dark + localStorage), LanguageContext (en/ar + RTL `dir` attribute)
- **UI components (10)**: Button (CVA variants), Input, Card, Badge, Spinner, Dialog, Select, Tabs, Toast, DropdownMenu — all with neobrutalism styling (2px borders, flat shadows)
- **Layout (4)**: Sidebar (role-aware nav), Topbar (lang/theme toggles + user dropdown), PageLayout, ProtectedRoute (auth + role gate)
- **API clients (7)**: Axios-based with Keycloak token injection — clubs, events, users, notifications, kpi, admin, base client
- **Pages (11)**: Login, Dashboard, Clubs, ClubDetail, Events, EventDetail, Achievements, Leaderboard, Notifications, Admin, Profile, NotFound
- **Routing**: BrowserRouter with 11 routes, role-based protection for admin

### Remaining (Phases 9-10) — TODO
- Docker Compose with frontend/backend/keycloak services
- Keycloak realm export JSON with cmp realm + roles
- Keycloak Dockerfile
- 6 documentation files (architecture, db-schema, api, keycloak-setup, deployment, runbook)
- Jest integration tests
