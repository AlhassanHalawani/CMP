# Signup Feature Plan (Email Domain Restricted)

## Goal
Add a signup flow that allows account creation only for:
- `@stu.kau.edu.sa`
- `@kau.edu.sa`

## Scope
- Frontend signup page and form validation.
- Backend signup endpoint, validation, and account creation flow.
- Email verification flow.
- Keycloak/user sync integration with existing auth model.

## Assumptions
- Existing login/auth is Keycloak-based.
- Backend can call Keycloak Admin API (or equivalent) to create users.
- SMTP/email service exists (or can be reused) for verification emails.

## Functional Requirements
1. User can sign up with `name`, `email`, `password`, `confirmPassword`.
2. Signup is rejected unless email domain is exactly one of:
   - `stu.kau.edu.sa`
   - `kau.edu.sa`
3. Email must be verified before account is activated.
4. Duplicate email signup is rejected with clear error.
5. Successful signup shows clear next step: check email for verification link.

## Non-Functional Requirements
- Server-side validation is authoritative.
- Rate limit signup and verification endpoints.
- Use generic error messages where needed to reduce enumeration risk.
- Log signup attempts and failures for audit.

## Architecture Plan

### Frontend
- Add `SignupPage` with route: `/signup`.
- Add link on `LoginPage` to `/signup`.
- Form validation:
  - Required fields.
  - Password policy (minimum length + basic complexity).
  - Confirm password match.
  - Allowed domain check (client-side for UX only).
- Submit to backend endpoint `/api/auth/signup`.
- Show success state: “Verification email sent.”

### Backend
- Add auth routes:
  - `POST /api/auth/signup`
  - `GET /api/auth/verify-email?token=...` (or `POST`)
  - Optional: `POST /api/auth/resend-verification`
- Validation rules:
  - Normalize email: trim + lowercase.
  - Parse domain and allow only exact matches from allowlist.
  - Reject disposable/invalid formats.
- Account creation:
  - Create user in Keycloak as disabled/unverified (or required action verify-email).
  - Create local user record with default role `student` after successful creation.
- Verification:
  - Generate signed short-lived token (JWT/opaque).
  - On verify, mark email verified / activate account.

### Config
- Add env vars:
  - `ALLOWED_SIGNUP_EMAIL_DOMAINS=stu.kau.edu.sa,kau.edu.sa`
  - `SIGNUP_VERIFICATION_TTL_MINUTES=30`
  - Email sender and template config.

## Validation Logic (Server)
- Accept email only if:
  - `emailNormalized.split('@')[1]` is exactly in allowlist.
- Reject:
  - Subdomains like `x.stu.kau.edu.sa`
  - Similar domains like `kau.edu.sa.evil.com`

## Data/Model Changes
- If needed, extend local `users` with:
  - `email_verified` boolean
  - `verification_sent_at` datetime
  - `created_via` enum (`signup`, `admin`, etc.)

## Security Plan
- Rate limit by IP and email on signup/verify.
- Hash passwords only in identity provider layer (Keycloak); backend should not persist plaintext.
- Use one-time verification tokens; invalidate after use/expiry.
- Add CSRF protection strategy if cookie-based endpoints are used.

## UX Plan
- Signup form labels and error messages.
- Inline domain hint: “Use your KAU academic/staff email.”
- Error examples:
  - “Only @stu.kau.edu.sa and @kau.edu.sa emails are allowed.”
  - “Email already in use.”
- Success page after verify: “Email verified. You can now sign in.”

## Testing Plan
- Unit tests:
  - Domain validator positive/negative cases.
  - Payload validation.
- API integration tests:
  - Signup success/fail cases.
  - Duplicate email.
  - Verification token valid/expired/used.
- UI tests:
  - Form validation behavior.
  - Success and error states.

## Rollout Plan
1. Implement backend validation + endpoints.
2. Implement frontend signup page + route.
3. Add email verification and templates.
4. Deploy to staging and test with both allowed domains.
5. Deploy to production behind feature flag if needed.

## Acceptance Criteria
- Non-allowed email domains cannot register.
- Allowed domains can register and receive verification email.
- Unverified users cannot login (or are forced to verify).
- Verified users can login and are assigned default `student` role.

## Open Decisions
1. Should signup be implemented via custom backend endpoint or Keycloak hosted registration page with domain restrictions?
2. Should verification be mandatory before first login?
3. Do we auto-assign `student` role on signup, or map role from Keycloak group defaults?
