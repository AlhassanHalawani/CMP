# Arabic Translation Fix Audit

**Date:** 2026-04-21
**Goal:** Track UI text that still appears in English while the app is in Arabic mode, so it can be fixed screen by screen.

---

## Confirmed From Your Screenshots

### 1. Dashboard - Website Visitors

**Visible English text**

- `Website Visitors`
- `Showing visitors for the selected time range`
- `visitors`
- `page views`
- Month labels in the chart such as `Mar` and `Apr`

**Source**

- `apps/frontend/src/pages/DashboardPage.tsx:50-55`
- `apps/frontend/src/pages/DashboardPage.tsx:84-87`

**Notes**

- The card title and summary are hardcoded in English.
- The x-axis date formatting is using browser/default locale instead of the selected app language.

### 2. Club Details / Members

**Visible English text**

- `Active Members`
- `Total Attendance`
- `Published Events`
- `Members`
- `No members yet.`

**More English in the same screen**

- Members table headers: `Member`, `Email`, `Status`, `Requested`, `Actions`
- Buttons/dialogs: `Join Club`, `Leave Club`, `Cancel`, `Confirm`
- Status labels: `Request Pending`, `Members Only`
- Section title: `Recent Events`
- Delete dialog text: `This action cannot be undone.`

**Source**

- `apps/frontend/src/pages/ClubDetailPage.tsx:85-94`
- `apps/frontend/src/pages/ClubDetailPage.tsx:333-366`
- `apps/frontend/src/pages/ClubDetailPage.tsx:380-409`
- `apps/frontend/src/pages/ClubDetailPage.tsx:437-470`

**Notes**

- Club title/description already switch to Arabic correctly with `name_ar` and `description_ar`.
- The untranslated problem is mostly hardcoded UI labels around the translated club content.

### 3. Club Names In KPI And Leaderboard

**Visible English problem**

- Club names in KPI charts/rankings are rendered from `club_name`, so Arabic mode still shows English club names.

**Source**

- `apps/frontend/src/pages/KpiPage.tsx:279`
- `apps/frontend/src/pages/KpiPage.tsx:318`
- `apps/frontend/src/components/KpiOverviewSection.tsx:160`
- `apps/frontend/src/pages/DashboardPage.tsx:395`
- `apps/frontend/src/pages/DashboardPage.tsx:520`

**Notes**

- This looks like a data-level localization gap, not only a missing `t(...)` key.
- Likely fix options:
  - return `club_name_ar` from KPI/ranking APIs, or
  - map `club_id` to `name_ar` on the frontend when Arabic is active.

### 4. Events Page

**Visible English text**

- `Export Calendar`
- `Pick dates`
- `All categories`
- `All clubs`
- `List View`
- `Calendar View`

**More English found in the same page**

- Select placeholders: `Category`, `Club`
- Search input placeholder: `Search location...`
- Button: `Clear filters`
- Admin banner: `event awaiting approval`, `events awaiting approval`
- Calendar section: `Show all this month`
- Empty state: `No events to show.`
- Count label: `event` / `events`

**Source**

- `apps/frontend/src/pages/EventsPage.tsx:174-200`
- `apps/frontend/src/pages/EventsPage.tsx:217-249`
- `apps/frontend/src/pages/EventsPage.tsx:275-295`
- `apps/frontend/src/pages/EventsPage.tsx:321`
- `apps/frontend/src/pages/EventsPage.tsx:358-373`

**Notes**

- This page mixes translated titles with hardcoded English controls.
- Date labels use `date-fns/format(...)` without Arabic locale, so month names and date text can stay English.

### 5. Reports Page

**Visible English text**

- `Attendance Reports`
- `Generate Report`
- `Club`
- `Select a club...`
- `Date Range`
- `Pick date range`

**More English found in the same page**

- `Results`
- `records`
- `Export CSV`
- `Export PDF`
- `No data for the selected range.`
- Table headers: `Event`, `Date`, `Name`, `Email`, `Status`, `Check-in Time`, `Method`
- Error message: `Failed to generate report. Please try again.`

