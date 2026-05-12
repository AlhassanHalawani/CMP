# FR-016-EXT — Mobile Polish: Missing Routes, Page Layouts, and Native UX

**Priority:** Medium
**Status:** Planned
**Depends on:** FR-016 (completed — PWA manifest, bottom nav, install button)

---

## Context

FR-016 shipped the structural foundation: PWA manifest, bottom navigation, and install flow.
Several items were deferred because they require new routes, page-level layout work, or service
worker infrastructure that goes beyond wiring up navigation. This document captures that
remaining work as a focused follow-on.

---

## Outstanding TODOs from FR-016

The following TODOs are marked in code and must be resolved before the mobile experience
is considered complete:

| Location | TODO | Blocker |
|---|---|---|
| `MobileBottomNav.tsx` | Scan QR center (student, admin) routes to `/events` | No `/scan` route exists |
| `MobileBottomNav.tsx` | Create Event center (club leader) routes to `/events` | No `/events/new` route or inline trigger |
| `public/icons/icon.svg` | SVG icon only — iOS requires PNG for splash and home-screen | No PNG icons generated |

---

## Scope

### In scope

- dedicated mobile QR attendance scanner page (`/scan`)
- event creation shortcut that opens the existing creation form directly
- PNG app icons in required sizes for iOS and Android
- PWA splash screen configuration
- notification badge count on the bottom nav bell slot
- mobile-optimized layout for high-traffic pages (events list, club detail, dashboard)
- bottom sheet pattern for mobile modals (replace centered dialogs on small screens)
- empty/error states sized for mobile viewports
- basic service worker with an offline fallback page

### Out of scope

- push notifications (separate feature)
- custom gestures (swipe to dismiss, pull-to-refresh)
- native app wrapper
- redesigning desktop pages

---

## Phase 1 — Dedicated QR Scanner Route (`/scan`)

Create a new page reachable at `/scan` that opens the device camera for QR code scanning
and submits an attendance check-in without requiring the user to navigate to a specific event
first.

### Recommended behavior

1. The page requests camera permission on mount.
2. A QR code stream is decoded client-side (use `html5-qrcode` or `@zxing/browser` — check
   which is already in the dependency tree before adding a new package).
3. On a successful scan the decoded value is sent to
   `POST /api/attendance/events/:id/checkin` using the event ID embedded in the QR payload.
4. The page shows a success or error state after each scan without leaving the camera view,
   so the user can scan multiple codes in sequence.
5. The camera preview fills the safe area above the bottom nav; no content should be clipped
   by the bottom bar.

### Route entry

- Add `/scan` to `App.tsx` wrapped in `<ProtectedRoute>` (all authenticated roles).
- Update the center slot in `studentSlots` and `adminSlots` in `MobileBottomNav.tsx` to point
  to `/scan` and remove the TODO comment.

### QR payload contract

Agree on a stable QR payload format with the backend team. Recommended:

```
cmp://attend?event=<eventId>&token=<hmac>
```

The `token` field allows the backend to reject replayed or forged check-ins. Document the
format in `docs/api/qr-payload.md` before implementation.

---

## Phase 2 — Create Event Shortcut for Club Leaders

The center slot for club leaders currently links to `/events` (the events list). Replace it
with a direct path into the creation flow.

### Option A — route to `/events/new`

Add a new route `/events/new` that renders the existing event creation form. The form already
exists inside `EventsPage` or a modal; extract it into a standalone page that works well on
mobile (single column, large tap targets).

Recommended for mobile because the user stays focused on one task and the browser back button
works naturally.

### Option B — trigger creation modal from the bottom nav

Pass a URL search param (e.g., `/events?create=1`) and have `EventsPage` open the creation
dialog when that param is present. Simpler to implement but mixing navigation state with UI
state is fragile.

**Recommendation:** Option A. Update `leaderSlots` in `MobileBottomNav.tsx` to `/events/new`
and remove the TODO comment once the route exists.

---

## Phase 3 — PNG App Icons and Splash Screen

