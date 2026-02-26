# FCIT CMP — Architecture

## Overview

FCIT Club Management Platform (CMP) is a bilingual (English/Arabic)
monorepo application for managing student clubs, events, attendance,
achievements, and KPIs at King Abdulaziz University's Faculty of
Computing and Information Technology.

## Repository Layout

```
CMP/
├── apps/
│   ├── frontend/        React 19 + Vite 6 + Tailwind v4
│   └── backend/         Express 4 + TypeScript + SQLite
├── docs/                Documentation
├── eslint.config.mjs    ESLint v9 flat config (shared)
└── package.json         npm workspaces root
```

Managed as an npm workspaces monorepo. Root scripts delegate to
workspaces via `--workspaces --if-present`.

## Frontend

| Concern | Technology |
|---------|------------|
| Framework | React 19, TypeScript 5.7 |
| Bundler | Vite 6 |
| Styling | Tailwind CSS v4, CVA, tailwind-merge |
| UI primitives | Radix UI |
| Routing | react-router-dom 7 |
| State/data | TanStack React Query 5, Axios |
| Auth | keycloak-js 26 (OIDC) |
| i18n | i18next + react-i18next (en, ar with RTL) |
| Charts | Recharts |
| QR | qrcode.react |

Path alias: `@/` → `src/`.

**Key directories:**

- `src/pages/` — page-level components
- `src/components/ui/` — base Radix wrappers (button, dialog, toast, …)
- `src/components/layout/` — ProtectedRoute, Sidebar, Topbar, PageLayout
- `src/api/` — Axios API client layer
- `src/contexts/` — AuthContext, ThemeContext, LanguageContext, ToastContext
- `src/config/keycloak.ts` — Keycloak JS initializer
- `src/i18n/` — locale JSON files

## Backend

| Concern | Technology |
|---------|------------|
| Runtime | Node.js 20, TypeScript 5.7 |
| Framework | Express 4 |
| Database | SQLite via better-sqlite3 (WAL mode) |
| Auth | Keycloak (JWKS verification), JWT dev tokens |
| Validation | express-validator 7 |
| Security | helmet, cors, express-rate-limit |
| Logging | Winston |
| Email | nodemailer (SMTP) |
| PDF | PDFKit |
| QR | qrcode |

**Key directories:**

- `src/routes/` — Express route definitions (9 route files)
- `src/controllers/` — request/response handlers
- `src/models/` — SQLite data-access layer (one file per table)
- `src/middleware/` — auth, roles, validate, errorHandler
- `src/services/` — audit, email, PDF, QR, Keycloak admin, **ownership**
- `src/config/` — env, database, keycloak
- `src/utils/logger.ts` — Winston config
- `migrations/` — ordered SQL migration files

**Key frontend additions:**

- `src/hooks/useCurrentUser.ts` — fetches current user's DB record (id, role) for ownership-aware UI

## Authentication Flow

1. **Signup** — `POST /api/auth/signup` creates user in Keycloak via
   admin API. Email verification is **deferred** (accounts are created
   with `emailVerified: true`).
2. **Login** — Frontend uses keycloak-js for OIDC redirect flow.
   Keycloak issues JWT access tokens.
3. **Token validation** — Backend `authenticate` middleware verifies
   tokens against Keycloak JWKS. In dev mode, tokens signed with
   `JWT_SECRET` containing `"dev": true` are also accepted.
4. **User sync** — On each authenticated request, the middleware
   upserts the token claims (sub, email, name, roles) into the local
   `users` table.

## RBAC

Three roles: `student` (default), `club_leader`, `admin`.

Roles are extracted from Keycloak realm and resource access claims.
The `requireRole()` middleware enforces role-based access.

### Ownership-based Authorization (club_leader)

Beyond role-level access, `club_leader` requests are further restricted
to resources they own. Ownership is resolved by the
`src/services/ownership.service.ts` helpers:

| Helper | Rule |
|--------|------|
| `leaderOwnsClub(userId, clubId)` | `clubs.leader_id === userId` |
| `leaderOwnsEvent(userId, eventId)` | join events→clubs; `clubs.leader_id === userId` |
| `canManageClub(user, clubId)` | admin bypass OR `leaderOwnsClub` |
| `canManageEvent(user, eventId)` | admin bypass OR `leaderOwnsEvent` |

**Ownership is NOT based on `events.created_by`** — it is always
determined by the club's `leader_id`.

Controllers enforce ownership before executing write/sensitive-read
operations, returning `403` with `{ "error": "..." }` on violation.
Admins bypass all ownership checks.

## Database

SQLite with WAL mode, foreign keys enabled, 5 s busy timeout.
Schema is managed via ordered SQL migration files in `migrations/`.
10 tables: users, clubs, events, registrations, attendance,
achievements, kpi_metrics, notifications, semesters, audit_logs.

## Audit Logging

All state-changing operations (create, update, delete) and signup
attempts are recorded in the `audit_logs` table via `logAction()`.

## Email Verification — Deferred

Email verification endpoints and flows are not yet implemented.
Current signup sets `emailVerified: true` in Keycloak immediately.
This is a known gap to be addressed in a future milestone.
