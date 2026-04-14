# FR-010 — Attendance Report for Club Managers

**Priority:** Medium
**Status:** Partial (JSON attendance list exists per event; missing CSV/PDF export, date-range reports, no-show detection, and frontend export UI)

---

## Context

`GET /api/attendance/:eventId` returns a JSON list of attendees for a single event. The FR requires club managers to generate exportable (CSV/PDF) attendance summaries, filter by attendance status (present vs. no-show), and report across a date range.

---

## Neo Components to Copy

Copy the following from `/workspaces/CMP/neo/src/components/ui/` into `apps/frontend/src/components/ui/`:

| Neo file | Purpose in this FR |
|---|---|
| `table.tsx` | Attendance and no-show data tables |
| `button.tsx` | Export CSV / Export PDF buttons |
| `select.tsx` | Status filter (Present / No-show / All) |
| `popover.tsx` | Date-range picker |
| `calendar.tsx` | Date range selection (used inside popover) |
| `badge.tsx` | Present / No-show status badges |
| `tabs.tsx` | Present tab vs No-show tab |

> **Adaptation note:** Neo components use Next.js (`next/link`). Replace with `react-router-dom` equivalents.

---

## Step 1 — Backend: Update Attendance Controller

**File:** `apps/backend/src/controllers/attendance.controller.ts`

### 1a — Add format + status params to `getAttendanceList`
```
GET /api/attendance/:eventId?format=csv|pdf&status=present|no_show
```

**No-show detection:**
A "no-show" is a user who has a `confirmed` registration but no attendance record.

```sql
-- Present (existing logic)
SELECT u.name, u.email, a.checked_in_at, a.method
FROM attendance a
JOIN users u ON u.id = a.user_id
WHERE a.event_id = ?

-- No-show
SELECT u.name, u.email, r.registered_at, NULL AS checked_in_at
FROM registrations r
JOIN users u ON u.id = r.user_id
LEFT JOIN attendance a ON a.event_id = r.event_id AND a.user_id = r.user_id
WHERE r.event_id = ? AND r.status = 'confirmed' AND a.id IS NULL
```

**Filter by status:**
- `?status=present` → only attendance records
- `?status=no_show` → only registrations with no attendance
- default / `?status=all` → both combined

**CSV export:**
```ts
if (format === 'csv') {
  const rows = [['Name','Email','Status','Time','Method']];
  present.forEach(r => rows.push([r.name, r.email, 'Present', r.checked_in_at, r.method]));
  noShows.forEach(r => rows.push([r.name, r.email, 'No-show', r.registered_at, '—']));
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=attendance-event-${eventId}.csv`);
  return res.send(csv);
}
```

**PDF export:**
Add `generateAttendanceReport(event, present, noShows)` to `apps/backend/src/services/pdf.service.ts`.

PDF sections:
- Header: "Attendance Report — <event title>" | Date: <event.starts_at> | Club: <club name>
- Summary: Total Registered, Present (N), No-show (N), Attendance Rate (%)
- Present table: Name | Email | Check-in Time | Method
- No-show table: Name | Email | Registered At

---

## Step 2 — Backend: Date-Range Multi-Event Report

**File:** `apps/backend/src/controllers/attendance.controller.ts`

Add a new handler:

### `getClubAttendanceReport`
```
GET /api/attendance?club_id=X&starts_after=YYYY-MM-DD&ends_before=YYYY-MM-DD&format=csv|pdf
Auth: admin or club_leader (club_leader scoped to own club)
```

SQL:
```sql
SELECT e.title, e.starts_at, u.name, u.email,
       CASE WHEN a.id IS NOT NULL THEN 'Present' ELSE 'No-show' END AS status,
       a.checked_in_at, a.method
FROM registrations r
JOIN events e ON e.id = r.event_id
JOIN users u ON u.id = r.user_id
LEFT JOIN attendance a ON a.event_id = r.event_id AND a.user_id = r.user_id
WHERE e.club_id = ?
  AND e.status = 'published'
  AND e.starts_at >= ?
  AND e.ends_at   <= ?
  AND r.status = 'confirmed'
