# Notification Redirects, Online Event Auto-Publish, And Signup Redirect Plan

## Goal

Plan the fixes for three issues:

1. pressing an event-related notification should open the related event
2. a club leader should be able to publish an online event without admin approval when there is no physical building location
3. signup should redirect to the homepage instead of the dashboard

This plan is based on the current frontend, backend, and database shape in this repo.

## What I Found In The Current Code

- `apps/frontend/src/pages/NotificationsPage.tsx` renders notifications as plain cards. They are not clickable and they do not call `markRead`.
- `apps/frontend/src/api/notifications.ts` only exposes `id`, `title`, `body`, `type`, `is_read`, and `created_at`. There is no route or entity metadata to know where a notification should send the user.
- `apps/backend/src/models/notification.model.ts` and `apps/backend/migrations/008_create_notifications.sql` store only:
  - `title`
  - `body`
  - `type`
  - `is_read`
  - `created_at`
- `apps/backend/src/controllers/events.controller.ts` creates a registration notification with the event title and date, but does not store `event_id` or any target URL.
- `apps/frontend/src/pages/SignupPage.tsx` explicitly sends authenticated users to `/dashboard`.
- `apps/frontend/src/contexts/AuthContext.tsx` calls `keycloak.register()` without a custom `redirectUri`, so the app returns to the signup route and then `SignupPage` sends the user to `/dashboard`.
- `apps/frontend/src/components/events/EventFormDialog.tsx` only has a free-text `location` field. There is no structured `online` or `physical` event mode.
- `apps/backend/src/controllers/events.controller.ts` forces club leaders to create events as `draft`.
- `apps/backend/src/controllers/events.controller.ts` always changes leader-submitted events to `submitted` in `submitEvent()`, which means admin review is always required.

## Root Causes

### 1. Notification redirects are impossible with the current data model

The notification system has no structured target information, so the frontend cannot safely know whether a notification should open:

- `/events/:id`
- `/clubs/:id`
- `/notifications`
- or something else

Parsing the event title out of the body text would be brittle and should not be the chosen fix.

### 2. Online events are not modeled explicitly

The approval workflow can only see a text `location`. It cannot distinguish between:

- a real online event
- a physical event with missing building info
- an incomplete draft

So the requested auto-publish rule needs a schema and form update first.

### 3. Signup currently hardcodes the wrong post-auth route

Even if Keycloak returns the user to `/signup`, the page currently does:

- `if (authenticated) return <Navigate to="/dashboard" replace />`

That is the direct reason users land on the dashboard instead of the homepage.

## Recommended Execution Order

1. Phase 1: notification target metadata + click redirect
2. Phase 2: structured online-event mode + approval bypass
3. Phase 3: signup redirect to homepage
4. Phase 4: regression and acceptance checks

## Phase 1 - Make Event Notifications Click Through To The Event

### Objective

When a user clicks an event-related notification such as:

- `Registration Confirmed`
- `Event Approved`
- `Event Rejected`
- `Event Reminder`

the app should open the related event detail page.

### Main Files

- `apps/backend/migrations/008_create_notifications.sql`
- new migration after `020`
- `apps/backend/src/models/notification.model.ts`
- `apps/backend/src/services/notifications.service.ts`
- `apps/backend/src/controllers/events.controller.ts`
- `apps/backend/src/controllers/notifications.controller.ts`
- `apps/frontend/src/api/notifications.ts`
- `apps/frontend/src/pages/NotificationsPage.tsx`
- `apps/frontend/src/components/layout/Topbar.tsx`
- `apps/backend/src/tests/setup.ts`

### Recommended Data Design

Add structured notification target metadata.

Recommended minimum field:

- `target_url TEXT NULL`

Recommended richer alternative:

- `entity_type TEXT NULL`
- `entity_id INTEGER NULL`
- `target_url TEXT NULL`

For this repo, `target_url` is the simplest and safest first step because the frontend already routes by URL.

### Tasks

- Add a new notification migration that extends the notifications table with `target_url`.
- Update `NotificationModel.create()` and the TypeScript interface to support `target_url`.
- Update `notificationsApi.Notification` type on the frontend.
- Update event-triggered notifications in `events.controller.ts` to include:
  - registration confirmed -> `/events/:id`
  - event approved -> `/events/:id`
  - event rejected -> `/events/:id`
  - event reminder -> `/events/:id`
- Update `NotificationsPage.tsx` so a notification card:
  - becomes clickable when `target_url` exists
  - calls `markRead` before or during navigation
  - uses `useNavigate()` to route to `target_url`
- Keep notifications without `target_url` non-clickable.
- In `markRead`, verify ownership before updating the row instead of blindly updating by notification id.

### Important Notes

- Do not rely on searching event titles from the notification body.
- Keep the notification body as display text only, not as navigation state.
- If `markRead` runs asynchronously, navigation should still feel instant.

### Done When

- Clicking a registration notification opens `/events/<id>`.
- Clicking event approval/rejection/reminder notifications opens the related event.
- The clicked notification becomes read.
- Notifications without target metadata still render safely.

## Phase 2 - Let Club Leaders Publish Online Events Without Approval

### Objective

Allow direct publish when:

- the event is explicitly marked as online
- there is no physical building location requirement

while keeping admin review for physical events.

### Main Files

