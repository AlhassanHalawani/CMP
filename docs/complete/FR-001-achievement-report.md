# FR-001 — Student Achievement Report Generation

**Priority:** High
**Status:** Partial (basic PDF exists, missing filters, attendance data, verification QR, and frontend UI)

---

## Context

`GET /api/achievements/user/:userId/report` exists and returns a PDF via `pdfkit`. However the PDF only lists achievement records with no semester filter, no attendance data, no student ID, no summary totals, and no verification QR code. The frontend has no download UI at all.

---

## Neo Components to Copy

Copy the following from `/workspaces/CMP/neo/src/components/ui/` into `apps/frontend/src/components/ui/`:

| Neo file | Purpose in this FR |
|---|---|
| `select.tsx` | Semester selector dropdown |
| `button.tsx` | "Download Report" button |
| `card.tsx` | Achievement cards on AchievementsPage |
| `badge.tsx` | Achievement type/club badges |

> **Adaptation note:** Neo components use Next.js (`next/link`). Replace with `react-router-dom` equivalents.

---

## Step 1 — Backend: Update Report Endpoint

**File:** `apps/backend/src/controllers/achievements.controller.ts`

Modify `downloadReport` to accept query params:
- `?semester_id=<id>` — filter by semester
- `?club_id=<id>` — filter by club

Pass these filters to the PDF service:
```ts
export async function downloadReport(req: Request, res: Response) {
  const userId = parseInt(req.params.userId);
  const semesterId = req.query.semester_id ? parseInt(req.query.semester_id as string) : undefined;
  const clubId = req.query.club_id ? parseInt(req.query.club_id as string) : undefined;

  const pdfBuffer = await generateAchievementReport(userId, { semesterId, clubId });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=achievements-${userId}.pdf`);
  res.send(pdfBuffer);
}
```

---

## Step 2 — Backend: Update Achievement Model

**File:** `apps/backend/src/models/achievement.model.ts`

Add a `findByUserFiltered` method that accepts `semesterId?` and `clubId?`:

```ts
static findByUserFiltered(userId: number, opts: { semesterId?: number; clubId?: number }) {
  let sql = 'SELECT * FROM achievements WHERE user_id = ?';
  const params: any[] = [userId];
  if (opts.semesterId) { sql += ' AND semester_id = ?'; params.push(opts.semesterId); }
  if (opts.clubId)     { sql += ' AND club_id = ?';    params.push(opts.clubId); }
  sql += ' ORDER BY awarded_at DESC';
  return db.prepare(sql).all(...params) as Achievement[];
}
```

---

## Step 3 — Backend: Rewrite PDF Service

**File:** `apps/backend/src/services/pdf.service.ts`

Rewrite `generateAchievementReport` to accept filters and produce a complete, compliant PDF:

### Data to collect
1. User record (name, email — derive student ID from email prefix e.g. `s123456789@stu.kau.edu.sa`)
2. Semester record (if filtered)
3. Achievements (filtered by semester/club)
4. Attendance records for the user (joined with events, filtered by semester date range if applicable)
5. Summary totals: achievement count, events attended, total volunteer hours (currently not tracked — use attendance count as proxy until volunteer hours are added)

### PDF sections
```
[Header]
  CMP — King Abdulaziz University
  Achievement Report
  Student: <name>   ID: <student_id>
  Term: <semester name or 'All Terms'>
  Generated: <report date param, not new Date()>

[Summary]
  Total Achievements: N
  Events Attended: N
  (Volunteer Hours: N)  ← placeholder if not tracked

[Achievements]
  For each achievement:
    Title | Club | Awarded | Description

[Attendance]
  For each attendance record:
    Event Title | Date | Check-in Time | Method (QR/Manual)

[Verification]
  Verification Code: <hash>
  [QR Code image embedded]
```

### Determinism
Accept a `reportDate` parameter (ISO string). If not provided, use the current date but **store it in the DB or return it** so re-generation can pass the same date.
> Simplest approach: accept `?report_date=YYYY-MM-DD` query param; if not provided, use today.

### Verification code
Generate a stable hash: `sha256(userId + semesterId + reportDate)`.
Encode it as a short hex string. Generate a QR code data URL from it using `qrcode` (already a dependency).
Embed the QR image in the PDF using `doc.image(Buffer.from(qrDataUrl.split(',')[1], 'base64'), ...)`.

### Include attendance data

**File:** `apps/backend/src/models/attendance.model.ts` — add:
```ts
static findByUserWithEvents(userId: number, opts: { semesterId?: number }) {
  // JOIN attendance with events, optionally filter by semester date range
}
```

---

## Step 4 — Frontend: Semesters Query

**File:** `apps/frontend/src/api/admin.ts`

`listSemesters()` already exists. Use it on the AchievementsPage to populate the semester selector.

---

## Step 5 — Frontend: AchievementsPage

**File:** `apps/frontend/src/pages/AchievementsPage.tsx`

### Add report download UI
At the top of the page, add a report download card with:
- **Semester selector** (neo `Select`) — fetches semesters from `GET /api/admin/semesters`, shows "All Terms" as default
- **Club filter** (neo `Select`) — fetches clubs from `GET /api/clubs`, shows "All Clubs" as default
- **Download Report** button (neo `Button`, primary variant)

On click, call the report endpoint with params and trigger a file download:
```ts
const url = `/api/achievements/user/${user.id}/report?semester_id=${semId}&report_date=${today}`;
window.open(url, '_blank'); // or use fetch + Blob for authenticated download
```

> Since the endpoint is currently public (`GET /api/achievements/user/:userId/report`), `window.open` works. If you restrict it to the authenticated user only, use `fetch` with the Bearer token and create an object URL from the blob.

### Achievement cards
Display existing achievements in neo `Card` components with:
- Title and club as `Badge`
- Awarded date
- Description

---

## Acceptance Criteria Checklist

- [ ] Report can be filtered by semester
- [ ] Report can be filtered by club
- [ ] PDF contains: student name, ID (derived from email), term range, summary totals
- [ ] PDF contains verified attendance list (events attended)
- [ ] PDF contains unique verification code and QR image
- [ ] Same inputs (user + semester + report_date) always produce identical PDF content
- [ ] Frontend has semester/club selector and download button on AchievementsPage

---

## Files Summary

| Action | File |
|---|---|
| Modify | `apps/backend/src/controllers/achievements.controller.ts` |
| Modify | `apps/backend/src/models/achievement.model.ts` |
| Modify | `apps/backend/src/models/attendance.model.ts` |
| Modify | `apps/backend/src/services/pdf.service.ts` |
| Modify | `apps/frontend/src/pages/AchievementsPage.tsx` |
| Copy from neo | `select.tsx`, `button.tsx`, `card.tsx`, `badge.tsx` |
