# CLAUDE.md — CMP (Clubs Management Platform)

## Project Overview

CMP is a full-stack web application for managing FCIT club operations at King Abdulaziz University. It handles event lifecycle management, QR-based attendance, achievement reports, KPI dashboards, and a club leaderboard. Deployed on a k3s cluster running on Raspberry Pi 5 nodes.

---

## Monorepo Structure

```
/workspaces/CMP/
├── apps/
│   ├── backend/          # Express REST API (Node 20 + TypeScript)
│   └── frontend/         # React 19 SPA (Vite + TypeScript + Tailwind v4)
├── infra/
│   ├── docker/           # docker-compose.yml for local dev
│   └── k8s/              # Kubernetes manifests (namespace, deployments, ingress, PVCs)
├── docs/                 # API reference, architecture, DB schema
├── scripts/              # ARM64 build + k3s release scripts
└── .github/workflows/    # ci.yml and deploy.yml (currently empty placeholders)
```

npm workspaces are declared at the root — `apps/frontend` and `apps/backend`.

---

## Common Commands

```bash
# Install all workspace dependencies (run from root)
npm install

# Local development (starts frontend, backend, Keycloak, MailHog)
docker compose -f infra/docker/docker-compose.yml up

# Run backend in watch mode (outside Docker)
npm run dev:backend

# Run frontend dev server (outside Docker)
npm run dev:frontend

# Run database migrations
npm run migrate --workspace=apps/backend

# Lint all workspaces
npm run lint

# Run tests (backend only — no frontend tests)
npm run test

# Build all workspaces
npm run build
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, Radix UI |
| Backend | Node.js 20, Express, TypeScript |
| Database | SQLite via `better-sqlite3` |
| Auth | Keycloak 26.1 (OIDC/JWT, RS256) |
| State/Fetching | TanStack React Query v5 |
| Charts | Recharts |
| i18n | i18next (English + Arabic RTL) |
| HTTP client | Axios |
| Logging | Winston |
| Testing | Jest + ts-jest + Supertest (backend only) |
| Infra | Docker, k3s, Traefik, cert-manager, Cloudflare DNS |

---

## Backend Architecture (`apps/backend/`)

**Entry point:** `src/app.ts`

**Layers:**
- `src/config/` — `env.ts` (typed env vars), `database.ts` (SQLite singleton with WAL mode)
- `src/models/` — Plain object models using `better-sqlite3` (no ORM)
- `src/controllers/` — Request handlers
- `src/routes/` — Route registration (one file per domain)
- `src/middleware/` — `auth.ts` (JWT/JWKS), `roles.ts` (`requireRole()`), `errorHandler.ts`, `validate.ts`
- `src/services/` — QR code generation, PDF reports, email (nodemailer), audit logging
- `src/utils/` — Winston logger
- `src/scripts/migrate.ts` — Migration runner (reads `migrations/*.sql` in order)

**API base path:** `/api`

**Routes:**
- `POST /api/auth/signup` — Rate-limited (10/IP/15min), domain-restricted, password policy
- `POST /api/auth/login` / `POST /api/auth/logout`
- `GET|PATCH /api/users/:id`
- `GET|POST|PATCH|DELETE /api/clubs` and `/api/clubs/:id`
- `GET|POST|PATCH|DELETE /api/events` and `/api/events/:id`
- `POST /api/events/:id/register` / `POST /api/events/:id/cancel`
- `GET /api/attendance/events/:id/attendance` / `POST /api/attendance/events/:id/checkin`
- `GET /api/achievements/users/:id` / `GET /api/achievements/certificates/:id`
- `GET /api/kpi/dashboard` / `GET /api/kpi/leaderboard`
- `GET|PATCH /api/notifications` / `PATCH /api/notifications/:id/read`
- `GET /api/health` — Health check endpoint

**Auth middleware (`src/middleware/auth.ts`):**
- Validates Bearer JWT via Keycloak JWKS (RS256) in production
- In dev mode (`NODE_ENV=development`), tokens with `{ dev: true }` in payload are verified with `JWT_SECRET` (HS256) — allows testing without Keycloak
- Upserts user into local SQLite on every authenticated request via `UserModel.upsert()`
- Attaches `req.user` (local DB user) and `req.tokenPayload` (raw JWT claims)

**Role middleware (`src/middleware/roles.ts`):**
- `requireRole(...roles)` — pass after `authenticate` on protected routes

**User roles:** `student` | `club_leader` | `admin`

---

## Frontend Architecture (`apps/frontend/`)

**Entry point:** `src/App.tsx` (React Router v7 BrowserRouter)

**Routing:** All routes except `/login` and `/signup` are wrapped in `<ProtectedRoute>`. Some routes additionally require specific roles via `<ProtectedRoute roles={[...]}>`.

**Contexts (wrap the entire app):**
- `AuthContext` — Keycloak initialization, token, user object, `hasRole()`, token auto-refresh every 30s
- `ThemeContext` — Dark/light theme
- `LanguageContext` — English/Arabic + RTL switching
- `ToastContext` — Global toast notifications

**Pages:**
```
/               DashboardPage       (authenticated)
/clubs          ClubsPage           (authenticated)
/clubs/:id      ClubDetailPage      (authenticated)
/events         EventsPage          (authenticated)
/events/:id     EventDetailPage     (authenticated)
/events/:id/attendance  EventAttendancePage  (admin, club_leader)
/achievements   AchievementsPage    (authenticated)
/leaderboard    LeaderboardPage     (authenticated)
/kpi            KpiPage             (admin, club_leader)
/notifications  NotificationsPage   (authenticated)
/admin          AdminPage           (admin only)
/profile        ProfilePage         (authenticated)
/login          LoginPage           (public)
/signup         SignupPage          (public)
```

**API clients:** `src/api/` — one Axios client per domain, attaches Bearer token from `useAuth()`

**UI components:** Radix UI primitives + `src/components/` custom domain components. Use `cn()` from `src/lib/` for class merging (clsx + tailwind-merge).

**Path alias:** `@/` maps to `src/`

---

## Database

- SQLite file at `./data/cmp.db` (configurable via `DATABASE_PATH`)
- WAL mode enabled, foreign keys ON, busy timeout 5000ms
- Migrations in `apps/backend/migrations/` numbered `001_` through `010_`
- Migration state tracked in `_migrations` table
- Run migrations: `npm run migrate --workspace=apps/backend`

**Tables:** `users`, `clubs`, `events`, `registrations`, `attendance`, `achievements`, `kpi_metrics`, `notifications`, `semesters`, `audit_logs`

**Adding a migration:** Create a new SQL file `apps/backend/migrations/NNN_description.sql` with the next sequence number.

---

## Environment Variables

Backend (`.env` in `apps/backend/`):
```
NODE_ENV=development
PORT=3000
DATABASE_PATH=./data/cmp.db

KEYCLOAK_URL=http://keycloak:8080
KEYCLOAK_REALM=cmp
KEYCLOAK_CLIENT_ID=cmp-app
KEYCLOAK_CLIENT_SECRET=change-me-in-production

JWT_SECRET=dev-secret-change-me-in-production-min-32

SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@fcit-cmp.local

ALLOWED_SIGNUP_EMAIL_DOMAINS=stu.kau.edu.sa,kau.edu.sa
```

Frontend env vars are Vite `VITE_` prefixed:
```
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=cmp
VITE_KEYCLOAK_CLIENT_ID=cmp-app
```

---

## Local Development Services

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |
| Keycloak | http://localhost:8080 (admin/admin) |
| MailHog (SMTP UI) | http://localhost:8025 |

Keycloak realm config is imported from `infra/keycloak/realm-export.json` on first startup.

---

## Testing

- Backend: Jest + ts-jest + Supertest, config in `apps/backend/jest.config.*`
- Tests are co-located under `apps/backend/tests/` (30 integration tests covering signup, auth, event registration)
- No frontend tests currently
- Run: `npm run test` (from root) or `npm run test --workspace=apps/backend`

---

## Known Gaps / Deferred Work

- `ci.yml` and `deploy.yml` GitHub Actions workflows are empty placeholders
- Email verification is deferred — signup creates users with `emailVerified: true` in Keycloak
- Rate limiting is in-memory only (not shared across k3s replicas)
- No CSRF protection (relies on CORS + Bearer tokens)
- No image upload for club logos or user avatars
- No frontend tests

---

## Production Deployment

- ARM64 Docker images built via `scripts/build-arm64.sh` (Docker buildx)
- Pushed to GHCR, rolled out via `scripts/release-k3s.sh`
- k3s cluster: 5× Raspberry Pi 5 nodes
- Ingress: Traefik + TLS via cert-manager (Let's Encrypt)
- Domains: `cmp.fcitcmp.com` (app), `keycloak.fcitcmp.com` (auth)
- SQLite data persisted via PVC (`cmp-sqlite-pvc`)
