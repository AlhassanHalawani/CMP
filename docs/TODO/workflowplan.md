# Club Membership, Roles, Tasks, Followers, and KPI Workflow Plan

**Priority:** High  
**Status:** Planned  
**Goal:** Upgrade the current club workflow so students can either become approved club members who help run the club, or follow a club as non-members to receive event updates. Followers should also become a visible KPI.

---

## Current Baseline

The app already has a strong first version of club membership:

- students can request to join a club
- club leaders/admins can approve or decline requests
- memberships move through `pending`, `active`, and `inactive`
- active members are counted in club stats and KPI logic
- member-only events already exist
- club detail pages already show join/leave controls and a members management tab

This plan builds on that baseline instead of replacing it.

---

## Product Model

### Club member

A club member is an approved student who is part of the club organization. Members should be able to:

- affect club decision making
- receive task assignments
- hold predefined operational roles
- contribute to event, workshop, lecture, media, and community work
- appear in club member rosters and member KPIs

### Club follower

A follower is not part of the club organization. A follower should be able to:

- follow or unfollow a club without leader approval
- receive the club's latest events in their feed
- improve club reach KPIs
- stay separate from membership, roles, tasks, and decision permissions

### Club leader

A club leader manages the internal club. The leader should be able to:

- approve/decline membership requests
- assign member roles
- assign tasks to active members
- track task progress
- view followers and follower KPIs
- use member and follower data for club decisions

---

## Predefined Member Roles

V1 should ship with a fixed role catalog so the workflow is useful immediately without requiring a custom role builder.

Recommended roles:

| Role key | Display name | Typical responsibility |
|---|---|---|
| `social_media_manager` | Social Media Manager | Creates and publishes club posts, including X.com posts |
| `event_host` | Event Host | Hosts events, lectures, and workshops |
| `workshop_facilitator` | Workshop Facilitator | Leads hands-on workshops |
| `lecture_coordinator` | Lecture Coordinator | Coordinates speakers, rooms, and lecture details |
| `content_creator` | Content Creator | Creates posters, captions, recaps, and media assets |
| `logistics_coordinator` | Logistics Coordinator | Handles venue setup, materials, and on-site flow |
| `registration_coordinator` | Registration Coordinator | Manages attendee lists and check-in support |
| `sponsorship_coordinator` | Sponsorship Coordinator | Coordinates sponsors, partners, and external support |
| `member_coordinator` | Member Coordinator | Helps onboard and coordinate club members |

V1 can allow one primary role plus optional extra roles per member. If implementation time is tight, start with one primary role and design the schema so multiple roles can be added later.

---

## Phase 1 — Domain and Database Design

### 1.1 Extend memberships with member role metadata

**Recommended migration:** `apps/backend/migrations/031_membership_roles.sql`

Add fields to `memberships`:

```sql
ALTER TABLE memberships ADD COLUMN primary_role TEXT;
ALTER TABLE memberships ADD COLUMN role_notes TEXT;
ALTER TABLE memberships ADD COLUMN approved_at TEXT;
ALTER TABLE memberships ADD COLUMN approved_by INTEGER REFERENCES users(id);
```

Rules:

- `primary_role` is nullable while membership is pending.
- only active members can receive roles.
- when a pending member is approved, set `approved_at` and `approved_by`.
- declining or leaving the club should keep role history but make the member inactive.

### 1.2 Add optional many-to-many roles table

If multiple roles are needed in V1, add:

```sql
CREATE TABLE membership_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  membership_id INTEGER NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  assigned_by INTEGER REFERENCES users(id),
  UNIQUE(membership_id, role_key)
);
```

If V1 uses only `primary_role`, keep this table for V1.1.

### 1.3 Add club followers

**Recommended migration:** `apps/backend/migrations/032_create_club_followers.sql`

```sql
CREATE TABLE club_followers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  muted_at TEXT,
  UNIQUE(club_id, user_id)
);

CREATE INDEX idx_club_followers_club ON club_followers(club_id);
CREATE INDEX idx_club_followers_user ON club_followers(user_id);
```

Rules:

- following does not require approval.
- followers are not members.
- a user may follow a club and later request membership.
- when a follower becomes an active member, decide whether they remain a follower automatically. Recommended V1 rule: keep the follow record so their feed still works and follower KPI remains stable.

### 1.4 Add club tasks

