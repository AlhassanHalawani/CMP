# Customization and Profile Plan

**Priority:** High
**Status:** Proposed

---

## Goal

Add a polished account customization experience to CMP with four connected upgrades:

- an admin-only visitors chart on the dashboard
- a better profile page with editable profile details and settings
- a dark/light toggle that uses moon and sun icons instead of text
- a dedicated styling customization panel that overrides selected UI tokens from `apps/frontend/src/styles/globals.css`

This should feel like one feature set, not four unrelated patches.

---

## Current App Fit

The codebase already has most of the foundation:

- `apps/frontend/src/pages/DashboardPage.tsx` already renders charts with `recharts`
- `apps/frontend/src/components/ui/chart.tsx` already provides `ChartContainer`, `ChartTooltip`, and legend helpers
- `apps/frontend/src/pages/ProfilePage.tsx` already updates the logged-in user's name via `PATCH /users/me`
- `apps/frontend/src/contexts/ThemeContext.tsx` already stores light/dark mode in local storage
- `apps/frontend/src/components/layout/Topbar.tsx` already has the theme toggle button
- `apps/frontend/src/styles/globals.css` already uses CSS custom properties for colors, radius, and chart tokens
- `apps/frontend/src/pages/NotificationsPage.tsx` already shows a working preferences-style UI pattern
- `apps/backend/src/routes/admin.routes.ts` and `apps/backend/src/controllers/admin.controller.ts` already expose admin-only stats endpoints

That means we do not need to invent a new design system. We mostly need to extend the existing one.

---

## Neo References To Reuse

Use these as implementation references, not as direct copy-paste unless needed:

- `neo/src/examples/ui/chart/chart-area-interactive.tsx`
  Use the time-range selector, stacked area pattern, and tooltip behavior for visitors.
- `neo/src/components/app/theme-switcher.tsx`
  Use the `Sun` and `Moon` icon treatment for the theme toggle button.

Important note:

- CMP already has `apps/frontend/src/components/ui/chart.tsx`, so we should adapt the Neo area-chart example to CMP's existing chart helpers instead of re-porting chart infrastructure.

---

## Product Recommendation

The example screenshots suggest a more specific customization UX:

- a `Customize styling` panel title
- preset color names with swatches
- segmented buttons for radius, shadow, and font weight choices
- bottom `Save changes` and `Reset` actions

For that customization flow, do **not** try to rewrite `globals.css` from the browser.

Better approach:

1. Keep `apps/frontend/src/styles/globals.css` as the default design token source.
2. Store user preferences as data.
3. Apply overrides at runtime with `document.documentElement.style.setProperty(...)`.

That gives us:

- safe persistence
- per-user customization
- draft editing with optional live preview
- easy reset to defaults
- no fragile client-side file editing

Recommendation based on the screenshots:

- use curated presets, not free-form design editing
- save only on explicit `Save changes`
- support `Reset` to the app defaults

---

## Feature Scope

### 1. Visitors Analytics

Show website traffic in the admin dashboard with:

- total visitors for selected range
- daily trend chart
- desktop vs mobile split
- range selector: `7d`, `30d`, `90d`

### 2. Profile Page Upgrade

Turn the current profile page into a real account area with:

- profile info section
- editable name and optional avatar support later
- settings / preferences section
- existing club leadership request section kept intact

### 3. Theme Toggle Upgrade

Replace text-based theme switching in the top bar with:

- moon icon when light mode is active
- sun icon when dark mode is active
- accessible label with screen-reader text

### 4. UI Preferences

Add user-facing customization controls that match the example panel:

- color preset dropdown with swatches
- border radius: `0px`, `5px`, `10px`, `15px`
- horizontal box shadow: `-4px`, `-2px`, `0px`, `2px`, `4px`
- vertical box shadow: `-4px`, `-2px`, `0px`, `2px`, `4px`
- heading font weight: `700`, `800`, `900`
- base font weight: `500`, `600`, `700`

Recommended color presets for v1 based on the example:

