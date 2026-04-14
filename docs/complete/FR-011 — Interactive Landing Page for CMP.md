# FR-011 — Interactive Landing Page for CMP

## Summary
Add a new public landing page for CMP that introduces the platform, personalizes the experience by visitor type, and guides new users into the correct auth flow. The page should support three visitor states:
- `Student`
- `Staff`
- `Returning user`

Audience selection is based on visitor intent, not strict backend role mapping. A `student` visitor may later authenticate as a normal student or a club leader. A `staff` visitor may later authenticate as an admin or a club leader. The landing page should explain the platform in role-relevant terms without creating any new backend roles.

## Key Changes
- Make `/` the public landing page and move the current protected home experience to `/app` or `/dashboard`.
- Keep `/login` and `/signup` as the auth entry points, linked from the landing page.
- Add a new `LandingPage` with bilingual copy and RTL-safe layout.
- Detect returning users using:
  - active authenticated session
  - local visited flag in browser storage
- Persist lightweight frontend-only state:
  - `cmp_landing_seen`
  - `cmp_selected_audience=student|staff`
  - `cmp_intro_completed`

## Page Structure
1. Hero
- Introduce CMP as the platform for FCIT clubs, events, attendance, achievements, and reporting at KAU.
- Primary CTA: `Sign up with your KAU email`
- Secondary CTA: `Login`
- Quick returning-user action: `Skip intro`

2. Audience Selection
- Two primary audience cards:
  - `I'm a student`
  - `I'm staff`
- Small supporting copy under each:
  - Student: for students joining clubs, attending events, or leading a club
  - Staff: for faculty/staff managing clubs, approvals, KPIs, or reports
- Selection updates all downstream messaging and wizard content

3. Guided Intro Flow
- Short immersive 3-step wizard for new visitors
- Step 1: what CMP is
- Step 2: what CMP helps this audience do
- Step 3: how to get started with a KAU email
- Persistent controls:
  - `Next`
  - `Back`
  - `Skip to login`
  - `Sign up`

4. Personalized Benefits Section
- Student view:
  - discover club activities
  - register for events
  - track attendance
  - view achievements and reports
  - support both regular students and student club leaders
- Staff view:
  - oversee club operations
  - manage approvals and reports
  - review attendance and KPIs
  - support both admins and staff who also act as club leaders

5. Trust / Value Section
- Explain practical value clearly:
  - one platform instead of scattered processes
  - easier participation and management
  - verified attendance and achievement records
  - bilingual access for the FCIT audience

6. Final CTA Band
- Strong signup message focused on KAU email
- Primary CTA: `Create your CMP account with your KAU email`
- Secondary CTA: `Login instead`

## User Journeys
### New student visitor
- Arrives on `/`
- Selects `Student`
- Sees student-specific intro and benefits
- Continues to signup or login
- After auth, may land in regular student experience or club-leader experience based on actual assigned role

### New staff visitor
- Arrives on `/`
- Selects `Staff`
- Sees staff-specific intro and benefits
- Continues to signup or login
- After auth, may land in admin or club-leader experience based on actual assigned role

### Returning unauthenticated visitor
- Arrives on `/`
- Browser flag identifies prior visit
- Hero immediately offers `Login` and `Skip intro`
- Visitor may still reopen the personalized intro

### Returning authenticated visitor
- Arrives on `/`
- Session identifies authenticated state
- Show fast-path actions:
  - `Go to dashboard`
  - `Switch account`
  - `View intro again`

## Suggested Interactive Elements
- Large audience-selection cards with active state
- 3-step personalized wizard with progress indicator
- Dynamic benefit cards that switch by selected audience
- Sticky CTA bar on mobile during the intro flow
- Returning-user shortcut in the hero area
- Subtle motion only:
  - card reveal
  - step transition
  - selected-card emphasis

## CTA Placement
- Hero: primary signup CTA, secondary login CTA
- Audience section: CTA appears after role selection
- Every intro step: `Skip to login` and `Sign up`
- Mid-page after benefits: repeated signup CTA
- Final section: strongest signup CTA on page
- Returning-user state: immediate dashboard/login action above the fold

## UX Recommendations
- Keep the page simpler and more welcoming than the internal dashboard.
- Personalize early so users do not read irrelevant content.
- Use short, outcome-focused copy instead of long explanations.
- Keep the language toggle visible from the first screen.
- Ensure the experience works equally well in English and Arabic.
- Avoid introducing separate public tracks for `admin` and `club_leader`; use broader audience framing and let actual permissions resolve after authentication.
- Keep signup/login visible at all times so users never feel trapped in the intro flow.

## Public Interfaces / Routing
- New public route: `/`
- Protected app route moved to `/app` or `/dashboard`
- No backend changes required for v1
- New translation keys for landing-page content in `en` and `ar`
- New frontend-only storage keys for visit state and audience preference

## Test Plan
- Unauthenticated users see the landing page on `/`
- Authenticated users see the returning-user fast path on `/`
- Audience selection swaps content correctly between `student` and `staff`
- Student messaging supports both regular students and student club leaders
- Staff messaging supports both admins and club leaders acting in staff capacity
- Returning users can skip intro and reach login quickly
- Signup CTA always routes correctly
- Arabic mode remains RTL-safe and readable on mobile and desktop
- Keyboard navigation and focus order work through the wizard and CTA flow

## Assumptions
- Audience choice is a content-personalization choice, not a source of truth for authorization.
- A club leader may reasonably identify as either `student` or `staff` before login, so the landing page must avoid hard role promises.
- Returning-user detection uses authenticated session first, then browser visit history.
- The landing page is conversion-focused and should hand off to existing Keycloak-based login/signup without replacing the auth flow.
- Recommended target file path: `docs/TODO/FR-011-interactive-landing-page.md`