**Recommended migration:** `apps/backend/migrations/033_create_club_tasks.sql`

```sql
CREATE TABLE club_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','done','cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high')),
  due_at TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  assigned_to INTEGER REFERENCES users(id),
  role_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX idx_club_tasks_club ON club_tasks(club_id);
CREATE INDEX idx_club_tasks_assigned_to ON club_tasks(assigned_to);
CREATE INDEX idx_club_tasks_event ON club_tasks(event_id);
CREATE INDEX idx_club_tasks_status ON club_tasks(status);
```

Rules:

- only active club members can be assigned tasks.
- tasks can be linked to events, workshops, lectures, or general club operations.
- `role_key` can suggest the type of work, even if the task is assigned to a specific member.

---

## Phase 2 — Backend Models and Services

### 2.1 Membership role support

**Files:**

- `apps/backend/src/models/membership.model.ts`
- `apps/backend/src/controllers/membership.controller.ts`

Add model methods:

```ts
updateRole(membershipId: number, roleKey: string | null, roleNotes?: string): Membership
approve(membershipId: number, approvedBy: number): Membership
listActiveAssignableMembers(clubId: number): MembershipWithUser[]
```

Controller changes:

- approval should set `status = active`, `approved_at`, and `approved_by`
- add an endpoint to assign or clear a member role
- validate role keys against the predefined role catalog
- audit-log role assignment and role removal
- notify the student when their role changes

Recommended route:

```txt
PATCH /api/clubs/:id/members/:userId/role
Auth: admin or owning club_leader
Body: { primary_role: string | null, role_notes?: string }
```

### 2.2 Role catalog endpoint

Create a small shared role catalog in the backend, then expose it:

```txt
GET /api/clubs/member-roles
Auth: authenticated
```

Return:

```json
{
  "data": [
    {
      "key": "social_media_manager",
      "label": "Social Media Manager",
      "description": "Creates and publishes club posts, including X.com posts"
    }
  ]
}
```

This keeps frontend labels consistent with backend validation.

### 2.3 Club follower model/controller

**Create files:**

- `apps/backend/src/models/clubFollower.model.ts`
- `apps/backend/src/controllers/clubFollowers.controller.ts`

Recommended endpoints:

```txt
POST   /api/clubs/:id/follow
DELETE /api/clubs/:id/follow
GET    /api/clubs/:id/follow/me
GET    /api/clubs/:id/followers
```

Auth rules:

- any authenticated student can follow/unfollow
- admins and owning club leaders can list followers
- public club stats can include follower counts without exposing follower identities

Backend rules:

- return 409 if the user already follows the club
- return 404 when unfollowing a club the user does not follow
- notify is not required for every follow in V1, but follower count should update

### 2.4 Club task model/controller

**Create files:**

- `apps/backend/src/models/clubTask.model.ts`
- `apps/backend/src/controllers/clubTasks.controller.ts`

Recommended endpoints:

```txt
GET    /api/clubs/:id/tasks
POST   /api/clubs/:id/tasks
PATCH  /api/clubs/:id/tasks/:taskId
DELETE /api/clubs/:id/tasks/:taskId
GET    /api/me/club-tasks
```

Auth rules:

- admin and owning club leader can create, assign, update, cancel, and delete tasks
- assigned active member can view their tasks
- assigned active member can move their task between `todo`, `in_progress`, and `done`
- assigned member cannot reassign tasks, delete tasks, or change club/event ownership

Validation:

- `assigned_to` must be an active member of the same club
- `event_id`, when present, must belong to the same club
- completed tasks should set `completed_at`
- reopening a task should clear `completed_at`

Notifications:

- notify member when assigned a task
- notify member when task details or due date change
- optionally notify club leader when a task is marked done

---

## Phase 3 — Feed and Notification Workflow

### 3.1 Follower event feed

Add a feed endpoint for students:

```txt
GET /api/feed/events
Auth: authenticated
```

Recommended response:

- upcoming published events from followed clubs
- optionally include member-only events, but mark them clearly as members-only
- sort by nearest upcoming date first
- support pagination

Suggested implementation:

- join `events` to `club_followers`
- filter `events.status = 'published'`
- filter future events by `starts_at >= now`
- include club name/logo for feed cards

### 3.2 Publish-time follower notifications

When an event becomes published:

