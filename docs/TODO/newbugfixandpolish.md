# Student ID, Club Membership, Leadership, and Profile Polish

**Priority:** High
**Status:** Planned

---

## Summary

Fix the student identity and club-role rules across signup, profiles, attendance, admin views, and club membership.

Requested behavior:

- Student IDs must not be the internal database ids `1, 2, 3, 4...`.
- Student ID should be collected during signup.
- Pre-existing users should be able to add their Student ID in their profile.
- Manual check-in should use Student ID as the "User ID" value.
- A student can be an active member of only one club.
- A student can follow many clubs and participate in other clubs' activities.
- A club leader can lead only one club.
- Admin can view Student ID and student profiles.
- Students who have not added their Student ID should see a popup prompting them to complete their information, with a button to go to profile.

---

## Current Implementation Snapshot

### Backend

Relevant files:

- `apps/backend/migrations/001_create_users.sql`
- `apps/backend/src/models/user.model.ts`
- `apps/backend/src/middleware/auth.ts`
- `apps/backend/src/controllers/auth.controller.ts`
- `apps/backend/src/controllers/users.controller.ts`
- `apps/backend/src/controllers/attendance.controller.ts`
- `apps/backend/src/models/membership.model.ts`
- `apps/backend/src/controllers/membership.controller.ts`
- `apps/backend/src/controllers/clubs.controller.ts`
- `apps/backend/src/controllers/leader-requests.controller.ts`
- `apps/backend/src/services/ownership.service.ts`

Current state:

- `users.id` is an internal autoincrement primary key and is currently exposed as the user identifier in several flows.
- `users` does not have a `student_id` column.
- `/api/users/me` returns the full local user object, but profile update only accepts `name` and `avatar_url`.
- Auth sync in `authenticate` upserts users from Keycloak token claims with `keycloak_id`, `email`, `name`, and `role`.
- `POST /api/attendance/:eventId/manual` currently expects `{ user_id: number }` and passes that directly into attendance as `users.id`.
- `memberships` has `UNIQUE(club_id, user_id)`, but does not prevent one user from having active memberships in multiple clubs.
- `club_followers` is separate from `memberships`, so the "follow many clubs" rule can remain independent.
- `clubs.leader_id` can point to the same user for multiple clubs.
- `assignClubLeader` and `approveLeaderRequest` can currently make a user leader of multiple clubs.

### Frontend

Relevant files:

- `apps/frontend/src/pages/SignupPage.tsx`
- `apps/frontend/src/contexts/AuthContext.tsx`
- `apps/frontend/src/pages/ProfilePage.tsx`
- `apps/frontend/src/pages/EventAttendancePage.tsx`
- `apps/frontend/src/pages/AdminPage.tsx`
- `apps/frontend/src/api/auth.ts`
- `apps/frontend/src/api/users.ts`
- `apps/frontend/src/api/attendance.ts`
- `apps/frontend/src/components/layout/PageLayout.tsx`
- `apps/frontend/src/i18n/locales/en/translation.json`
- `apps/frontend/src/i18n/locales/ar/translation.json`

Current state:

- Signup page redirects to Keycloak registration via `keycloak.register()`.
- The local `authApi.signup` helper exists but is not currently used by the signup page.
- Profile page only edits `name`.
- Manual attendance UI uses a numeric "User ID" field and sends it to the backend as `user_id`.
- Admin users tab lists name, email, role, and actions, but not Student ID or a profile detail view.

---

## Product Rules

### Student ID

- `student_id` is a user-facing identifier, separate from `users.id`.
- `users.id` remains the internal database primary key.
- Student ID should be unique when present.
- Student ID should be required for new student signup if the signup flow is owned by this app.
- Existing users may have `student_id = NULL` until they complete their profile.
- Profile completion should treat Student ID as required for students.
- Student ID should be visible to admins and to the owning user.
- Student ID should not be editable by other students or club leaders.

### Manual Check-In

