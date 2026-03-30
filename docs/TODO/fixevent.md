# Fix Plan - Created Event Does Not Show After Save

**Priority:** High
**Status:** Planned

---

## Summary

When a user creates an event and saves it, the new event is not showing up in the events page. The strongest code-level signal is that the frontend already refreshes the event queries after create, but the backend list endpoint does not authenticate optional callers, so it always behaves like the requester is anonymous and only returns `published` events.

This is especially visible for club leaders because `createEvent` forces leader-created events into `draft`, which means the newly created event is immediately hidden from the same user.

---

## Confirmed Signals From The Codebase

- `apps/frontend/src/api/client.ts` already sends the bearer token on requests when `keycloak.token` exists.
- `apps/frontend/src/pages/EventsPage.tsx` already invalidates `['events']` after a successful create, so the page is attempting to refresh correctly.
- `apps/backend/src/routes/events.routes.ts` exposes `GET /api/events` without any auth middleware.
- `apps/backend/src/controllers/events.controller.ts` reads `req.user` in `listEvents`, but because the route never authenticates, `req.user` is always empty there.
- `listEvents` forces `status = 'published'` whenever there is no authenticated user, which means the list hides drafts and submitted events.
- `apps/backend/src/controllers/events.controller.ts` also forces club leader creates into `draft`, which makes the mismatch very easy to reproduce.

---

## Likely Root Cause

The event creation flow is probably succeeding, but the subsequent list refresh cannot see the newly created record because:

1. the frontend refetches `GET /api/events`
2. the request includes a bearer token
3. the backend list route does not run auth
4. `listEvents` sees no `req.user`
5. the controller downgrades the response to `published` only
6. the newly created `draft` event is filtered out

---

## Fix Strategy

Recommended direction: keep `GET /api/events` public, but add optional authentication so the same endpoint can return the correct visibility scope for anonymous users, students, club leaders, and admins.

This should be implemented as a visibility rule, not just "return all events to leaders", because leaders should not see unpublished events from other clubs.

Target visibility rules:

- Anonymous or `student`: only `published` events
- `admin`: all events
- `club_leader`: all `published` events plus unpublished events for clubs they lead

Apply the same visibility logic to `GET /api/events/:id` so unpublished event detail pages are not accidentally public.

---

## Execution Plan

### 1. Add optional auth middleware

**Likely files**
- `apps/backend/src/middleware/auth.ts`
- `apps/backend/src/routes/events.routes.ts`

**Tasks**
- Add a non-blocking auth middleware such as `authenticateOptional`.
- If a valid bearer token exists, populate `req.user`.
- If no token exists, continue without failing.
- If an invalid bearer token exists, return `401` rather than silently treating it as anonymous.

### 2. Make event list visibility role-aware

**Likely files**
- `apps/backend/src/controllers/events.controller.ts`
- `apps/backend/src/models/event.model.ts`
- `apps/backend/src/services/ownership.service.ts`

**Tasks**
- Update `GET /api/events` to use optional auth.
- Replace the current "force published when no user" logic with role-aware visibility logic.
- For club leaders, return:
  - all published events
  - draft, submitted, rejected, cancelled, or completed events only for clubs they lead
- Preserve filters like `club_id`, `category`, `location`, `starts_after`, and `ends_before` within that visibility scope.
- Update `count()` behavior to match the same visibility rules so totals stay correct.

### 3. Protect event detail visibility consistently

**Likely files**
- `apps/backend/src/routes/events.routes.ts`
- `apps/backend/src/controllers/events.controller.ts`

**Tasks**
- Put `GET /api/events/:id` behind optional auth too.
- Allow anonymous and student users to open only published events.
- Allow admins to open any event.
- Allow club leaders to open unpublished events only when they own the event through the event's club.
- Return `404` or `403` consistently for unauthorized unpublished detail access and choose one behavior intentionally.

### 4. Re-check frontend assumptions after backend fix

**Likely files**
- `apps/frontend/src/pages/EventsPage.tsx`
- `apps/frontend/src/pages/EventDetailPage.tsx`

**Tasks**
- Verify the existing query invalidation is enough once the backend returns the right visibility.
- Confirm a newly created future `draft` event appears without a manual reload.
- Confirm leaders do not suddenly see other clubs' drafts after the backend change.
- Confirm admins can still see pending and unpublished events as expected.
- Check whether the created event lands in `Upcoming` or `Past` based on `starts_at`, so we do not misread a tab-placement issue as a save failure.

### 5. Add regression tests

**Likely files**
- `apps/backend/src/tests/integration/auth-protected.test.ts`
- `apps/backend/src/tests/integration/ownership-authorization.test.ts`
- new backend integration test if needed

**Tests to add**
- `GET /api/events` without auth returns only published events.
- `GET /api/events` with admin auth returns unpublished events too.
- `GET /api/events` with club leader auth returns:
  - their own club's unpublished events
  - published events from other clubs
  - not other clubs' unpublished events
- creating an event as a club leader and then listing events with the same token includes the new draft event.
- `GET /api/events/:id` blocks anonymous access to unpublished events.
- `GET /api/events/:id` allows owner leader and admin access to unpublished events.

### 6. Manual verification

**Smoke checks**
- Create a future-dated event as a club leader and verify it appears immediately in `Upcoming`.
- Create a future-dated event as an admin with `draft` and verify it appears immediately.
- Submit a leader event and verify:
  - the leader can still find it
  - the admin can see it in the pending workflow
- Open an unpublished event detail page:
  - anonymous user should not access it
  - owning leader should access it
  - admin should access it

---

## Done When

- Saving a newly created event causes it to appear on the events page for the user who created it, without a hard refresh.
- Club leaders can see their own unpublished events but not unpublished events from other clubs.
- Admins can see unpublished events for moderation and management.
- Anonymous and student users still only see published events.
- Event detail visibility matches the same rules as the event list.
- Automated tests cover the visibility rules and the create-then-list regression.