- `indigo`
- `red`
- `orange`
- `amber`
- `yellow`
- `lime`
- `green`
- `emerald`
- `teal`
- `cyan`
- `sky`

For v1, keep these as named presets rather than allowing arbitrary values.

---

## Recommended Implementation Plan

### Step 1 - Define Visitor Tracking Data

Add a new backend table for page visits.

Recommended migration:

- `apps/backend/migrations/019_create_page_views.sql`

Suggested columns:

- `id`
- `session_id` text
- `user_id` nullable
- `path`
- `device_type` check `desktop|mobile|tablet|unknown`
- `referrer` nullable
- `created_at`

Recommendation:

- do not store raw IP addresses in v1
- if uniqueness matters, use a generated session id on the frontend and optionally hash sensitive values before storage
- keep the first version privacy-light and aggregation-focused

---

### Step 2 - Add Analytics Backend Endpoints

Add a small analytics layer for recording and reading traffic.

Recommended new files:

- `apps/backend/src/models/pageView.model.ts`
- `apps/backend/src/controllers/analytics.controller.ts`
- `apps/backend/src/routes/analytics.routes.ts`

Recommended endpoints:

```txt
POST /api/analytics/page-view
Auth: optional

GET /api/admin/traffic?range=7d|30d|90d
Auth: admin
```

`POST /analytics/page-view` should:

- accept page path and client metadata
- attach `user_id` if authenticated
- derive `device_type`
- write one page-view event

`GET /admin/traffic` should return:

- total visitors
- total page views
- daily buckets
- desktop/mobile counts

Suggested response shape:

```json
{
  "range": "30d",
  "totals": {
    "visitors": 1280,
    "page_views": 3540
  },
  "series": [
    { "date": "2026-04-01", "desktop": 42, "mobile": 31 },
    { "date": "2026-04-02", "desktop": 38, "mobile": 29 }
  ]
}
```

If "unique visitors" is required, define the rule up front:

- unique by `session_id` per day is the simplest v1

---

### Step 3 - Track Page Views From the Frontend

Add a lightweight page-view tracker in the frontend router layer.

Recommended new code:

- `apps/frontend/src/api/analytics.ts`
- `apps/frontend/src/components/app/PageViewTracker.tsx`

Hook it near the router so it fires on route changes.

Rules for v1:

- track public and authenticated pages
- debounce repeated sends for the same route during the same session if needed
- skip noisy development-only behavior if it pollutes data

---

### Step 4 - Add the Visitors Chart to the Admin Dashboard

Implement the chart in `apps/frontend/src/pages/DashboardPage.tsx`.

Important CMP-specific note:

- `GlobalDashboard()` is shared by students and admins today
- the visitors widget should render only for admins

Recommended UI:

- place the visitors card near the top of the admin dashboard
- keep student and club leader dashboards unchanged
- use the Neo interactive area chart pattern with CMP's existing `ChartContainer`

Implementation details:

- switch from sample chart data to `/api/admin/traffic`
- use `AreaChart`, `Area`, `XAxis`, `CartesianGrid`
- keep the range selector from the Neo example
- use existing chart tokens from `globals.css`

Possible card header copy:

- title: `Website Visitors`
- description: `Showing visitors for the selected time range`

---

### Step 5 - Expand the Profile Page Into Tabs or Sections

Refactor `apps/frontend/src/pages/ProfilePage.tsx` into a more complete account screen.

Recommended structure:

1. `Profile`
   Basic account details like email and editable display name.
2. `Preferences`
   Theme and UI customization controls.
3. `Requests`
   Keep the existing club leadership request UI here for students.

This can be built with the same tab pattern already used in `apps/frontend/src/pages/NotificationsPage.tsx`.

Recommended UX based on the screenshots:

- keep the Preferences tab lightweight
- add a `Customize styling` trigger button
- open a `Dialog`-based customization panel that mirrors the screenshot layout
- keep `Save changes` and `Reset` actions grouped at the bottom of the panel

