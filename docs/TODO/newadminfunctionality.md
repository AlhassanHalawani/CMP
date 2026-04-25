# Admin / Club Leader MCQ Delete Functionality

**Priority:** Medium
**Status:** Planned (partially implemented already in the current codebase)

---

## Summary

Add and polish MCQ deletion functionality so:

- `admin` can delete MCQ questions from the system
- `club_leader` can delete MCQ questions they created for clubs they manage

In the current codebase, this feature is already partially present for daily MCQs:

- backend route exists: `DELETE /api/daily-questions/:id`
- backend service already allows:
  - `admin` to delete any managed draft question
  - `club_leader` to delete draft questions for clubs they lead
- frontend manage tab already shows a delete action for draft questions

So this is mainly a completion, clarification, and hardening task rather than a greenfield feature.

---

## Goal

Make MCQ deletion reliable and obvious in the product for both admin and club leaders.

The final user-facing behavior should be:

- Admin can open the MCQ management area, see questions across clubs, and delete allowed questions
- Club leader can open the MCQ management area, see questions for their own clubs, and delete allowed questions
- Users get a confirmation step before deletion
- The UI clearly explains when a question cannot be deleted

---

## Current State In The Repo

### Backend

Daily-question delete support already exists in:

- `apps/backend/src/routes/dailyQuestions.routes.ts`
- `apps/backend/src/controllers/dailyQuestions.controller.ts`
- `apps/backend/src/services/daily-question.service.ts`

Current behavior:

- route is protected for `admin` and `club_leader`
- `admin` can delete any draft question
- `club_leader` can delete draft questions for clubs they lead
- published questions are blocked with `Cannot delete a published question`

### Frontend

The daily-question management UI already exists in:

- `apps/frontend/src/pages/DailyQuestionsPage.tsx`
- `apps/frontend/src/api/dailyQuestions.ts`

Current behavior:

- `admin` and `club_leader` can access the `Manage` tab
- delete button is shown only for draft questions
- success/error toasts already exist
- there is no dedicated confirmation dialog for deleting a question
- there is no admin-specific shortcut from the admin area to question management

---

## Recommended Product Rule

To stay consistent with the rest of this project, deletion should follow the same ownership model already used for clubs, events, attendance, and achievements:

- `admin`: can manage all MCQ questions
- `club_leader`: can manage MCQ questions for clubs where `clubs.leader_id === req.user.id`

Important note:

- the repo’s ownership model is based on club ownership, not `created_by`
- because a club leader can only create questions for clubs they lead, this still satisfies the user need that a leader can delete the question they created

This is the safest plan because it matches existing authorization patterns and requires less risk than inventing a separate creator-only rule.

---

## Recommended Delete Policy

### V1

Allow hard delete only for `draft` questions.

Reason:

- draft questions have not been released to students yet
- deleting published questions can break answer history, streak assumptions, reporting, and XP auditability

### Follow-up if needed

If the product later needs admins to remove published MCQs from visibility, prefer a soft-delete or archive flow instead of hard delete.

That follow-up could add:

- `archived` or `deleted_at`
- hidden-from-students behavior
- preserved answer history for audit/reporting

---

## Implementation Plan

## Step 1 — Confirm And Document The Rule

Document the intended permission rule clearly:

- admin can delete any draft MCQ
- club leader can delete draft MCQs for their own club(s)
- published MCQs are not hard-deleted in V1

This should be reflected in:

- this planning doc
- MCQ feature docs if needed later
- API notes / test names

---

## Step 2 — Backend Hardening

Backend code is mostly already in place, so this step is focused on validation and future-proofing rather than large code changes.

Review:

- `apps/backend/src/services/daily-question.service.ts`
- `apps/backend/src/routes/dailyQuestions.routes.ts`
- `apps/backend/src/controllers/dailyQuestions.controller.ts`

Keep or verify:

- `DELETE /api/daily-questions/:id`
- `404` for missing question
- `403` when a leader tries to delete a question outside their club scope
- `409` when trying to delete a published question

Only change backend logic if the product explicitly decides that creator-only delete should replace the current club-ownership rule.

---

## Step 3 — Frontend UX Improvements

Improve the MCQ management experience in:

- `apps/frontend/src/pages/DailyQuestionsPage.tsx`
- `apps/frontend/src/i18n/locales/en/translation.json`
- `apps/frontend/src/i18n/locales/ar/translation.json`

Planned improvements:

- add a delete confirmation dialog before the mutation runs
- show the question text inside the confirmation dialog
- disable the delete button while deletion is in progress
- keep delete action visible only for deletable questions
- show clear error toast when the backend rejects deletion

Recommended confirmation copy:

- title: `Delete question`
- body: `This will permanently remove the draft question and its options.`

---

## Step 4 — Admin Discoverability

Admins already can manage questions from `/daily-questions`, but this is easy to miss if they expect all management actions inside the admin area.

Recommended improvement:

- add a shortcut/card/link from `apps/frontend/src/pages/AdminPage.tsx` to `/daily-questions`

This is not strictly required for permissions, but it makes the new admin functionality easier to find and use.

---

## Step 5 — Test Coverage

Add backend integration tests for delete behavior.

**File:**

- `apps/backend/src/tests/integration/daily-questions.test.ts`

Cover at least:

- admin can delete a draft question from any club
- club leader can delete a draft question from a club they lead
- club leader cannot delete a question from another club
- deleting a missing question returns `404`
- deleting a published question returns `409`

If frontend tests are available in the current setup, add a small UI test for:

- delete confirmation appears
- successful delete removes the question from the list

---

## Acceptance Criteria

- [ ] Admin can delete draft MCQ questions from the system
- [ ] Club leader can delete draft MCQ questions for clubs they manage
- [ ] Club leader cannot delete MCQ questions for clubs they do not manage
- [ ] Published MCQ questions are protected from hard delete in V1
- [ ] Delete action shows a confirmation step
- [ ] Success and failure states are visible in the UI
- [ ] Delete behavior is covered by backend tests

---

## Files Likely To Change

| Action | File |
|---|---|
| Verify / maybe adjust | `apps/backend/src/services/daily-question.service.ts` |
| Verify | `apps/backend/src/controllers/dailyQuestions.controller.ts` |
| Verify | `apps/backend/src/routes/dailyQuestions.routes.ts` |
| Add tests | `apps/backend/src/tests/integration/daily-questions.test.ts` |
| Improve delete UX | `apps/frontend/src/pages/DailyQuestionsPage.tsx` |
| Optional admin shortcut | `apps/frontend/src/pages/AdminPage.tsx` |
| Update copy | `apps/frontend/src/i18n/locales/en/translation.json` |
| Update copy | `apps/frontend/src/i18n/locales/ar/translation.json` |

---

## Assumption

This plan assumes that "delete MCQ question from the system" means:

- hard delete for draft questions
- no hard delete for already published questions in V1

If you want admins to delete already published MCQs too, we should plan a separate soft-delete/archive design instead of reusing the current hard-delete behavior.
