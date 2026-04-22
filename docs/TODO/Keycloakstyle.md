# Keycloak Login + Signup Styling Plan

Date: 2026-04-22

## Short Answer

Yes, it is absolutely possible to change the design of the Keycloak login and sign-up pages.
Keycloak supports custom themes using:

- FreeMarker templates (`.ftl`)
- custom CSS
- static assets such as logos and images
- localized text bundles

This repo already uses a custom Keycloak login theme named `cmp-neo`, so we are not starting from zero.

---

## Current Repo Reality

### Webapp style source of truth

The visual language we need to match is already visible in these files:

- `apps/frontend/src/styles/globals.css`
- `apps/frontend/src/components/ui/button.tsx`
- `apps/frontend/src/components/ui/input.tsx`
- `apps/frontend/src/components/ui/card.tsx`
- `apps/frontend/src/pages/LoginPage.tsx`
- `apps/frontend/src/pages/SignupPage.tsx`

### What the current app style looks like

- soft lavender background with a subtle grid pattern
- black 2px borders
- hard offset shadow (`4px 4px 0 0`)
- square corners (`radius: 0`)
- bold headings, heavy labels, underlined links
- indigo/purple primary accent (`--main`)
- simple centered auth card with strong contrast and minimal decoration

### Current Keycloak setup

The repo already contains:

- `infra/keycloak/themes/cmp-neo/login/theme.properties`
- `infra/keycloak/themes/cmp-neo/login/resources/css/styles.css`
- `infra/keycloak/realm-export.json` with `"loginTheme": "cmp-neo"`

### Current gap

Right now the Keycloak theme is mostly a CSS override on top of the stock layout.
That is enough for colors/borders, but not enough to fully match the webapp layout, spacing, header structure, language switch behavior, and full auth flow polish.

There is also a deployment mismatch:

- local Docker mounts the whole `infra/keycloak/themes/cmp-neo` directory
- Kubernetes only mounts `theme.properties` and one CSS file from `theme-configmap.yaml`

That means a full custom template-based design will work locally, but not in production unless we also change packaging/deployment.

---

## Target Design To Match

We should make the real Keycloak pages feel like an extension of the app's existing `/login` and `/signup` entry screens.

### Visual target

- same lavender page background and grid pattern
- same centered single-card layout
- same border, shadow, and zero-radius language
- same bold `CMP` heading and subtitle treatment
- same button behavior: solid accent button with shadow and translate-on-hover
- same underlined secondary links
- same text weight and spacing rhythm as the React auth pages

### UX target

- login and register should look consistent with the CMP brand
- password reset, verify email, update password, and error/info screens should still match the same design
- Arabic and English must both look intentional, not just translated
- RTL layout must work correctly for Arabic
- mobile layout must remain clean and readable

---

## Implementation Plan

## 1. Freeze the auth design tokens

Before touching Keycloak templates, we should lock the auth-specific style tokens we want to mirror from the frontend.

### We will reuse these exact ideas from the frontend

- `--background`
- `--secondary-background`
- `--foreground`
- `--main`
- `--border`
- `--shadow`
- grid background pattern
- 2px border treatment
- bold heading/button/link typography

### Files to reference

- `apps/frontend/src/styles/globals.css`
- `apps/frontend/src/components/ui/button.tsx`
- `apps/frontend/src/components/ui/input.tsx`
- `apps/frontend/src/components/ui/card.tsx`

### Output of this step

A clearly organized Keycloak CSS file that mirrors the frontend tokens instead of ad-hoc overrides.

---

## 2. Convert the Keycloak theme from CSS-only to full layout theming

To truly match the app, we should keep `parent=keycloak.v2` but add our own templates for the login flow.

### Files we should add under `infra/keycloak/themes/cmp-neo/login/`

- `template.ftl`
- `login.ftl`
- `register.ftl`
- `info.ftl`
- `error.ftl`
- `login-reset-password.ftl`
- `login-update-password.ftl`
- `login-verify-email.ftl`

If registration uses the newer user-profile flow, we may also need:

- `register-user-profile.ftl`

### Why this is necessary

CSS alone cannot reliably:

- restructure the page shell
- place the CMP heading/subtitle exactly how we want
- add a proper top area / footer / language controls
- control form grouping cleanly
- keep all auth pages visually consistent

---

## 3. Build a CMP auth shell for all Keycloak pages

We should create one shared shell in `template.ftl` and have the individual pages inherit it.

### The shell should include

- full-page CMP background
- centered auth container
- card wrapper with border + hard shadow
- CMP title block:
  - `CMP`
  - `FCIT Clubs Management Platform`
- body area for page-specific form content
- footer area for secondary actions and locale links

### Design detail to copy from the React pages

- card width close to the current `max-w-sm`
- strong heading hierarchy
- accent subtitle in indigo
- generous vertical spacing but still compact on mobile

---

## 4. Style the actual login and sign-up forms to match app primitives

This is where the Keycloak form fields/buttons start behaving like the webapp.

### Button styling

Match the React `Button` component behavior:

- primary button uses `--main`
- black border
- hard shadow
- hover/focus shift effect
- bold text

### Input styling

Match the React `Input` component behavior:

- square edges
- 2px border
- strong focus ring
- white/surface background
- readable error and helper text spacing

### Link styling

- underlined
- bold
- visually secondary to the main CTA

### Messages

Style these states to fit the CMP look:

- invalid credentials
- validation errors
- required field hints
- success/info notices
- expired-action or token messages

---

## 5. Cover the whole auth journey, not just two screens

If we only redesign login and registration, the experience will still break visually as soon as a user forgets their password or verifies email.

### Pages that must share the same design

- login
- sign up
- forgot password
- verify email
- update password
- generic info screen
- generic error screen

### Acceptance rule

A user should never land on a stock Keycloak-looking page during the normal CMP auth flow.

---

## 6. Add Arabic + English localization and RTL support

The webapp already supports English and Arabic, so the Keycloak theme should do the same.

### Realm/config changes we should make

Update the realm config so Keycloak explicitly supports:

- English (`en`)
- Arabic (`ar`)

Expected realm changes:

- enable internationalization
- set supported locales
- choose a default locale

### Theme work

Add or update message bundles under the Keycloak theme:

- `messages_en.properties`
- `messages_ar.properties`

### RTL work

Add CSS rules for Arabic pages so these behave correctly:

- label alignment
- error message alignment
- input padding
- checkbox layout
- link/button alignment
- overall card text flow

### Important note

The current frontend login/signup routes have a manual language toggle.
Keycloak cannot automatically read the React app language state unless we deliberately pass locale or share it through supported Keycloak mechanisms.
So the Keycloak theme should use Keycloak's own locale selector and supported locales rather than depending on frontend local state.

---

## 7. Decide how we handle dark mode

This needs a clear decision before implementation.

### Recommended approach for phase 1

Match the current auth entry screens in their light theme first.

### Why

- the existing React `LoginPage` and `SignupPage` are already light-style screens
- Keycloak pages run outside the SPA and cannot safely read the app's `localStorage` theme across environments/origins
- forcing theme sync too early will slow the project without improving the first branded version much

### Phase 2 option

If we later want Keycloak dark mode, we can add one of these:

- a theme toggle inside the Keycloak theme
- a cookie-based theme preference shared between app and Keycloak
- a query-param/theme handoff during login redirect

For now, light-theme parity is the cleanest implementation target.

---

## 8. Fix packaging so production can use custom templates too

This is the most important infrastructure task in the plan.

### Current problem

Kubernetes currently mounts:

- `theme.properties`
- `styles.css`

That is not enough once we add multiple `.ftl` templates, message files, and assets.

### Recommended solution

Package the full Keycloak theme inside the Keycloak image instead of duplicating it in a ConfigMap.

### Exact changes

#### `infra/keycloak/Dockerfile`

Extend it to copy:

- `realm-export.json`
- `themes/cmp-neo/`

into:

- `/opt/keycloak/data/import/`
- `/opt/keycloak/themes/cmp-neo/`

#### `infra/docker/docker-compose.yml`

Keep local volume mounting during development, or switch local dev to the same custom image once the theme stabilizes.

#### `infra/k8s/keycloak/statefulset.yaml`

Change the Keycloak container image from the stock image to our custom image that already contains the full theme.