The current manifest references only `icon.svg`. Safari on iOS does not use manifest icons
for home-screen display; it requires `<link rel="apple-touch-icon">` pointing to a PNG.

### Required icon sizes

| Purpose | Size | Format | Where |
|---|---|---|---|
| Android home screen (standard) | 192×192 | PNG | `public/icons/icon-192.png` |
| Android home screen (high-res) | 512×512 | PNG | `public/icons/icon-512.png` |
| iOS home screen | 180×180 | PNG | `public/icons/apple-touch-icon.png` |
| Favicon | 32×32 | PNG or ICO | `public/favicon.ico` (replace 0-byte placeholder) |

### Steps

1. Export the existing `icon.svg` to PNG at each required size using any SVG rasterizer
   (Inkscape, Sharp CLI, or a small Node script in `scripts/`).
2. Update `manifest.webmanifest` to include the PNG entries alongside the SVG.
3. Update `index.html` `<link rel="apple-touch-icon">` to point to
   `/icons/apple-touch-icon.png` instead of the SVG.

### Splash screen (iOS)

iOS generates a splash screen from the `apple-touch-icon` and `theme-color`. No additional
configuration is required once the 180×180 PNG is in place.

---

## Phase 4 — Notification Badge on Bottom Nav

Club leaders and students receive notifications when events change, registrations are
confirmed, or achievements are granted. The bottom nav currently has no badge count.

### Recommended implementation

1. The `NotificationsPage` already polls unread count via React Query (see `Topbar.tsx`).
   Extract the unread count query into a shared hook (e.g., `useUnreadNotifications`).
2. Import the hook in `MobileBottomNav.tsx`.
3. Render a small badge number on the notifications slot (leader nav) when count > 0.
4. Cap the displayed count at 99.
5. The badge should match the existing badge style used in the topbar bell icon so the two
   are visually consistent.

The student nav does not have a dedicated notifications slot; add one by replacing the
least-used right slot, or add a badge to the events slot when a registered event changes.

---

## Phase 5 — Mobile Page Layout Polish

Several pages render well on desktop but need targeted fixes on mobile widths. Audit and fix
in priority order:

### High priority

**Events list (`/events`)**
- Cards should be single-column below `sm:`.
- The "Create Event" button (for leaders) must remain above the fold; it must not be hidden
  behind the bottom nav.
- Filter/search controls should collapse into a single "Filter" chip that opens a bottom sheet.

**Club detail (`/clubs/:id`)**
- The member list and event list tabs are wide tables on desktop. On mobile, switch each row
  to a stacked card layout using `@container` or a `md:` breakpoint switch.
- The "Join Club" and "Leave Club" CTAs must be visible without scrolling on a 390px viewport.

**Dashboard (`/dashboard`)**
- Stats grid is `md:grid-cols-4` — on mobile this should be `grid-cols-2`.
- The welcome banner should reduce vertical height so stats appear without scrolling.

### Medium priority

**QR attendance page (`/events/:id/attendance`)**
- The attendee list is a table; convert to a card list on mobile.
- Keep the "Mark Present" action as a large tap target (minimum 44px height).

**Profile (`/profile`)**
- The form fields stack correctly but input font size must be at least 16px to prevent iOS
  auto-zoom on focus.

**Admin (`/admin`)**
- Admin page likely has dense tables; add horizontal scroll with `overflow-x-auto` on narrow
  viewports rather than breaking layout.

---

## Phase 6 — Bottom Sheet Modals

Centered modal dialogs (`Dialog` from Radix UI) feel unnatural on mobile. For actions
initiated from a mobile context (create event, confirm attendance, join club), a bottom sheet
that slides up from the bottom edge is more ergonomic.

### Recommended implementation

1. Check whether the existing `Sheet` component from Radix UI (`@radix-ui/react-dialog` with
   `side="bottom"`) already supports a bottom-anchored variant. If so, create a wrapper
   component `BottomSheet` that renders a `Sheet side="bottom"` on mobile and a standard
   `Dialog` on desktop, switching via the `useIsMobile()` hook already in the codebase.
