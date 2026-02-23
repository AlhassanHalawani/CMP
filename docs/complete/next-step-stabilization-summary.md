# Stabilization Phase — Summary

Date: 2026-02-18

## What Was Changed

### 1. Lint Pipeline

- Created `eslint.config.mjs` — ESLint v9 flat config supporting both
  frontend (React/TSX, browser globals) and backend (Node globals).
- Added `lint` script to backend `package.json`.
- Installed `@eslint/js`, `typescript-eslint`, `globals` as root
  dev-dependencies.
- Fixed one lint warning (unused catch variable in `auth.ts`).
- `npm run lint` now passes cleanly from repo root.

### 2. Integration Tests

- Created `jest.config.js` for backend with `ts-jest` preset.
- Built test infrastructure: `setup.ts` (in-memory DB factory, JWT
  token generators) and `createTestApp.ts` (Express app without
  server listen).
- Added three test suites (30 tests total):
  - **signup.test.ts** — domain restriction (accepts `stu.kau.edu.sa`
    and `kau.edu.sa`, rejects others), duplicate email (409), validation
    (missing fields, password policy), audit logging, error handling.
  - **auth-protected.test.ts** — public vs. protected routes,
    valid/invalid tokens, role enforcement.
  - **event-registration.test.ts** — happy-path register + cancel,
    non-existent event, draft event, duplicate registration, full
    capacity.
- `npm run test` runs from repo root.

### 3. Signup Hardening

- **Rate limiting:** `express-rate-limit` on `POST /api/auth/signup`
  (10 requests per IP per 15-minute window).
- **Password policy:** min 8 chars, max 128, at least 1 uppercase,
  1 lowercase, 1 digit (enforced server-side via express-validator).
- **Name validation:** max 100 characters, email normalized.
- **Consistent error shape:** all error responses include `"error"`
  string; validation 422s also include `"errors"` array.
- **Audit logging:** signup success, rejection (disallowed domain,
  duplicate email), and errors are recorded in `audit_logs` table.

### 4. Documentation

Populated all `docs/TODO/` files:

| File | Content |
|------|---------|
| `api.md` | Full API reference (28 endpoints) |
| `architecture.md` | System overview, tech stack, auth flow, RBAC |
| `database-schema.md` | All 10 tables with columns, constraints, indexes |
| `deployment-guide.md` | Install, build, run, env vars |
| `keycloak-setup.md` | Realm, client, roles, JWKS, dev mode |
| `runbook.md` | Day-to-day operations, troubleshooting |

All docs include an "Email verification is deferred" section.

## How to Run

```bash
# Install
npm install

# Lint
npm run lint

# Test
npm run test

# Build
npm run build
```

## Known Gaps

1. **Email verification** — deferred. Signup creates users with
   `emailVerified: true` in Keycloak. No verification tokens or
   flows exist yet.
2. **Frontend tests** — none. Only backend integration tests exist.
3. **Rate limit store** — in-memory (resets on restart). Not shared
   across multiple backend instances.
4. **CSRF protection** — not implemented; relies on CORS + Bearer
   tokens.
5. **Input sanitization** — limited to express-validator; no HTML
   sanitization for free-text fields.
6. **Password reset** — relies on Keycloak's built-in flow; no
   custom endpoint.

## Next Recommended Milestone

1. **Email verification** — add verification token generation,
   `POST /api/auth/verify-email` endpoint, Keycloak `emailVerified`
   flag gating, and SMTP integration.
2. **Frontend test suite** — Vitest + Testing Library for component
   and integration tests.
3. **CI/CD pipeline** — GitHub Actions workflow for lint, test, build.
4. **Production rate limiting** — Redis-backed store for
   express-rate-limit.
5. **Image upload** — avatar and club logo upload with S3 or local
   storage.
