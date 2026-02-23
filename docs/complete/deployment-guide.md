# FCIT CMP — Deployment Guide

## Prerequisites

- Node.js >= 20
- npm >= 10
- Keycloak server (26.x) with a configured realm
- (Optional) SMTP server for email notifications

## Environment Variables

Copy `.env.example` to `.env` inside `apps/backend/` and fill in
production values.

### Required

| Variable | Description |
|----------|-------------|
| `KEYCLOAK_URL` | Keycloak server URL (e.g. `https://auth.example.com`) |
| `KEYCLOAK_REALM` | Realm name (e.g. `cmp`) |
| `KEYCLOAK_CLIENT_ID` | Client ID configured in Keycloak |
| `KEYCLOAK_CLIENT_SECRET` | Client secret for the service account |
| `JWT_SECRET` | Secret for dev-mode JWT signing (min 32 chars). Not used in production token validation, but still required by config. |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Set to `production` for prod |
| `PORT` | `3000` | Backend listen port |
| `DATABASE_PATH` | `./data/cmp.db` | SQLite file path |
| `ALLOWED_SIGNUP_EMAIL_DOMAINS` | `stu.kau.edu.sa,kau.edu.sa` | Comma-separated allowed signup domains |
| `SMTP_HOST` | `localhost` | SMTP server host |
| `SMTP_PORT` | `1025` | SMTP port |
| `SMTP_USER` | `` | SMTP auth user |
| `SMTP_PASS` | `` | SMTP auth password |
| `SMTP_FROM` | `noreply@fcit-cmp.local` | Sender address |

### Frontend

Frontend env vars are set via Vite's `import.meta.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_KEYCLOAK_URL` | `http://localhost:8080` | Keycloak URL |
| `VITE_KEYCLOAK_REALM` | `cmp` | Realm name |
| `VITE_KEYCLOAK_CLIENT_ID` | `cmp-app` | Public client ID |

## Install Dependencies

```bash
npm install
```

## Database Setup

Run migrations from the backend workspace:

```bash
npm run migrate --workspace=apps/backend
```

Seed development data (optional):

```bash
npm run seed --workspace=apps/backend
```

## Build

```bash
npm run build
```

This builds both frontend (Vite) and backend (tsc) in parallel.

- Frontend output: `apps/frontend/dist/`
- Backend output: `apps/backend/dist/`

## Run

### Development

```bash
# Start backend (tsx watch)
npm run dev:backend

# Start frontend (Vite dev server with API proxy)
npm run dev:frontend
```

The Vite dev server proxies `/api` requests to `http://localhost:3000`.

### Production

```bash
cd apps/backend
NODE_ENV=production node dist/app.js
```

Serve `apps/frontend/dist/` with a static file server (e.g. nginx)
and proxy `/api` to the backend.

## Lint & Test

```bash
npm run lint     # ESLint (backend + frontend)
npm run test     # Jest (backend)
```

## Docker

Both apps include Dockerfiles supporting ARM64/multiarch builds.
Build and run per standard Docker workflows.

## Email Verification — Deferred

Email verification is not yet implemented. Signup creates accounts
with `emailVerified: true` in Keycloak. A future release will add
verification flows; at that point, SMTP configuration will become
required for signup to function correctly.