- The manual check-in input label should be "Student ID".
- The backend should accept Student ID and resolve it to the internal `users.id`.
- The backend should return a clear `404` or `400` if no user exists with that Student ID.
- Attendance records should continue storing internal `user_id` for referential integrity.
- Attendance exports and admin attendance lists should include Student ID where useful.

### Club Membership

- A student can have only one active club membership at a time.
- A student can still:
  - follow many clubs through `club_followers`
  - register for and attend other clubs' public activities
  - participate in non-member-only events when registration rules allow it
- A pending membership request should not allow bypassing the one-active-club rule at approval time.
- Recommended V1 rule: allow multiple pending requests, but when one is approved, any other pending requests should either stay pending but become unapprovable, or be automatically declined with a clear notification. Prefer unapprovable V1 to avoid surprising users.

### Club Leadership

- A club leader can lead only one club.
- A user who already leads a club cannot be assigned to another club unless removed from the first one.
- Admin leader assignment and leader request approval must both enforce this rule.
- The database should have a partial unique index on `clubs.leader_id` where `leader_id IS NOT NULL` so concurrent requests cannot violate the rule.

### Admin Visibility

- Admin should be able to see Student ID in user lists.
- Admin should be able to open a student profile/details view.
- The profile view should include at least:
  - name
  - email
  - role
  - Student ID
  - created date
  - active club membership
  - followed clubs if easy to include
  - event registration/attendance summary if already available through existing stats

### Missing Student ID Prompt

- Only students missing `student_id` should see the prompt.
- Admins and club leaders should not be blocked by this prompt unless product later decides they also need Student ID.
- The prompt should appear after login on authenticated app pages.
- It should include a button/link to `/profile`.
- It should be dismissible for the current session, but should reappear on later sessions until the Student ID is saved.

---

## Implementation Plan

## Step 1 - Add Student ID to the Users Table

**Files:**

- new migration: `apps/backend/migrations/034_users_add_student_id.sql`
- `apps/backend/src/models/user.model.ts`

Add:

- nullable `student_id TEXT`
- unique index for non-null Student IDs
- model type field `student_id: string | null`
- lookup helper such as `findByStudentId(studentId: string)`
- update helper support for `student_id`

Recommended migration:

```sql
ALTER TABLE users ADD COLUMN student_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_id_unique
  ON users(student_id)
  WHERE student_id IS NOT NULL;
```

Validation:

- trim whitespace
- store as a string, not a number
- reject empty string as invalid input
- preserve leading zeros if the school uses them

---

## Step 2 - Support Student ID in Signup and Auth Sync

**Files:**

- `apps/backend/src/controllers/auth.controller.ts`
- `apps/backend/src/services/keycloakAdmin.service.ts`
- `apps/backend/src/middleware/auth.ts`
- `apps/frontend/src/pages/SignupPage.tsx`
- `apps/frontend/src/api/auth.ts`

Important discovery:

- The current `SignupPage` does not render a local form. It redirects to Keycloak registration with `keycloak.register()`.
- The unused `authApi.signup` path supports local `{ name, email, password }` registration.

Implementation options:

- **Preferred if Keycloak remains the signup owner:** add `student_id` as a Keycloak registration attribute and map it into token/userinfo claims. Then update `authenticate` to read `payload.student_id` or a configured custom claim and save it locally.
- **Alternative if app-owned signup is restored:** update local signup form/API to collect `student_id`, validate uniqueness in local DB, and pass it into Keycloak user attributes when creating the Keycloak user.

Backend should still treat profile update as the fallback for existing users and any Keycloak users without the attribute.

---

## Step 3 - Let Existing Users Add Student ID in Profile

**Files:**

- `apps/backend/src/controllers/users.controller.ts`
- `apps/backend/src/models/user.model.ts`
- `apps/frontend/src/pages/ProfilePage.tsx`
- `apps/frontend/src/api/users.ts`
- translations in `apps/frontend/src/i18n/locales/en/translation.json`
- translations in `apps/frontend/src/i18n/locales/ar/translation.json`

Backend:

- extend `PATCH /api/users/me` to accept `student_id`
- validate uniqueness and return `409` if already used
- allow students to set or update their own Student ID
- decide whether Student ID can be changed after first save; recommended V1: allow edit with uniqueness validation because data may be entered incorrectly

Frontend:

- add a Student ID field to profile
- initialize it from `/api/users/me`
- include it in save payload
- show unique/invalid errors cleanly
- update profile-completion XP rule to include `student_id` for students if profile completion is still a gamification trigger

---

## Step 4 - Change Manual Check-In to Use Student ID

**Files:**

- `apps/backend/src/controllers/attendance.controller.ts`
- `apps/backend/src/models/user.model.ts`
- `apps/backend/src/models/attendance.model.ts`
- `apps/frontend/src/pages/EventAttendancePage.tsx`
- `apps/frontend/src/api/attendance.ts`
- translations in `apps/frontend/src/i18n/locales/en/translation.json`
- translations in `apps/frontend/src/i18n/locales/ar/translation.json`

Backend:

- change manual endpoint input from `{ user_id: number }` to `{ student_id: string }`
- resolve `student_id` with `UserModel.findByStudentId`
- use resolved internal `user.id` for duplicate checks and `AttendanceModel.checkIn`
- keep backward compatibility temporarily if needed by accepting old `user_id`, but mark it deprecated
- consider enforcing event registration in manual check-in too, matching QR check-in behavior, unless product intentionally allows leaders/admins to check in walk-ins

Frontend:

- rename state from `manualUserId` to `manualStudentId`
- change input type from `number` to `text`
- update placeholder from "User ID" to "Student ID"
- send `{ student_id }` to the API

Attendance list/export polish:

- include Student ID in present/no-show rows if admins/leaders need to verify identities.

---

## Step 5 - Enforce One Active Club Membership Per Student

**Files:**

- new migration: `apps/backend/migrations/035_memberships_one_active_per_user.sql`
- `apps/backend/src/models/membership.model.ts`
- `apps/backend/src/controllers/membership.controller.ts`
- `apps/frontend/src/pages/ClubDetailPage.tsx`
- `apps/frontend/src/api/memberships.ts`

Database:

- add a partial unique index:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_one_active_per_user
  ON memberships(user_id)
  WHERE status = 'active';
```

Backend:

- before approving a membership, check whether the target user already has another active membership
- return `409` with a clear message when the user is already an active member of another club
- expose a helper such as `findActiveByUser(userId)`
- keep following clubs untouched because it uses `club_followers`

Frontend:

- when approval fails, show the backend message in the club member management UI
- on the student side, if they are already active in a club, change "Join" messaging to explain they can follow this club and join public events instead

Migration safety:

- before creating the unique index, identify existing users with more than one active membership.
- decide cleanup strategy:
  - leave migration blocked and document rows for admin cleanup, or
  - automatically keep the earliest `approved_at/requested_at` membership active and set the others inactive.
- Recommended for production safety: block with a clear pre-migration audit script/manual cleanup instead of silently changing memberships.

---

## Step 6 - Enforce One Club Leader Per User

**Files:**

- new migration: `apps/backend/migrations/036_clubs_one_leader_per_user.sql`
- `apps/backend/src/controllers/clubs.controller.ts`
- `apps/backend/src/controllers/leader-requests.controller.ts`
- `apps/backend/src/models/club.model.ts`
- `apps/frontend/src/pages/AdminPage.tsx`
- `apps/frontend/src/pages/ProfilePage.tsx`

Database:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_clubs_one_leader_per_user
  ON clubs(leader_id)
  WHERE leader_id IS NOT NULL;
```

Backend enforcement:

- in `assignClubLeader`, reject if `newLeaderId` already leads another club that is not the current club
- in `approveLeaderRequest`, reject if request user already leads another club
- in `createLeaderRequest`, reject or hide request creation for users who already lead a club
- update error messages to say a leader can only lead one club

Frontend:

