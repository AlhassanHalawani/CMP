# FCIT CMP — Keycloak Setup

## Overview

CMP uses Keycloak 26.x as the identity provider. The backend creates
users via the Keycloak Admin API and validates JWT access tokens via
JWKS. The frontend uses keycloak-js for OIDC-based login.

## Realm Configuration

1. Create a realm named `cmp` (or match `KEYCLOAK_REALM`).

2. Create a **confidential** client for the backend:
   - Client ID: `cmp-app` (or match `KEYCLOAK_CLIENT_ID`)
   - Client authentication: ON
   - Service accounts roles: ON (required for Admin API access)
   - Valid redirect URIs: `http://localhost:5173/*` (dev),
     `https://your-domain.com/*` (prod)
   - Web origins: `+` (or specific origins)

3. Note the client secret from the Credentials tab and set it as
   `KEYCLOAK_CLIENT_SECRET`.

4. Assign the **realm-management** → **manage-users** role to the
   service account so the backend can create and manage users.

## Roles

Create the following realm roles in Keycloak:

| Role | Description |
|------|-------------|
| `student` | Default role for new users |
| `club_leader` | Can manage assigned club and its events |
| `admin` | Full platform access |

The backend extracts roles from `realm_access.roles` and
`resource_access.*.roles` in the JWT payload.

## User Creation (Signup)

When a user signs up via `POST /api/auth/signup`, the backend calls:

```
POST {KEYCLOAK_URL}/admin/realms/{KEYCLOAK_REALM}/users
```

The user is created with:
- `enabled: true`
- `emailVerified: true` (email verification is deferred)
- Password set as non-temporary credential

## Token Validation

The backend validates tokens using the JWKS endpoint:

```
{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs
```

Expected algorithm: RS256.
Expected issuer: `{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}`.

JWKS keys are cached with rate limiting enabled.

## Development Mode

When `NODE_ENV=development`, the auth middleware also accepts tokens
signed with `JWT_SECRET` (HS256) that contain `"dev": true` in the
payload. This allows testing without a running Keycloak instance:

```bash
# Generate a dev token (example using Node.js)
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { sub: 'dev-user', email: 'dev@stu.kau.edu.sa', name: 'Dev', dev: true,
    realm_access: { roles: ['admin'] } },
  process.env.JWT_SECRET
);
console.log(token);
"
```

## Frontend Configuration

Set the following environment variables (or accept defaults):

```env
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=cmp
VITE_KEYCLOAK_CLIENT_ID=cmp-app
```

The frontend uses `keycloak-js` to initiate the OIDC login redirect.

## Email Verification — Deferred

Email verification via Keycloak's "Verify Email" required action is
not yet enabled. Users are created with `emailVerified: true`. A
future milestone will configure Keycloak's email settings and enable
the verification required action.
