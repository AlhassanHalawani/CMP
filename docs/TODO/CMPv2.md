# CMP v2 — Club and Student Achievements Plan

**Priority:** High
**Status:** Proposed

---

## Goal

Introduce a structured achievement and points system for both students and clubs so CMP can:

- reward consistent participation
- highlight club growth and healthy engagement
- surface progress on the right pages
- feed better KPI and leaderboard views

This should feel like an official recognition layer, not just a game. The system should reward verified activity, consistent contribution, and community growth while staying hard to abuse.

---

## Why This Fits the Current App

The current app already has the core signals needed for a first version:

- student achievements in `achievements`
- verified attendance in `attendance`
- club membership in `memberships`
- club and student KPI views in `KpiPage`
- club stats already shown on `ClubDetailPage`
- student achievement history already shown on `AchievementsPage`

What is missing is a unified achievement engine, a club achievement model, login streak tracking, progress-to-next-goal UI, and configurable scoring rules.

---

## Product Direction

### Recommendation

Build CMP v2 around two parallel tracks:

1. **Student achievements**
   Reward consistency, attendance, verified recognition, and streak behavior.
2. **Club achievements**
   Reward healthy membership growth, verified attendance, event output, and student recognition.

Each achievement should have:

- a clear title
- a short description
- a target entity type: `student` or `club`
- a threshold rule
- a points reward
- an unlock date
- progress data for locked achievements

---

## Metric Design Principles

Use these rules when deciding what earns points:

- count only verified behavior when possible
- prefer quality and consistency over raw spam volume
- give milestone points once per tier, not every time the number changes
- separate raw metrics from achievement unlocks
- make scoring configurable by admins later
- show progress transparently so users know how to improve

### Anti-abuse rules

- do not award points for unapproved events
- do not award points for pending memberships
- do not count duplicate same-day logins toward streak length
- do not count registrations alone as achievement points
- award milestone points once per threshold per entity

---

## Recommended Student Metrics

### Core student metrics

These are the most valuable metrics for a first release:

| Metric key | Source | Why it matters |
|---|---|---|
| `login_streak_current` | new login activity tracker | rewards consistency |
| `login_streak_best` | new login activity tracker | supports profile bragging rights |
| `verified_attendance_count` | `attendance` | rewards real participation |
| `club_achievement_count` | `achievements` | rewards recognized contribution |
| `active_membership_count` | `memberships` | rewards belonging and ongoing commitment |
| `club_diversity_count` | attendance + events | rewards participation across clubs without overvaluing it |

### Recommended student achievements and points

| Achievement | Rule | Points |
|---|---|---|
| First Login Streak | login 3 days in a row | 5 |
| Weekly Momentum | login 7 days in a row | 10 |
| Habit Builder | login 14 days in a row | 20 |
| Dedicated Member | login 30 days in a row | 40 |
| First Check-in | 1 verified attendance | 5 |
| Active Participant | 5 verified attendances | 15 |
| Campus Regular | 10 verified attendances | 30 |
| CMP Champion | 25 verified attendances | 60 |
| First Club Member | 1 active club membership | 10 |
| Community Connector | 2 active club memberships | 20 |
| Recognized Contributor | first club-awarded achievement | 20 |
| Multi-Award Student | 3 awarded achievements | 40 |
| Cross-Club Explorer | attend events from 3 different clubs | 20 |

### Notes

- `login_streak_current` is the only new behavior that requires brand-new tracking.
- attendance-based achievements are strong because CMP already verifies attendance.
- membership achievements should stay low-value so students are not encouraged to join clubs without participating.

---

## Recommended Club Metrics

### Core club metrics

These fit the current schema well and align with stakeholder value:

| Metric key | Source | Why it matters |
|---|---|---|
| `active_member_count` | `memberships` | tracks community growth |
| `published_event_count` | `events` | tracks delivery output |
| `verified_attendance_total` | `attendance` + `events` | tracks real turnout |
| `achievement_awards_count` | `achievements` | tracks student recognition |
| `attendance_per_event_avg` | derived | rewards quality, not just quantity |
| `attendance_per_member_ratio` | derived | rewards engagement density |

### Recommended club achievements and points

| Achievement | Rule | Points |
|---|---|---|
| Growing Club | 10 active members | 20 |
| Established Club | 25 active members | 50 |
| Major Community | 50 active members | 100 |
| Event Starter | 5 published events | 20 |
| Active Organizer | 10 published events | 45 |
| Signature Organizer | 20 published events | 90 |
| First 50 Attendees | 50 verified total attendances | 25 |
| Crowd Builder | 150 verified total attendances | 60 |
| Campus Magnet | 300 verified total attendances | 120 |
| Student Recognizer | 10 student achievements awarded | 20 |
| Talent Builder | 25 student achievements awarded | 50 |
| High Engagement Club | average verified attendance per event >= 20 with at least 5 events | 40 |
| Strong Community | attendance per active member ratio >= 2.0 with at least 10 members | 40 |