#### `infra/k8s/keycloak/theme-configmap.yaml`

Remove it from the runtime path once the image owns the theme, or reduce it to only environment-specific overrides if absolutely needed.

### Why this is better

- one source of truth for the theme
- no drift between local and production
- easier to add templates, assets, and message bundles
- much easier maintenance long-term

---

## 9. Add dev ergonomics for fast theme iteration

While building the theme, Keycloak template caching will slow us down.

### Local dev improvement

Run Keycloak in dev with theme caching disabled during implementation.

This usually means adding dev-only flags such as:

- `--spi-theme-static-max-age=-1`
- `--spi-theme-cache-themes=false`
- `--spi-theme-cache-templates=false`

This is only for development, not production.

---

## 10. QA checklist before rollout

We should verify all of these before calling the redesign complete:

- login page matches CMP style on desktop
- register page matches CMP style on desktop
- mobile layout remains clean
- invalid login error is correctly styled
- required field errors are correctly styled
- forgot-password flow matches the same design
- verify-email/info screens match the same design
- Arabic translation is complete
- Arabic RTL layout is correct
- English and Arabic locale switching works
- all pages still function with the existing Keycloak flow

---

## Suggested Delivery Order

### Phase 1

- align visual tokens
- add `template.ftl`
- implement `login.ftl`
- implement `register.ftl`
- finish shared CSS

### Phase 2

- style reset password / verify email / info / error pages
- add message bundles
- add RTL rules

### Phase 3

- package theme into the Keycloak image
- update Kubernetes deployment
- run full QA pass

---

## Files We Expect To Touch

### Frontend reference only

- `apps/frontend/src/styles/globals.css`
- `apps/frontend/src/components/ui/button.tsx`
- `apps/frontend/src/components/ui/input.tsx`
- `apps/frontend/src/components/ui/card.tsx`
- `apps/frontend/src/pages/LoginPage.tsx`
- `apps/frontend/src/pages/SignupPage.tsx`

### Keycloak theme implementation

- `infra/keycloak/themes/cmp-neo/login/theme.properties`
- `infra/keycloak/themes/cmp-neo/login/template.ftl`
- `infra/keycloak/themes/cmp-neo/login/login.ftl`
- `infra/keycloak/themes/cmp-neo/login/register.ftl`
- `infra/keycloak/themes/cmp-neo/login/info.ftl`
- `infra/keycloak/themes/cmp-neo/login/error.ftl`
- `infra/keycloak/themes/cmp-neo/login/login-reset-password.ftl`
- `infra/keycloak/themes/cmp-neo/login/login-update-password.ftl`
- `infra/keycloak/themes/cmp-neo/login/login-verify-email.ftl`
- `infra/keycloak/themes/cmp-neo/login/register-user-profile.ftl` if needed
- `infra/keycloak/themes/cmp-neo/login/resources/css/styles.css`
- `infra/keycloak/themes/cmp-neo/login/messages/messages_en.properties`
- `infra/keycloak/themes/cmp-neo/login/messages/messages_ar.properties`
- `infra/keycloak/themes/cmp-neo/login/resources/img/*` if we add branding assets

### Realm / deployment

- `infra/keycloak/realm-export.json`
- `infra/keycloak/Dockerfile`
- `infra/docker/docker-compose.yml`
- `infra/k8s/keycloak/statefulset.yaml`
- `infra/k8s/kustomization.yaml`
- `infra/k8s/keycloak/theme-configmap.yaml` if we keep any part of the current ConfigMap approach

---

## Definition Of Done

This work is done when:

- Keycloak login and sign-up visually match the CMP webapp style
- the rest of the auth flow also matches that same style
- English and Arabic both work well
- RTL is correct
- the same theme works in local Docker and Kubernetes production
- there is no production-only fallback to stock Keycloak pages

---

## Recommendation

We should implement this as a real Keycloak theme project, not as a CSS tweak.

The repo already has the right starting point with `cmp-neo`, but to truly match your webapp we should:

1. keep the CMP design tokens
2. add proper Keycloak templates
3. support Arabic/RTL
4. package the whole theme for production

That is the cleanest path to a login/sign-up experience that actually feels like the same product.
