# FR-008 — Notification System (Triggers & Preferences)

**Priority:** High (blocks FR-002 and FR-005 notifications)
**Status:** Infrastructure exists, triggers completely missing

---

## Context

The `notifications` DB table, `NotificationModel`, and `email.service.ts` all exist. However, `NotificationModel.create()` and `sendEmail()` are never called anywhere in production code — only in tests. This plan wires all notification triggers, adds user preferences, and adds a scheduled reminder.

---

## Neo Components to Copy

Copy the following from `/workspaces/CMP/neo/src/components/ui/` into `apps/frontend/src/components/ui/`:

| Neo file | Purpose in this FR |
|---|---|
| `switch.tsx` | Notification preference toggles |
| `select.tsx` | Channel selector (in-app / email) |
| `badge.tsx` | Unread count badge on notification bell |
| `sonner.tsx` | Real-time toast for in-app notifications |

> **Adaptation note:** Neo components use Next.js (`next/link`). Replace with `react-router-dom` equivalents.

---

## Step 1 — Database Migration

**Create file:** `apps/backend/migrations/013_notification_preferences.sql`

```sql
CREATE TABLE notification_preferences (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,           -- e.g. 'event_approved', 'membership_approved', 'event_reminder'
  channel    TEXT NOT NULL DEFAULT 'in_app' CHECK(channel IN ('in_app','email')),
  enabled    INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, event_type, channel)
);

CREATE INDEX idx_notif_prefs_user ON notification_preferences(user_id);
```

---

## Step 2 — Backend: Notifications Service

**Create file:** `apps/backend/src/services/notifications.service.ts`

This is the single entry point for sending any notification.

```ts
import { NotificationModel } from '../models/notification.model';
import { sendEmail } from './email.service';
import { UserModel } from '../models/user.model';
import { db } from '../config/database';

type NotifType = 'info' | 'success' | 'warning' | 'error';

interface NotifyOptions {
  userId: number;
  eventType: string;       // e.g. 'event_approved'
  title: string;
  body: string;
  type?: NotifType;
}

export async function notify(opts: NotifyOptions): Promise<void> {
  const { userId, eventType, title, body, type = 'info' } = opts;

  // 1. In-app: check preference (default enabled)
  const inAppPref = getPreference(userId, eventType, 'in_app');
  if (inAppPref !== false) {
    NotificationModel.create({ user_id: userId, title, body, type });
  }

  // 2. Email: check preference (default disabled to avoid spam)
  const emailPref = getPreference(userId, eventType, 'email');
  if (emailPref === true) {
    const user = UserModel.findById(userId);
    if (user?.email) {
      await sendEmail({ to: user.email, subject: title, html: `<p>${body}</p>` });
    }
  }
}

// Convenience: notify multiple users (e.g. all admins)
export async function notifyRole(role: string, opts: Omit<NotifyOptions, 'userId'>): Promise<void> {
  const users = UserModel.list({ role });
  for (const user of users.data) {
    await notify({ ...opts, userId: user.id });
  }
}

function getPreference(userId: number, eventType: string, channel: string): boolean | null {
  const row = db
    .prepare('SELECT enabled FROM notification_preferences WHERE user_id=? AND event_type=? AND channel=?')
    .get(userId, eventType, channel) as { enabled: number } | undefined;
  return row ? row.enabled === 1 : null; // null = use default
}
```

---

## Step 3 — Wire Triggers

### 3a — Event submitted (notify admins)

**File:** `apps/backend/src/controllers/events.controller.ts` — `submitEvent`

After updating status to `submitted`:
```ts
await notifyRole('admin', {
  eventType: 'event_submitted',
  title: 'New Event Pending Approval',
  body: `Club "${clubName}" submitted the event "${event.title}" for review.`,
  type: 'info',
});
```

### 3b — Event approved / rejected (notify club leader)

**File:** `apps/backend/src/controllers/events.controller.ts` — `approveEvent` / `rejectEvent`

```ts
// On approve
await notify({
  userId: clubLeaderId,
  eventType: 'event_approved',
  title: 'Event Approved',
  body: `Your event "${event.title}" has been approved and is now published.`,
  type: 'success',
});

// On reject
await notify({
  userId: clubLeaderId,
  eventType: 'event_rejected',
  title: 'Event Rejected',
  body: `Your event "${event.title}" was rejected. Notes: ${notes}`,
  type: 'error',
});
```

### 3c — Event registration confirmed (notify student)

**File:** `apps/backend/src/controllers/events.controller.ts` — `registerForEvent`

```ts
await notify({
  userId: req.user!.id,
  eventType: 'registration_confirmed',
  title: 'Registration Confirmed',
  body: `You are registered for "${event.title}" on ${event.starts_at}.`,
  type: 'success',
});
```

### 3d — Membership approved / declined (notify student)

**File:** `apps/backend/src/controllers/membership.controller.ts` — `updateMembership`

```ts
// On approve
await notify({
  userId: targetUserId,
  eventType: 'membership_approved',
  title: 'Membership Approved',
  body: `Your membership request to "${clubName}" has been approved.`,
  type: 'success',
});

// On decline
await notify({
  userId: targetUserId,
  eventType: 'membership_declined',
  title: 'Membership Declined',
  body: `Your membership request to "${clubName}" was declined.`,
  type: 'error',
});
```

