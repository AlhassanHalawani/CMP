# FR-007 — Event Calendar & Discovery

**Priority:** Medium
**Status:** Partial (grid/list view exists; missing calendar view, category filter, date-range filter, ICS export, seat display)

---

## Context

`EventsPage` shows events in a card grid with basic upcoming/past tabs. The FR requires a full calendar view, category and location filters, date-range filtering, ICS export, and remaining seat count display.

---

## Neo Components to Copy

Copy the following from `/workspaces/CMP/neo/src/components/ui/` into `apps/frontend/src/components/ui/`:

| Neo file | Purpose in this FR |
|---|---|
| `calendar.tsx` | Month-view calendar grid for event display |
| `select.tsx` | Category / club / location filter dropdowns |
| `popover.tsx` | Date range picker popover |
| `badge.tsx` | Event category and capacity badges |
| `tabs.tsx` | Toggle between list view and calendar view |
| `button.tsx` | "Export ICS" button |
| `card.tsx` | Event cards in list/grid view |

> **Adaptation note:** Neo components use Next.js (`next/link`). Replace with `react-router-dom` equivalents. The neo `calendar.tsx` uses `react-day-picker` — ensure it is installed (`npm install react-day-picker --workspace=apps/frontend`).

---

## Step 1 — Database Migration: Add Category to Events

**Create file:** `apps/backend/migrations/016_events_add_category.sql`

```sql
ALTER TABLE events ADD COLUMN category TEXT;
CREATE INDEX idx_events_category ON events(category);
```

Suggested category values (enforce in backend validation): `academic`, `sports`, `cultural`, `workshop`, `volunteer`, `social`, `other`.

---

## Step 2 — Backend: Update Event Model

**File:** `apps/backend/src/models/event.model.ts`

Update `list()` to accept additional filters:

```ts
static list(opts: {
  status?: string;
  clubId?: number;
  category?: string;
  location?: string;
  startsAfter?: string;   // ISO datetime
  endsBefore?: string;    // ISO datetime
  limit?: number;
  offset?: number;
}) { ... }
```

Add conditions:
```sql
AND category = :category          -- if provided
AND location LIKE '%' || :loc || '%'  -- if provided
AND starts_at >= :startsAfter     -- if provided
AND ends_at   <= :endsBefore      -- if provided
```

Update `count()` with the same new params.

---

## Step 3 — Backend: ICS Export Endpoint

**File:** `apps/backend/src/controllers/events.controller.ts`

### `exportEventIcs` — single event
```
GET /api/events/:id/ics
Auth: none (public)
```
Generate an iCalendar file for a single event:
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CMP//EN
BEGIN:VEVENT
UID:<event.id>@cmp.fcitcmp.com
SUMMARY:<event.title>
DTSTART:<event.starts_at in YYYYMMDDTHHMMSSZ>
DTEND:<event.ends_at in YYYYMMDDTHHMMSSZ>
LOCATION:<event.location>
DESCRIPTION:<event.description>
END:VEVENT
END:VCALENDAR
```
Respond with `Content-Type: text/calendar`.

### `exportCalendarIcs` — all upcoming published events
```
GET /api/events/calendar.ics
Auth: none (public)
```
Same format, multiple VEVENT blocks for all upcoming published events.

**File:** `apps/backend/src/routes/events.routes.ts`

Add:
```
GET /calendar.ics  → exportCalendarIcs   (no auth, place BEFORE /:id routes)
GET /:id/ics       → exportEventIcs      (no auth)
```

---

## Step 4 — Backend: Update listEvents Controller

**File:** `apps/backend/src/controllers/events.controller.ts`

Pass new query params to `EventModel.list()`:
```ts
const category   = req.query.category as string | undefined;
const location   = req.query.location as string | undefined;
const startsAfter = req.query.starts_after as string | undefined;
const endsBefore  = req.query.ends_before  as string | undefined;
```

---

## Step 5 — Frontend: API Client Update

**File:** `apps/frontend/src/api/events.ts`

Update `list()` to accept new filter params:
```ts
export const list = (params: {
  status?: string;
  club_id?: number;
  category?: string;
  location?: string;
  starts_after?: string;
  ends_before?: string;
  limit?: number;
  offset?: number;
}) => client.get('/events', { params });
```

---

## Step 6 — Frontend: EventsPage Overhaul

**File:** `apps/frontend/src/pages/EventsPage.tsx`

### View toggle
Add a neo `Tabs` with two tabs: **List View** and **Calendar View**.

### Filter bar (both views)
Add a horizontal filter row with:
- **Category** → neo `Select` (Academic, Sports, Cultural, Workshop, Volunteer, Social, Other, All)
- **Club** → neo `Select` (populated from `GET /api/clubs`)
- **Date range** → neo `Popover` containing the neo `Calendar` in range-selection mode
- **Search/Location** → plain text input (neo `Input`)

All filters are applied to the `useQuery(['events', filters], ...)` query.

### List view
Keep existing card grid. Add to each card:
- Category `Badge` (neo)
- Remaining seats display: `{event.capacity - registrationCount} seats left` or "Unlimited" if no capacity
- "Export ICS" link button per event → `GET /api/events/:id/ics`

### Calendar view
Use the neo `Calendar` component. Key adaptation:

```tsx
// Build a map: date (YYYY-MM-DD) → events[]
const eventsByDate = events.reduce((acc, ev) => {
  const day = ev.starts_at.slice(0, 10);
  acc[day] = [...(acc[day] ?? []), ev];
  return acc;
}, {});

// In the calendar, mark days with events using modifiers
// On day click, show a popover with that day's events
```

Below the calendar, show the selected day's events as a list.

### ICS calendar subscription
Add a small link at the bottom: "Subscribe to Calendar (ICS)" → points to `/api/events/calendar.ics`.

---

## Step 7 — Frontend: EventDetailPage

**File:** `apps/frontend/src/pages/EventDetailPage.tsx`

- Show category as a neo `Badge` next to the event title.
- Show remaining seats: `{capacity - confirmedCount}` or "Unlimited".
- Add "Add to Calendar" button → triggers download of `GET /api/events/:id/ics`.

---

## Acceptance Criteria Checklist

- [ ] Only published events appear in all discovery views
- [ ] Category filter narrows results correctly
- [ ] Location search narrows results
- [ ] Date range filter shows only events within the selected range
- [ ] Calendar view marks days that have events
- [ ] Clicking a day shows that day's events
- [ ] Per-event ICS export downloads a valid `.ics` file
- [ ] Calendar ICS feed at `/api/events/calendar.ics` imports into calendar apps
- [ ] Event cards display remaining seat count

---

## Files Summary

| Action | File |
|---|---|
| Create | `apps/backend/migrations/016_events_add_category.sql` |
| Modify | `apps/backend/src/models/event.model.ts` |
| Modify | `apps/backend/src/controllers/events.controller.ts` |
| Modify | `apps/backend/src/routes/events.routes.ts` |
| Modify | `apps/frontend/src/api/events.ts` |
| Modify | `apps/frontend/src/pages/EventsPage.tsx` |
| Modify | `apps/frontend/src/pages/EventDetailPage.tsx` |
| Copy from neo | `calendar.tsx`, `select.tsx`, `popover.tsx`, `badge.tsx`, `tabs.tsx`, `button.tsx`, `card.tsx` |