ORDER BY e.starts_at, u.name
```

Return JSON, CSV, or PDF based on `?format` param.

**File:** `apps/backend/src/routes/attendance.routes.ts`

Add:
```
GET /   → authenticate, requireRole('admin','club_leader'), getClubAttendanceReport
```
(with `club_id`, `starts_after`, `ends_before`, `format` query params)

Note: place this route before `/:eventId` to avoid param conflicts.

---

## Step 3 — Frontend: API Client

**File:** `apps/frontend/src/api/attendance.ts`

Update:
```ts
export const listAttendance = (eventId: number, params?: {
  format?: 'json' | 'csv' | 'pdf';
  status?: 'present' | 'no_show' | 'all';
}) => client.get(`/attendance/${eventId}`, { params });

export const getClubAttendanceReport = (params: {
  club_id: number;
  starts_after: string;
  ends_before: string;
  format?: 'json' | 'csv' | 'pdf';
}) => client.get('/attendance', { params });
```

---

## Step 4 — Frontend: EventAttendancePage

**File:** `apps/frontend/src/pages/EventAttendancePage.tsx`

### Status tabs
Replace the single attendance list with neo `Tabs`:
- **"Present"** tab — shows attendance records with check-in time and method
- **"No-shows"** tab — shows registered students who did not check in

Each tab uses a neo `Table` with:
- Name | Email | Status Badge | Time | Method

### Export buttons
Add an export row above the table:
- **"Export CSV"** button → opens `GET /api/attendance/:eventId?format=csv&status=all`
- **"Export PDF"** button → opens `GET /api/attendance/:eventId?format=pdf&status=all`

For authenticated download (Bearer token required), use `fetch()` + Blob + `URL.createObjectURL()` pattern:
```ts
const blob = await client.get(`/attendance/${eventId}?format=csv`, { responseType: 'blob' });
const url = URL.createObjectURL(blob.data);
const a = document.createElement('a'); a.href = url; a.download = 'attendance.csv'; a.click();
```

### Summary card
Above the table, show a summary card:
- Total Registered: N
- Present: N | No-show: N | Attendance Rate: N%

---

## Step 5 — Frontend: Club Manager Dashboard (date-range report)

**File:** `apps/frontend/src/pages/KpiPage.tsx` or a new `ReportsPage.tsx`

Add a "Attendance Report" section (or tab) for club leaders:

- **Date range picker** using neo `Popover` + `Calendar` (range mode)
- **Generate Report** button
- On click, call `getClubAttendanceReport(...)` with the selected range
- Show results in a neo `Table`
- Export CSV / PDF buttons

If creating a new page:
- Route: `/reports` (club_leader and admin)
- Add to sidebar navigation

---

## Acceptance Criteria Checklist

- [ ] Report includes event details, total registered, present count, no-show count
- [ ] Status filter shows only present or only no-shows correctly
- [ ] CSV export matches on-screen data
- [ ] PDF export matches on-screen data
- [ ] Date range report works across multiple events for the club
- [ ] Club leader can only access their own club's data
- [ ] No-show list = confirmed registrations with no attendance record
- [ ] Attendance rate percentage displayed

---

## Files Summary

| Action | File |
|---|---|
| Modify | `apps/backend/src/controllers/attendance.controller.ts` |
| Modify | `apps/backend/src/routes/attendance.routes.ts` |
| Modify | `apps/backend/src/services/pdf.service.ts` |
| Modify | `apps/frontend/src/api/attendance.ts` |
| Modify | `apps/frontend/src/pages/EventAttendancePage.tsx` |
| Create (optional) | `apps/frontend/src/pages/ReportsPage.tsx` |
| Copy from neo | `table.tsx`, `button.tsx`, `select.tsx`, `popover.tsx`, `calendar.tsx`, `badge.tsx`, `tabs.tsx` |