**Source**

- `apps/frontend/src/pages/ReportsPage.tsx:73`
- `apps/frontend/src/pages/ReportsPage.tsx:97-108`
- `apps/frontend/src/pages/ReportsPage.tsx:114-160`
- `apps/frontend/src/pages/ReportsPage.tsx:171-193`

**Notes**

- Admin dropdown uses `c.name` instead of Arabic-aware display.
- Club leader view also shows `leaderClub.name` directly.

---

## Additional Translation Gaps Found While Exploring

### Dashboard - student/leader sections

**English still present**

- `View Event`
- `Level`
- `XP to Lv.`
- `Max level`
- `Registered`
- `Attended`
- `Clubs`
- `events`
- `joined`
- `rate`

**Source**

- `apps/frontend/src/pages/DashboardPage.tsx:205`
- `apps/frontend/src/pages/DashboardPage.tsx:247-255`
- `apps/frontend/src/pages/DashboardPage.tsx:270-279`
- `apps/frontend/src/pages/DashboardPage.tsx:355`

### Daily Questions

**English still present**

- Club badge uses `question.club_name`
- `bonus`

**Source**

- `apps/frontend/src/pages/DailyQuestionsPage.tsx:110`
- `apps/frontend/src/pages/DailyQuestionsPage.tsx:113`

**Notes**

- Same data issue as KPI: Arabic mode needs an Arabic club name field or a frontend mapping.

### Event detail / attendance / profile / admin pages

A quick source scan found many more hardcoded English labels in these screens too:

- `apps/frontend/src/pages/EventDetailPage.tsx`
- `apps/frontend/src/pages/EventAttendancePage.tsx`
- `apps/frontend/src/pages/ProfilePage.tsx`
- `apps/frontend/src/pages/AdminPage.tsx`
- `apps/frontend/src/components/clubs/ClubFormDialog.tsx`
- `apps/frontend/src/components/events/EventFormDialog.tsx`

**Examples**

- `Check-in Window`, `Finalize Attendance?`, `Present`, `No-show`
- `Appearance`, `Theme`, `Danger zone`, `Delete account`
- `Club Leader Requests`, `Request Leadership`
- Form placeholders like `Club name`, `Event title`, `Description`, `Status`, `Members only`

This is bigger than the five screens above, so it is worth doing a second pass after the main fixes.

---

## Missing Translation Keys Used In Code

These keys are referenced with `t(...)` in the frontend, but they do not exist in `apps/frontend/src/i18n/locales/en/translation.json` or `apps/frontend/src/i18n/locales/ar/translation.json`, so the UI falls back to English text:

- `clubs.publishedEvents`
- `clubs.totalAttendance`
- `clubs.activeMembers`
- `kpi.noActivityRecorded`
- `kpi.filterByDepartment`
- `kpi.allDepartments`
- `kpi.computing`
- `kpi.computeKpis`
- `kpi.computingFor`
- `kpi.selectSemesterFirst`
- `kpi.computeSuccess`
- `kpi.exportCsv`
- `kpi.exportPdf`
- `kpi.students`
- `achievements.myAchievements`
- `achievements.studentAchievements`
- `achievements.myClubAchievements`

**Detected in**

- `apps/frontend/src/pages/DashboardPage.tsx`
- `apps/frontend/src/pages/KpiPage.tsx`
- `apps/frontend/src/components/KpiOverviewSection.tsx`
- `apps/frontend/src/pages/AchievementsPage.tsx`

---

## Recommended Fix Order

1. Add the missing keys above to both locale files.
2. Replace hardcoded English labels in `DashboardPage`, `ClubDetailPage`, `EventsPage`, and `ReportsPage` with `t(...)`.
3. Fix Arabic club-name rendering in KPI, dashboard rankings, daily questions, and reports by using Arabic-aware fields instead of plain `club_name` / `name`.
4. Localize date formatting so Arabic mode does not keep English month names.
5. Do a second sweep for `EventDetailPage`, `EventAttendancePage`, `ProfilePage`, `AdminPage`, and the form dialogs.
