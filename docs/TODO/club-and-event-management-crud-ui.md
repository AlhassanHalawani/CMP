# Club and Event Management CRUD UI

## Why this should be next
The backend already supports CRUD for clubs and events, but the frontend currently focuses on listing/viewing and event registration. Implementing a management UI unlocks core operational workflows for `admin` and `club_leader` roles.

## Goal
Enable authorized users to create, edit, and delete clubs/events directly from the frontend with validation, role-aware access, and clear success/error feedback.

## Scope
- Club CRUD UI (admin only for create/delete; admin/leader constraints for update)
- Event CRUD UI (admin + club leader)
- Role-gated actions in list/detail pages
- Form validation and UX states (loading, error, success)
- Query invalidation and optimistic UX where safe

## Implementation Plan

### 1. Access and permissions
- Add role-aware action controls on `ClubsPage`, `ClubDetailPage`, `EventsPage`, and `EventDetailPage`.
- Hide or disable management actions for unauthorized users.
- Ensure frontend checks match backend route role requirements.

### 2. Clubs CRUD flow
- Add `Create Club` action in `ClubsPage` for `admin`.
- Add `Edit Club` and `Delete Club` actions in `ClubDetailPage` for authorized users.
- Build a reusable `ClubForm` component with fields:
  - `name`, `name_ar`, `description`, `description_ar`, `logo_url`, `leader_id`
- Wire `clubsApi.create/update/delete` using React Query mutations.
- Invalidate `['clubs']` and `['clubs', id]` after mutations.

### 3. Events CRUD flow
- Add `Create Event` action in `EventsPage` and/or `ClubDetailPage`.
- Add `Edit Event` and `Delete Event` actions in `EventDetailPage`.
- Build reusable `EventForm` component with fields:
  - `club_id`, `title`, `title_ar`, `description`, `description_ar`, `location`, `starts_at`, `ends_at`, `capacity`, `status`
- Wire `eventsApi.create/update/delete` via mutations.
- Invalidate `['events']`, `['events', id]`, and club event queries after mutations.

### 4. Validation and UX hardening
- Add client-side validation (required fields, dates, capacity >= 1, ends_at > starts_at).
- Display backend validation errors consistently.
- Add confirmation dialog before delete.
- Add toasts for success/failure.

### 5. Testing and quality gates
- Add component/integration tests for:
  - role-based visibility of actions
  - successful create/edit/delete paths
  - validation failures
- Add API failure case tests for unauthorized/forbidden actions.

### 6. Documentation updates
- Update `docs/api.md` with any request/response nuances used by UI forms.
- Update `docs/runbook.md` with management workflow and role expectations.

## Suggested delivery milestones
1. Clubs CRUD (create/edit/delete) fully working.
2. Events CRUD (create/edit/delete) fully working.
3. Validation + confirmations + toasts.
4. Test coverage and docs updates.

## Acceptance criteria
- Admin can create/edit/delete clubs and events from UI.
- Club leaders can create/edit/delete events and can only edit club data they are allowed to manage.
- Unauthorized users cannot access management actions from UI and receive proper API errors if forced.
- Changes are reflected immediately in list and detail views without manual refresh.