2. Replace the modal used for "Create Event", "Join Club", and "Confirm Attendance" with the
   new `BottomSheet` wrapper.
3. The bottom sheet should respect `env(safe-area-inset-bottom)` on iOS, matching the bottom
   nav safe-area handling.

---

## Phase 7 — Offline Fallback via Service Worker

A basic service worker should intercept failed network requests and show a friendly offline
page instead of a blank screen.

### Minimum viable service worker

- Cache the app shell (HTML, JS bundle, CSS) on install using a cache-first strategy.
- For API requests that fail due to no network, return a generic offline response or display
  a toast ("You appear to be offline").
- For page navigations to unknown URLs while offline, serve the cached `index.html` so the
  React Router SPA still loads.

### Recommended tooling

Use `vite-plugin-pwa` (wraps Workbox). Add it to `vite.config.ts`. Configure:

```ts
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png}'],
    navigateFallback: '/index.html',
  },
  manifest: false, // we manage manifest.webmanifest manually
})
```

Setting `manifest: false` keeps the hand-authored `manifest.webmanifest` and delegates only
service worker generation to the plugin.

---

## Acceptance Criteria

### QR scanner (`/scan`)
- Authenticated users see a live camera view at `/scan`.
- A successful QR scan submits a check-in and shows a success state without navigating away.
- The camera view is not clipped by the bottom navigation bar.
- The center nav slot for students and admins now routes to `/scan` (TODO comments removed).

### Create Event shortcut
- Club leaders tapping the center nav slot land directly on the event creation form.
- The form works correctly on a 390px viewport with no horizontal overflow.
- The TODO comment in `MobileBottomNav.tsx` is removed.

### Icons
- `public/icons/icon-192.png`, `icon-512.png`, and `apple-touch-icon.png` exist and are
  non-zero-byte files.
- The manifest references the PNG icons.
- `index.html` `apple-touch-icon` points to the 180×180 PNG.
- The existing `favicon.ico` placeholder is replaced with a real favicon.

### Notification badge
- The notifications slot on the bottom nav shows a badge when unread count > 0.
- The badge disappears after the user visits `/notifications`.

### Page layout
- Events list renders single-column cards on a 390px viewport.
- Club detail member/event rows are readable without horizontal scrolling.
- Dashboard stats appear as a 2-column grid on mobile.
- Profile form inputs are 16px font size or larger to prevent iOS auto-zoom.

### Bottom sheet
- "Create Event", "Join Club", and "Confirm Attendance" modals use a bottom sheet on mobile.
- Bottom sheet respects safe-area insets.

### Offline
- When the network is unavailable, the app loads from cache.
- An offline toast or page is shown instead of a blank/error screen.

---

## Implementation Notes for AI Agent

- Resolve the QR scanner TODO in `MobileBottomNav.tsx` (`src/components/layout/MobileBottomNav.tsx`,
  lines ~20–24) before building the `/scan` page so the route and the nav slot stay in sync.
- The `useIsMobile()` hook lives at `src/hooks/use-mobile.ts` — reuse it for the `BottomSheet`
  component to avoid duplicating the 768px breakpoint.
- The unread notification count query pattern is already implemented in
  `src/components/layout/Topbar.tsx` — extract it rather than duplicating the fetch logic.
- PNG icon generation is a one-time task; a small Node script in `scripts/generate-icons.mjs`
  using the `sharp` package is the cleanest approach and can be re-run whenever the brand
  icon changes.
- `vite-plugin-pwa` must be a `devDependency` only; it does not ship to the browser.
- Test the offline fallback by opening Chrome DevTools → Network → Offline before verifying.

---

## Future Enhancements (beyond this document)

- pull-to-refresh on event and club lists
- swipe-to-dismiss for bottom sheet modals
- haptic feedback on QR scan success (via `navigator.vibrate`)
- per-role notification badge counts (e.g., pending approvals for admin)
- customizable bottom nav order per user preference