- new migration after `020`
- `apps/backend/src/models/event.model.ts`
- `apps/backend/src/controllers/events.controller.ts`
- `apps/backend/src/routes/events.routes.ts`
- `apps/frontend/src/components/events/EventFormDialog.tsx`
- `apps/frontend/src/api/events.ts`
- `apps/frontend/src/pages/EventDetailPage.tsx`
- `apps/backend/src/tests/integration/event-registration.test.ts`
- `apps/backend/src/tests/integration/event-visibility.test.ts`
- `apps/backend/src/tests/setup.ts`

### Recommended Data Design

Add a structured event mode instead of inferring online status from an empty string.

Recommended new field:

- `delivery_mode TEXT NOT NULL DEFAULT 'physical' CHECK (delivery_mode IN ('physical', 'online'))`

Optional future-safe additions:

- `meeting_url TEXT NULL`
- `online_notes TEXT NULL`

Keep the existing `location` column for physical venue text.

### Why This Is Needed

Right now the system only has `location TEXT`, so it cannot reliably tell whether:

- `location = NULL` means online
- or the event form is incomplete

Without a structured field, the requested rule would be fragile.

### Tasks

- Add a migration for `delivery_mode`.
- Update event types in frontend and backend to include `delivery_mode`.
- Update `EventFormDialog.tsx` to let users choose:
  - `Physical`
  - `Online`
- Show or validate fields based on mode:
  - physical -> require location
  - online -> location may be empty
- Update event detail UI to display the mode clearly.
- Change the leader workflow in `events.controller.ts`:
  - creating an event can still start in `draft`
  - when a leader submits an event:
    - if `delivery_mode === 'online'` and no physical location is required, publish immediately
    - otherwise keep the current `submitted` -> admin approval flow
- Send the correct notification based on the path taken:
  - online auto-publish -> notify leader that the event is published
  - physical event -> notify admins that approval is needed
- Update the event detail page button/wording so a qualifying online event does not misleadingly say only `Submit for Review`.

### Recommended Implementation Detail

Keep the bypass rule in `submitEvent()` rather than generic `PATCH /events/:id`.

Reason:

- leaders are already blocked from changing status through normal patch
- the special publish rule belongs to the workflow transition, not free-form editing

### Done When

- Club leaders can mark an event as online in the form.
- Online events can be published without admin approval.
- Physical events still require approval.
- Physical events cannot bypass approval by simply leaving location blank.

## Phase 3 - Redirect To Homepage After Signup

### Objective

After signup authentication completes, the user should land on `/` instead of `/dashboard`.

### Main Files

- `apps/frontend/src/pages/SignupPage.tsx`
- `apps/frontend/src/contexts/AuthContext.tsx`
- `apps/frontend/src/pages/LandingPage.tsx`

### Tasks

- Change the authenticated redirect in `SignupPage.tsx` from `/dashboard` to `/`.
- Update `AuthContext.register()` so it passes a homepage redirect URI to Keycloak registration if supported:
  - recommended target: `window.location.origin + '/'`
- Verify the signup flow does not bounce back to `/signup` unnecessarily after account creation.
- Verify the homepage handles a newly authenticated user cleanly and shows the existing signed-in CTA state.

### Important Reason

Changing only the `Navigate` target may fix the symptom, but setting `redirectUri` during Keycloak registration makes the intent explicit and reduces route flicker.

### Done When

- Completing signup lands the user on `/`.
- The landing page loads in authenticated state without redirecting to `/dashboard`.
- Login behavior remains unchanged unless intentionally updated.

## Phase 4 - Regression Pass And Acceptance Checks

### Objective

Verify the three fixes together and prevent follow-up regressions.

### Checks

- Notification click:
  - registration confirmed notification opens the correct event
  - approval notification opens the correct event
  - clicked notifications become read
- Online event workflow:
  - online event by club leader publishes without admin approval
  - physical event by club leader still becomes `submitted`
  - admin approval flow still works for physical events
- Signup redirect:
  - after signup, route is `/`
  - homepage renders correctly for authenticated users

### Suggested Test Coverage

- backend integration test for notification target metadata on event registration
- backend integration test for `submitEvent()` publishing online events directly
- backend integration test for `submitEvent()` keeping physical events in review flow
- frontend/manual test for notification card click routing
- frontend/manual test for signup landing on `/`

## Acceptance Criteria

- [ ] Clicking a registration notification takes the user to that event
- [ ] Clicking an event approval/rejection/reminder notification takes the user to that event
- [ ] Club leaders can publish online events without approval
- [ ] Physical events still require admin approval
- [ ] Signup finishes on the homepage, not the dashboard

## File Summary

- Notification redirect work:
  - `apps/backend/src/models/notification.model.ts`
  - `apps/backend/src/services/notifications.service.ts`
  - `apps/backend/src/controllers/events.controller.ts`
  - `apps/backend/src/controllers/notifications.controller.ts`
  - `apps/frontend/src/api/notifications.ts`
  - `apps/frontend/src/pages/NotificationsPage.tsx`
- Online event workflow:
  - `apps/frontend/src/components/events/EventFormDialog.tsx`
  - `apps/frontend/src/api/events.ts`
  - `apps/backend/src/models/event.model.ts`
  - `apps/backend/src/controllers/events.controller.ts`
- Signup redirect:
  - `apps/frontend/src/pages/SignupPage.tsx`
  - `apps/frontend/src/contexts/AuthContext.tsx`