### 3e — Membership request received (notify club leader)

**File:** `apps/backend/src/controllers/membership.controller.ts` — `joinClub`

```ts
await notify({
  userId: club.leader_id,
  eventType: 'membership_requested',
  title: 'New Membership Request',
  body: `${student.name} has requested to join "${club.name}".`,
  type: 'info',
});
```

---

## Step 4 — Scheduled Event Reminders

**Create file:** `apps/backend/src/jobs/event-reminders.job.ts`

Use `node-cron` (add to dependencies: `npm install node-cron --workspace=apps/backend`).

Logic: Every hour, find all `published` events starting in the next 24 hours. For each registered student, send a reminder notification (deduplicated by checking if already sent).

```ts
import cron from 'node-cron';
import { db } from '../config/database';
import { notify } from '../services/notifications.service';

// Runs every hour
export function startEventReminderJob() {
  cron.schedule('0 * * * *', async () => {
    const upcoming = db.prepare(`
      SELECT e.id, e.title, e.starts_at, r.user_id
      FROM events e
      JOIN registrations r ON r.event_id = e.id AND r.status = 'confirmed'
      WHERE e.status = 'published'
        AND e.starts_at > datetime('now', '+23 hours')
        AND e.starts_at < datetime('now', '+25 hours')
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.user_id = r.user_id
            AND n.title LIKE 'Reminder:%'
            AND n.body LIKE '%' || e.id || '%'
        )
    `).all() as any[];

    for (const row of upcoming) {
      await notify({
        userId: row.user_id,
        eventType: 'event_reminder',
        title: `Reminder: ${row.title}`,
        body: `Event "${row.title}" starts at ${row.starts_at}. Don't forget to attend! (event_id:${row.id})`,
        type: 'info',
      });
    }
  });
}
```

Start the job in `apps/backend/src/app.ts`:
```ts
import { startEventReminderJob } from './jobs/event-reminders.job';
startEventReminderJob();
```

---

## Step 5 — Notification Preferences Endpoints

**File:** `apps/backend/src/controllers/notifications.controller.ts`

Add two handlers:

### `getPreferences`
```
GET /api/notifications/preferences
Auth: authenticated
```
Returns all preference rows for the current user.

### `updatePreference`
```
PATCH /api/notifications/preferences
Auth: authenticated
Body: { event_type: string, channel: 'in_app'|'email', enabled: boolean }
```
Upserts the preference row.

**File:** `apps/backend/src/routes/notifications.routes.ts`

Add:
```
GET  /preferences   → authenticate, getPreferences
PATCH /preferences  → authenticate, updatePreference
```

---

## Step 6 — Frontend: Notification Preferences UI

**File:** `apps/frontend/src/pages/NotificationsPage.tsx`

Add a "Preferences" tab (neo `Tabs`) alongside the notification list.

Inside the Preferences tab, render a table of event types with a neo `Switch` for each channel:

| Event | In-App | Email |
|---|---|---|
| Event approved / rejected | ✅ Switch | ✅ Switch |
| Registration confirmed | ✅ Switch | ✅ Switch |
| Membership approved / declined | ✅ Switch | ✅ Switch |
| Event reminder (24h before) | ✅ Switch | ✅ Switch |
| New membership request (leader) | ✅ Switch | ✅ Switch |

On toggle, call `updatePreference()` API.

---

## Step 7 — Frontend: Toast for New Notifications

**File:** `apps/frontend/src/App.tsx` (or root layout)

Add a polling mechanism (every 30s) using `useQuery` to fetch unread notification count. If count increases, fire a neo `Sonner` toast: "You have N new notification(s)."

Alternatively, show unread count as a `Badge` on the notification bell icon in the Topbar.

---

## Acceptance Criteria Checklist

- [ ] In-app notification created on: event submitted, approved, rejected, registration confirmed, membership requested/approved/declined
- [ ] Email sent when user has email channel enabled for that event type
- [ ] 24h reminder fires for registered students via cron job
- [ ] User can toggle preferences per event type per channel
- [ ] Delivery: `NotificationModel.create()` succeeds for all listed triggers
- [ ] Preferences default: in-app enabled, email disabled

---

## Files Summary

| Action | File |
|---|---|
| Create | `apps/backend/migrations/013_notification_preferences.sql` |
| Create | `apps/backend/src/services/notifications.service.ts` |
| Create | `apps/backend/src/jobs/event-reminders.job.ts` |
| Modify | `apps/backend/src/controllers/events.controller.ts` |
| Modify | `apps/backend/src/controllers/membership.controller.ts` |
| Modify | `apps/backend/src/controllers/notifications.controller.ts` |
| Modify | `apps/backend/src/routes/notifications.routes.ts` |
| Modify | `apps/backend/src/app.ts` |
| Modify | `apps/frontend/src/pages/NotificationsPage.tsx` |
| Modify | `apps/frontend/src/App.tsx` |
| Copy from neo | `switch.tsx`, `select.tsx`, `badge.tsx`, `sonner.tsx`, `tabs.tsx` |