### Notes

- club achievements should not reward creating many tiny low-quality events.
- ratio-based achievements help prevent gaming the system with inflated event counts.
- `achievement_awards_count` should count real student recognition, not manual point inflation.

---

## Points and Leaderboard Strategy

### Recommended scoring model

Use a hybrid model:

- **Achievement points** come from unlocked milestones
- **KPI score** remains a separate analytics view
- **Leaderboard score** for clubs can combine achievement points and KPI score with explicit weights

### Recommended default formula

For clubs:

`club_total_score = achievement_points + weighted_kpi_score`

Recommended starting weights:

- `achievement_points`: 60%
- `attendance_count`: 20%
- `member_count`: 10%
- `achievement_count`: 10%

For students:

`student_total_score = student_achievement_points`

This keeps student scoring simple at first and avoids a second, competing student ranking formula.

---

## Where the System Should Appear

### Student-facing pages

**`/achievements` — `AchievementsPage.tsx`**

This should become the main student achievement center:

- current total points
- current login streak and best streak
- unlocked student achievements
- progress cards for next achievements
- existing PDF report download

**`/profile` — `ProfilePage.tsx`**

Show a compact recognition summary:

- total points
- current streak
- top 3 badges
- latest unlocked achievement

**`/dashboard` — `DashboardPage.tsx`**

Add a small personal motivation panel:

- next milestone
- recent unlock
- quick streak status

### Club-facing pages

**`/clubs/:id` — `ClubDetailPage.tsx`**

This is the best page for club achievements:

- club total points
- unlocked club achievements
- progress to next member milestone
- progress to next attendance milestone
- “how this club earns points” explainer

**`/leaderboard` — `LeaderboardPage.tsx`**

Show club ranking based on club total score:

- rank
- total points
- top badges
- quick explanation of score sources

### Admin and analytics pages

**`/kpi` — `KpiPage.tsx`**

Keep this page as the official analytics and governance page:

- raw KPI metrics
- club and student rankings
- achievement points breakdown
- config visibility later

Admin should be able to compare:

- raw KPI numbers
- unlocked achievements
- computed total points

---

## Data Model Plan

### New tables

#### 1. `achievement_definitions`

Defines what can be unlocked.

Suggested fields:

- `id`
- `entity_type` (`student` or `club`)
- `key`
- `title`
- `title_ar`
- `description`
- `description_ar`
- `metric_key`
- `threshold_value`
- `points`
- `icon`
- `is_active`
- `sort_order`
- `created_at`

#### 2. `achievement_unlocks`

Stores unlocked achievements for either a student or a club.

Suggested fields:

- `id`
- `definition_id`
- `entity_type`
- `user_id` nullable
- `club_id` nullable
- `metric_value_at_unlock`
- `unlocked_at`
- `awarded_by` nullable for manual/admin overrides

Constraint:

- unique unlock per `definition_id + user_id`
- unique unlock per `definition_id + club_id`

#### 3. `user_login_activity`

Tracks one row per user per login day.

Suggested fields:

- `id`
- `user_id`
- `login_date`
- `source`
- `created_at`

Constraint:

- unique `user_id + login_date`

### Optional later table

#### 4. `achievement_progress_snapshots`

Useful if progress queries become expensive, but not required in v1 of CMP v2.

---

## Backend Plan

### Phase 1: Achievement engine foundation

Create:

- achievement definition model
- achievement unlock model
- achievement rules evaluator service

The evaluator should accept:

- entity type
- entity id
- changed metric keys

Then it should:

- compute current metric values
- compare against active definitions
- insert any newly unlocked achievements
- return unlock results for notifications and UI refresh

### Phase 2: Login streak tracking

Hook login success into a backend endpoint or auth sync flow and record one login per user per day.

Important note:

- because auth is handled with Keycloak, CMP may need either:
- a post-login sync endpoint called by the frontend after successful auth
- or a Keycloak event/webhook integration if available later

For v2, the simplest path is:

- on authenticated app load, call a lightweight `POST /api/users/me/login-activity`
- backend upserts today’s login row
- evaluator recalculates streak-related achievements

### Phase 3: Club metrics service

Add a club achievement metrics service that computes:

- active member count
- published event count
- verified attendance total
- achievement awards count
- average attendance per event
- attendance per member ratio

### Phase 4: Student metrics service

Add a student achievement metrics service that computes:

- current streak
- best streak
- verified attendance count
- club achievement count
- active memberships
- cross-club participation count

### Phase 5: Notification hooks

When a new achievement unlocks:

- create in-app notification
- optionally show toast on next page load

This fits the existing notification system direction.

---

## Frontend Plan

### `AchievementsPage.tsx`

Expand from a report/history page into a full student achievements page.

Add:

- summary hero card with total points and streak
- unlocked badge grid
- “next up” progress section
- filter toggle between official awards and system achievements