Recommended profile fields for v1:

- email, read-only
- name, editable
- current role badge

Optional later:

- avatar upload
- password/account security deep links through Keycloak

---

### Step 6 - Add Persistent UI Preferences

Create a user-specific preference store instead of hardcoding everything into local storage.

Recommended migration:

- `apps/backend/migrations/020_create_user_ui_preferences.sql`

Suggested columns:

- `id`
- `user_id` unique
- `theme` nullable
- `color_preset`
- `radius_base`
- `box_shadow_x`
- `box_shadow_y`
- `font_weight_heading`
- `font_weight_base`
- `main_color`
- `chart_1`
- `chart_2`
- `chart_3`
- `chart_4`
- `chart_5`
- `updated_at`

Recommended backend files:

- `apps/backend/src/models/userUiPreference.model.ts`
- `apps/backend/src/controllers/userPreferences.controller.ts`
- `apps/backend/src/routes/userPreferences.routes.ts`

Recommended endpoints:

```txt
GET   /api/users/me/preferences
PATCH /api/users/me/preferences
```

Why a separate table is better than extending `users`:

- cleaner ownership of settings data
- easier to add more tokens later
- avoids turning `users` into a catch-all table

---

### Step 7 - Apply Preferences by Overriding CSS Variables

Use `apps/frontend/src/styles/globals.css` as the default token file and layer user overrides on top.

Recommended frontend additions:

- `apps/frontend/src/contexts/UiPreferencesContext.tsx`
- or extend `ThemeContext.tsx` if you want one shared appearance context

Behavior:

- fetch preferences after login
- keep editable draft state in the customization panel
- optionally live-preview draft changes with `document.documentElement.style`
- persist to backend only on `Save changes`
- keep sensible defaults if no preference exists

The first tokens to wire up should be:

- `--radius-base`
- `--main`
- `--spacing-boxShadowX`
- `--spacing-boxShadowY`
- `--spacing-reverseBoxShadowX`
- `--spacing-reverseBoxShadowY`
- `--font-weight-heading`
- `--font-weight-base`
- `--shadow`
- optionally `--chart-1` through `--chart-5`

This aligns directly with the current `apps/frontend/src/styles/globals.css`.

Important implementation note:

- `--shadow` is currently hardcoded as `4px 4px 0px 0px var(--border)`
- to support the screenshot controls cleanly, refactor the default theme tokens so `--shadow` is derived from the editable X/Y values

---

### Step 8 - Replace Theme Text With Sun and Moon Icons

Update `apps/frontend/src/components/layout/Topbar.tsx`.

Use:

- `Sun` and `Moon` from `lucide-react`
- `sr-only` text for accessibility

Behavior:

- show moon while the app is in light mode
- show sun while the app is in dark mode
- keep the existing `toggleTheme()` behavior

This should visually match the Neo reference in `neo/src/components/app/theme-switcher.tsx`.

---

### Step 9 - Preferences UI on the Profile Page

In the new Preferences section, add controls for:

- theme mode
- color preset
- border radius preset
- horizontal box shadow preset
- vertical box shadow preset
- heading font weight
- base font weight

Recommended controls:

- icon button group or segmented control for theme
- select with swatch + label for color presets
- segmented buttons for radius values `0`, `5`, `10`, `15`
- segmented buttons for horizontal shadow `-4`, `-2`, `0`, `2`, `4`
- segmented buttons for vertical shadow `-4`, `-2`, `0`, `2`, `4`
- segmented buttons for heading weight `700`, `800`, `900`
- segmented buttons for base weight `500`, `600`, `700`

Recommendation for v1:

- match the visual structure from the screenshots as closely as practical
- prefer curated presets over free-form full design editing
- add a `Reset` action and a primary `Save changes` action
- keep the action buttons pinned or visually anchored at the bottom of the panel on mobile

This keeps the feature stable and avoids broken contrast combinations.

---

### Step 10 - Testing and Validation

Backend:

- migration test coverage for new tables
- controller tests for analytics aggregation
- controller tests for get/update preferences

Frontend:

- verify page views are recorded only once per intended navigation
- verify admin-only visibility for the visitors widget
- verify preferences survive refresh and re-login
- verify radius, color, shadow, and font-weight changes propagate across cards, inputs, buttons, and charts
- verify theme toggle icons and screen-reader labels work correctly
- verify the customization panel layout works on mobile widths like the screenshots
- verify the color dropdown shows both swatch and label clearly

Manual acceptance checks:

- admin can open dashboard and see visitors data
- non-admin users do not see the visitors chart
- profile updates still save correctly
- preferences preview correctly and persist after `Save changes`
- reset returns the UI to the default token set in `globals.css`

---

## Suggested File List

Likely files to modify:

- `apps/frontend/src/pages/DashboardPage.tsx`
- `apps/frontend/src/pages/ProfilePage.tsx`
- `apps/frontend/src/components/layout/Topbar.tsx`
- `apps/frontend/src/contexts/ThemeContext.tsx`
- `apps/frontend/src/styles/globals.css`
- `apps/frontend/src/api/users.ts`
- `apps/frontend/src/api/admin.ts`
- `apps/backend/src/controllers/admin.controller.ts`
- `apps/backend/src/routes/admin.routes.ts`
- `apps/backend/src/controllers/users.controller.ts`
- `apps/backend/src/routes/users.routes.ts`
- `apps/backend/src/models/user.model.ts`
- `apps/backend/src/tests/setup.ts`

Likely new files:

- `apps/frontend/src/api/analytics.ts`
- `apps/frontend/src/components/app/PageViewTracker.tsx`
- `apps/frontend/src/contexts/UiPreferencesContext.tsx`
- `apps/backend/src/models/pageView.model.ts`
- `apps/backend/src/controllers/analytics.controller.ts`
- `apps/backend/src/routes/analytics.routes.ts`
- `apps/backend/src/models/userUiPreference.model.ts`
- `apps/backend/src/controllers/userPreferences.controller.ts`
- `apps/backend/src/routes/userPreferences.routes.ts`
- `apps/backend/migrations/019_create_page_views.sql`
- `apps/backend/migrations/020_create_user_ui_preferences.sql`

---

## Recommended Delivery Order

1. Ship the icon-based theme toggle in `Topbar` first.
2. Build persistent UI preferences and wire them to CSS variables.
3. Refactor `ProfilePage` to expose those preferences cleanly.
4. Add visitor tracking write path.
5. Add admin traffic aggregation endpoint.
6. Add the interactive visitors chart to `DashboardPage`.

This order gives visible UI wins early while backend analytics is still being built.

---

## Open Decisions

These should be confirmed before implementation starts:

- Should visitor metrics mean page views, unique sessions, or both?
- Should UI preferences be per-user only, or should admins also get site-wide branding controls later?
- Should color customization stay preset-only for consistency, or expand later to custom colors?
- Should theme preference live only in backend preferences, or stay mirrored in local storage for faster first paint?
- Should the customization panel live inside `ProfilePage` only, or also be reachable from the top bar later?

---

## Acceptance Criteria

- [ ] Admin dashboard shows a visitors chart with `7d`, `30d`, and `90d` ranges
- [ ] Visitors chart uses real backend data, not mock chart data
- [ ] Only admins can see visitor analytics
- [ ] Profile page includes editable account info and a dedicated preferences area
- [ ] Preferences area includes a `Customize styling` panel matching the example layout
- [ ] Theme toggle uses moon/sun icons instead of text
- [ ] Border radius preference updates `--radius-base`
- [ ] Color preset updates the active CSS token set
- [ ] Horizontal and vertical box shadow preferences update the shadow-related CSS tokens
- [ ] Heading and base font-weight preferences update the typography tokens
- [ ] Preferences persist across refresh and login sessions
- [ ] `globals.css` remains the default token source and is not rewritten at runtime