- in admin assign dialog, either filter out users already leading another club or show a disabled state/reason
- in leader request UI, prevent submitting new requests once the user is already a leader

Migration safety:

- audit existing duplicate leaders before adding the index.
- decide which club remains assigned for any duplicate leader before migration is applied.

---

## Step 7 - Add Admin Student ID and Student Profile View

**Files:**

- `apps/backend/src/controllers/users.controller.ts`
- `apps/backend/src/routes/users.routes.ts`
- `apps/frontend/src/pages/AdminPage.tsx`
- `apps/frontend/src/api/users.ts`

Backend:

- ensure `GET /api/users` includes `student_id`.
- add `GET /api/users/:id` for admins to fetch a profile detail payload.
- optional detail payload can join:
  - active membership
  - followed clubs
  - event stats

Frontend:

- display Student ID in the admin users list.
- add a "View Profile" action.
- show a dialog or detail panel with the profile fields.
- include missing Student ID as a visible badge/warning for admins.

---

## Step 8 - Add Missing Student ID Prompt

**Files:**

- `apps/frontend/src/components/layout/PageLayout.tsx`
- `apps/frontend/src/hooks/useCurrentUser.ts`
- `apps/frontend/src/pages/ProfilePage.tsx`
- translations in `apps/frontend/src/i18n/locales/en/translation.json`
- translations in `apps/frontend/src/i18n/locales/ar/translation.json`

Implementation:

- read `currentUser.student_id` from `/api/users/me`
- if `currentUser.role === 'student' && !currentUser.student_id`, open a dialog/banner
- dialog body: "Complete your profile by adding your Student ID."
- primary action routes to `/profile`
- allow dismiss for this browser session using component state or `sessionStorage`
- do not show while already on `/profile`

Recommended placement:

- put this in `PageLayout` or an authenticated app shell so it covers all protected pages without duplicating logic.

---

## Step 9 - Tests

### Backend tests

Add or update tests under:

- `apps/backend/src/tests/integration/signup.test.ts`
- `apps/backend/src/tests/integration/attendance.test.ts`
- `apps/backend/src/tests/integration/role-update.test.ts`
- `apps/backend/src/tests/integration/ownership-authorization.test.ts`
- new membership-specific test if needed

Test cases:

- profile update accepts a unique Student ID
- duplicate Student ID returns `409`
- manual check-in succeeds with Student ID
- manual check-in rejects unknown Student ID
- a user cannot have two active memberships
- membership approval returns `409` if user already has an active club
- a user cannot lead two clubs through direct admin assignment
- a user cannot lead two clubs through leader request approval
- admin user list includes `student_id`

### Frontend checks

Manual or automated checks:

- profile page displays and saves Student ID
- manual attendance UI labels the field Student ID and sends a string
- admin users list shows Student ID
- missing Student ID prompt appears for students only
- prompt redirects to profile
- following clubs still works for users who already belong to one active club

---

## Suggested Implementation Order

1. Add `student_id` migration/model/API support.
2. Add profile editing for Student ID.
3. Change manual check-in backend and frontend to use Student ID.
4. Add admin Student ID visibility.
5. Add one-active-membership backend/database enforcement.
6. Add one-leader backend/database enforcement.
7. Add missing Student ID popup.
8. Add signup/Keycloak Student ID capture once the chosen signup ownership path is confirmed.
9. Run backend integration tests and frontend build/lint.

This order gets the existing-user and attendance bugs fixed first, then locks down membership/leadership rules, then polishes onboarding.

---

## Open Decisions

- Does Student ID format have a fixed length or prefix rules? yes example student ID "2138217"
- Should Student ID become immutable after first save, or editable by the student? should not be edited "later i will implment verfcation using student email"
- Should manual check-in require the student to be registered for the event, matching QR check-in? yes
- For existing users with duplicate active memberships, should migration block until manual cleanup or automatically keep one active membership? no membership 
- For existing leaders assigned to more than one club, which club should they keep? no club
- Is signup fully Keycloak-owned, or should the local app signup API/page become the primary signup flow again? "keycloack"