### `ProfilePage.tsx`

Add a compact achievement summary card for students.

### `ClubDetailPage.tsx`

Add a new tab or section:

- `Achievements`

Display:

- club badges
- member growth progress
- attendance growth progress
- explanation of club score sources

### `DashboardPage.tsx`

Add:

- recent unlock card for students
- club spotlight card for leaders

### `LeaderboardPage.tsx`

Upgrade from simple points list to recognition-driven leaderboard:

- total score
- badges earned
- optional filter by semester later

### `KpiPage.tsx`

Keep analytics-first, but add:

- achievement points columns
- club achievement count
- student achievement count

---

## API Plan

### New or expanded endpoints

#### Student endpoints

- `GET /api/achievements/user/:userId/system`
- `GET /api/achievements/user/:userId/progress`
- `GET /api/users/me/achievement-summary`
- `POST /api/users/me/login-activity`

#### Club endpoints

- `GET /api/achievements/club/:clubId/system`
- `GET /api/achievements/club/:clubId/progress`
- `GET /api/clubs/:clubId/achievement-summary`

#### Admin endpoints

- `GET /api/achievement-definitions`
- `POST /api/achievement-definitions`
- `PATCH /api/achievement-definitions/:id`
- `POST /api/achievements/recompute`

### Recompute strategy

Support both:

- event-driven recompute after attendance, membership approval, manual achievement creation, and login
- admin-triggered full recompute for data repair

---

## Rollout Plan

### Phase A

Deliver student achievements first:

- login streaks
- attendance milestones
- achievement count milestones
- upgraded `AchievementsPage`

### Phase B

Deliver club achievements:

- member milestones
- attendance milestones
- published event milestones
- club achievement section on `ClubDetailPage`

### Phase C

Unify scoring across leaderboard and KPI pages:

- achievement points in rankings
- explanations for score composition

### Phase D

Admin configuration:

- editable thresholds
- editable points
- enable or disable specific achievements

---

## Acceptance Criteria

- [ ] Students can unlock system achievements based on verified behavior
- [ ] Clubs can unlock milestone achievements based on verified club metrics
- [ ] Login streaks are tracked once per day and survive app refreshes
- [ ] `AchievementsPage` clearly shows unlocked achievements, progress, and score
- [ ] `ClubDetailPage` clearly shows club achievements and next milestones
- [ ] `LeaderboardPage` explains why clubs have their scores
- [ ] KPI analytics and achievement points can be compared without conflicting formulas
- [ ] Achievement rules can be recomputed safely after a bug fix or backfill

---

## Recommended Defaults to Start With

If no custom preference is provided, start with these defaults:

- keep student scoring simple and achievement-based only
- keep club scoring hybrid: achievement points plus weighted KPI score
- use 3, 7, 14, and 30 days for login streak milestones
- use 10, 25, and 50 members for club membership milestones
- use 5, 10, and 25 attendances for student activity milestones
- award milestone points once, never repeatedly for the same threshold

---

## Decisions I Want From You

These are the main preference choices where your opinion should shape the final build:

1. Should club leaderboards be based only on achievement points, or a hybrid of achievement points plus KPI metrics?
2. Do you want login streaks to reset fully after one missed day, or allow one grace day?
3. Should club membership milestones be aggressive (`10/25/50`) or more elite (`15/30/60`)?
4. Should student points reward multi-club participation, or should we keep the system focused on depth in one club?
5. Do you want admins to be able to manually grant or revoke system achievements, or should everything stay automatic?

My recommendation:

- hybrid club scoring
- strict streak reset with no grace day
- `10/25/50` club member milestones
- light reward for multi-club participation
- admin manual grant allowed, revoke only with audit log

---

## Implementation Notes for This Repo

Likely files involved once implementation starts:

- `apps/backend/src/models/achievement.model.ts`
- new achievement definition and unlock models
- `apps/backend/src/models/membership.model.ts`
- `apps/backend/src/models/attendance.model.ts`
- `apps/backend/src/controllers/achievements.controller.ts`
- `apps/backend/src/controllers/kpi.controller.ts`
- `apps/backend/src/controllers/users.controller.ts`
- `apps/backend/src/routes/achievements.routes.ts`
- `apps/backend/src/routes/kpi.routes.ts`
- `apps/frontend/src/pages/AchievementsPage.tsx`
- `apps/frontend/src/pages/ClubDetailPage.tsx`
- `apps/frontend/src/pages/ProfilePage.tsx`
- `apps/frontend/src/pages/DashboardPage.tsx`
- `apps/frontend/src/pages/LeaderboardPage.tsx`
- `apps/frontend/src/pages/KpiPage.tsx`

---

## Summary

CMP v2 should add a proper achievement engine, not just more counters. The strongest first release is:

- student achievements around streaks, attendance, and recognition
- club achievements around members, attendance, events, and recognition
- clear progress UI on the pages users already visit
- a scoring model that supports recognition without encouraging spam
