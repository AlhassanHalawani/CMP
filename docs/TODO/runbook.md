# FCIT CMP — Runbook

Operational procedures for the CMP platform.

## Starting the Application

### Development

```bash
# Install dependencies (from repo root)
npm install

# Run database migrations
npm run migrate --workspace=apps/backend

# (Optional) Seed sample data
npm run seed --workspace=apps/backend

# Start backend + frontend in separate terminals
npm run dev:backend
npm run dev:frontend
```

Backend runs on `http://localhost:3000`.
Frontend runs on `http://localhost:5173` with `/api` proxied to backend.

### Production

```bash
npm run build
cd apps/backend
NODE_ENV=production node dist/app.js
```

## Health Check

```bash
curl http://localhost:3000/api/health
# Expected: { "status": "ok", "timestamp": "..." }
```

## Running Lint

```bash
npm run lint
```

Runs ESLint v9 (flat config) on both frontend and backend workspaces.

## Running Tests

```bash
npm run test
```

Runs Jest integration tests for the backend. Tests use in-memory
SQLite and mock the Keycloak service — no external services needed.

## Building

```bash
npm run build
```

Compiles TypeScript (backend → `dist/`) and builds Vite (frontend → `dist/`).

## Database Operations

### Location

Default: `apps/backend/data/cmp.db` (override with `DATABASE_PATH`).

### Migrations

```bash
npm run migrate --workspace=apps/backend
```

Migration files are in `apps/backend/migrations/` and execute in order.

### Backup

```bash
# SQLite backup (while app is running is safe with WAL mode)
cp apps/backend/data/cmp.db apps/backend/data/cmp-backup-$(date +%Y%m%d).db
```

## Viewing Audit Logs

Admin users can view audit logs via:

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/admin/audit-log?limit=50"
```

Or directly query the database:

```bash
sqlite3 apps/backend/data/cmp.db \
  "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;"
```

## Common Issues

### "Missing required environment variable"

Ensure `apps/backend/.env` exists and contains all required variables.
See `apps/backend/.env.example` for the template.

### Keycloak connection errors

- Verify `KEYCLOAK_URL` is reachable
- Verify `KEYCLOAK_CLIENT_SECRET` matches the Keycloak client config
- Check that the service account has `manage-users` role

### Rate limiting (429 Too Many Requests)

Signup is rate-limited to 10 requests per IP per 15 minutes. If
hitting the limit during testing, wait or restart the backend to
reset the in-memory rate limit store.

### SQLite "database is locked"

WAL mode and `busy_timeout = 5000` should prevent most locking
issues. If persistent, check for long-running transactions or
external tools holding locks on the database file.

## Logs

- Development: console output (colorized)
- Production: `logs/error.log` and `logs/combined.log` (JSON format)

## Supervisor Role Provisioning

The **supervisor** role is temporarily mapped to `club_leader` permissions in the
backend RBAC system. To provision a user as a supervisor:

1. Assign the `club_leader` role in Keycloak realm roles
2. The backend `requireRole('admin', 'club_leader')` middleware will grant access
3. Frontend sidebar shows KPI and attendance management for `club_leader`

When a dedicated `supervisor` role is added in a future sprint:
- Add `'supervisor'` to the role CHECK constraint in the users table
- Update `requireRole()` calls to include `'supervisor'`
- Update frontend `hasRole()` checks
- Update Keycloak realm role mappings

## Email Verification — Deferred

Email verification is not implemented in this release. Signup creates
users with `emailVerified: true` in Keycloak immediately. No SMTP
configuration is required for signup to work. SMTP is currently only
used by the email notification service.