- notify followers of the club
- include event title, club name, and target URL
- avoid duplicate notifications if an event is edited while already published

Implementation option:

- add `events.published_at` if not already present
- send follower notifications only on transition to `published`

### 3.3 Feed separation

Student home/dashboard should eventually show:

- followed club events
- events from clubs where the student is an active member
- assigned club tasks
- membership request status

The first V1 feed can be only followed club events plus member club events.

---

## Phase 4 — Frontend Experience

### 4.1 Club detail page

**File:** `apps/frontend/src/pages/ClubDetailPage.tsx`

Add follower controls next to membership controls:

- `Follow` button when the current user is not following
- `Following` state with an `Unfollow` option
- do not hide follow just because the student is not a member
- show follower count in the stats row

Recommended UX:

- `Join Club` means "I want to become a member and help run this club."
- `Follow` means "Show this club's events in my feed."
- keep the two actions visually separate so students understand the difference.

### 4.2 Members management tab

Extend the existing Members tab:

- add `Role` column
- add role filter
- add status filter: pending, active, inactive
- show pending requests first
- add an inline role selector for active members
- add a compact "Assign Task" action for active members

Suggested columns:

| Member | Email | Status | Role | Requested | Actions |
|---|---|---|---|---|---|

Actions:

- pending: Approve, Decline
- active: Assign Role, Assign Task, Set Inactive
- inactive: Reopen Request or no action, depending on product decision

### 4.3 Tasks tab for club leaders

Add a `Tasks` tab on club detail for admins and owning club leaders.

Task list should support:

- status filter
- assignee filter
- role filter
- event filter
- create task dialog
- edit task dialog
- mark done/cancel actions

Create task fields:

- title
- description
- assignee
- suggested role
- related event
- priority
- due date

### 4.4 Student task view

Add a student-facing task surface:

- either a card on `DashboardPage`
- or a dedicated `My Club Tasks` page

The student should see:

- assigned tasks
- club name
- related event if any
- due date
- status
- controls to mark in progress/done

### 4.5 Feed page/dashboard section

Add a student feed section:

- latest/upcoming events from followed clubs
- event cards with club identity
- members-only badge when relevant
- empty state that suggests following clubs

---

## Phase 5 — KPI Expansion

### 5.1 Add follower count to club stats

**Files:**

- `apps/backend/src/controllers/clubs.controller.ts`
- `apps/frontend/src/pages/ClubDetailPage.tsx`
- `apps/frontend/src/pages/DashboardPage.tsx`
- `apps/frontend/src/pages/KpiPage.tsx`

Add:

- `followers_count`
- `new_followers_last_30_days`
- `follower_to_member_conversion_rate`

Recommended formula:

```txt
follower_to_member_conversion_rate =
active_members / followers_count * 100
```

Guard against divide-by-zero.

### 5.2 Add follower count to KPI overview

**Files:**

- `apps/backend/src/models/kpi.model.ts`
- `apps/backend/src/controllers/kpi.controller.ts`
- `apps/frontend/src/api/kpi.ts`
- `apps/frontend/src/components/KpiOverviewSection.tsx`

Add platform and club-scoped metrics:

- total followers
- followers by club
- follower growth over last 6 months
- follower-to-attendance conversion if useful later

### 5.3 Add task KPIs

Task KPIs are useful for club leader operations:

- open tasks
- overdue tasks
- completed tasks this month
- average completion time
- tasks by role

V1 can show these only on club leader dashboard. Admin KPI page can get aggregate task KPIs in V1.1.

### 5.4 Keep member KPIs separate from follower KPIs

Important reporting rule:

- members measure internal operating capacity
- followers measure audience/reach
- attendance measures actual participation

Do not combine followers and members into one "engagement" number without showing the underlying values.

---

## Phase 6 — Permissions and Decision-Making

### 6.1 Decision participation

Because members "affect decision making", introduce this in small steps:

V1:

- members are visible in roster
- members have roles and tasks
- leader can use member list for planning

V1.1:

- add simple club polls or decisions
- active members can vote
- followers cannot vote
- club leader/admin can create and close decisions

Possible future table:

```sql
CREATE TABLE club_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
  created_by INTEGER NOT NULL REFERENCES users(id),
  closes_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Keep voting out of V1 unless the current sprint explicitly includes decision tools.

### 6.2 Authorization matrix

| Action | Follower | Pending member | Active member | Club leader | Admin |
|---|---:|---:|---:|---:|---:|
| Receive public event feed | Yes | Yes | Yes | Yes | Yes |
| Request membership | Yes | Already pending | Already member | No | No |
| Vote in club decisions | No | No | Future V1.1 | Manage | Manage |
| View own assigned tasks | No | No | Yes | Yes | Yes |
| Update own task status | No | No | Yes | Yes | Yes |
| Assign roles/tasks | No | No | No | Own club | Any club |
| Approve members | No | No | No | Own club | Any club |
| View follower identities | No | No | No | Own club | Any club |

---

## Phase 7 — API Client and Types

### 7.1 Frontend API files

Create:

- `apps/frontend/src/api/clubFollowers.ts`
- `apps/frontend/src/api/clubTasks.ts`

Extend:

- `apps/frontend/src/api/memberships.ts`
- `apps/frontend/src/api/clubs.ts`
- `apps/frontend/src/api/kpi.ts`

Recommended methods:

```ts
followClub(clubId: number)
unfollowClub(clubId: number)
getMyFollow(clubId: number)
listFollowers(clubId: number)
getFeedEvents()
listClubTasks(clubId: number, filters)
createClubTask(clubId: number, payload)
updateClubTask(clubId: number, taskId: number, payload)
deleteClubTask(clubId: number, taskId: number)
getMyClubTasks()
assignMemberRole(clubId: number, userId: number, payload)
```

### 7.2 Shared TypeScript types

Add frontend types for:

- `MemberRole`
- `MembershipWithRole`
- `ClubFollower`
- `ClubTask`
- `FeedEvent`
- extended `ClubStats`
- extended KPI overview response

---

## Phase 8 — Tests

### Backend integration tests

Add tests for:

- student can follow and unfollow a club
- duplicate follow returns 409
- follower count appears in club stats
- follower events appear in student feed
- pending member cannot receive a task
- active member can receive a task
- assigned member can mark own task done
- assigned member cannot reassign task
- club leader cannot manage tasks/members/followers for another club
- member role assignment rejects invalid role keys
- membership approval sets `approved_at` and `approved_by`
- KPI overview includes follower count

### Frontend tests or manual QA

Cover:

- follow/unfollow state on club detail
- join request and follow can coexist
- member role selector only appears for active members
- task dialog validates assignee
- student dashboard shows assigned tasks
- feed shows followed club events
- KPI cards display followers distinctly from active members

---

## Phase 9 — Rollout Order

Recommended implementation order:

1. Add database migrations for roles, followers, and tasks.
2. Extend membership approval metadata and role assignment.
3. Add follower API and follower count in club stats.
4. Add follow/unfollow UI on club detail.
5. Add feed endpoint and student feed UI.
6. Add task API.
7. Add leader task management UI.
8. Add student assigned task UI.
9. Add follower and task KPIs.
10. Add tests and documentation cleanup.

This order gives value early: users can follow clubs and leaders can see follower KPIs before the full task management workflow is finished.

---

## Acceptance Criteria

- [ ] Student can request to become a club member.
- [ ] Club leader can approve or decline the membership request.
- [ ] Approved members become active club members.
- [ ] Active members can be assigned predefined roles.
- [ ] Active members can be assigned club tasks.
- [ ] Tasks can be tracked through `todo`, `in_progress`, `done`, and `cancelled`.
- [ ] Non-members can follow a club without approval.
- [ ] Followers receive latest/upcoming club events in their feed.
- [ ] Followers are counted separately from active members.
- [ ] Follower count appears in club stats and KPI screens.
- [ ] Club leaders can see member roles, pending requests, tasks, and follower count for their own club.
- [ ] Admins can see and manage this workflow across all clubs.
- [ ] Permission checks prevent a leader from managing another club's members, followers, roles, or tasks.

---

## Open Product Decisions

- Should active members automatically follow their club, or should following remain an explicit choice?
- Should a member be allowed to hold multiple predefined roles in V1?
- Should club followers receive notifications for every published event, or only see events in the feed?
- Should followers be able to mute a club while still counting as followers?
- Should decision-making be implemented as polls/votes in V1.1, or stay as an offline process supported by member lists and tasks?
- Should role names be fully translated in the backend response, or should frontend translation files own display labels?

