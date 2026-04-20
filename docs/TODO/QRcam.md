# QRcam - Mobile Camera QR Check-In for Attendance

**Priority:** High
**Status:** Planned (QR attendance already works end-to-end with token entry, but the student web app does not yet open the phone camera or auto-submit attendance after a scan)

---

## Summary

Add an `Open Camera` action to the student attendance flow so a student can scan the event QR code directly from the web app on a phone.

Desired behavior:

- student taps `Open Camera`
- browser asks for camera permission
- live camera preview opens in the web app
- when the QR code is detected, the token is inserted automatically
- attendance is submitted automatically
- on success, the student is marked attended without needing a second tap

The existing manual token input must remain available as a fallback.

---

## Current Implementation Snapshot

The current codebase already covers most of the attendance logic:

- `apps/frontend/src/pages/EventDetailPage.tsx`
  - renders the student check-in section on published events
  - currently uses a plain token input plus `Check In` button
- `apps/frontend/src/api/attendance.ts`
  - already exposes `attendanceApi.checkIn(token)`
- `apps/backend/src/controllers/attendance.controller.ts`
  - already validates QR tokens
  - already enforces registration, duplicate prevention, check-in window, finalized sessions, and capacity
  - already records attendance once the token is accepted
- `apps/frontend/package.json`
  - has QR generation dependencies but no live QR camera scanner dependency yet

Conclusion:

- this feature is primarily a frontend enhancement
- no new backend endpoint or database migration is required for V1
- the existing `/api/attendance/check-in` endpoint should be reused

---

## Goal

Improve QR attendance on phones so students do not need to manually type the QR token.

V1 success means:

- a student can start scanning from the event detail page
- camera permission is requested only after the student presses a button
- a successful scan auto-fills the token and auto-submits attendance
- the student still has a manual fallback if camera access is blocked or unsupported

---

## Product Rules

- Keep the current token input visible as a fallback.
- Do not remove or replace the existing `Check In` button.
- Reuse the current attendance API and backend validation flow.
- Only trigger camera permission from a user gesture such as pressing `Open Camera`.
- Prevent duplicate submissions from repeated scan callbacks on the same QR frame.
- Stop or pause the camera once a token has been accepted for processing.
- If attendance submission fails after scanning, show the API error and let the student retry.
- If camera access is denied, unavailable, or unsupported, the page must explain that and keep manual token entry usable.
- Camera support should be optimized for phones, but the feature should degrade safely on other devices.
- Camera access must be treated as requiring a secure context in production (`https` or localhost during development).

---

## Recommended Technical Approach

Use the existing student check-in card in `apps/frontend/src/pages/EventDetailPage.tsx` as the host for the camera flow.

Recommended implementation shape:

1. Add one QR scanning library to the frontend.
2. Wrap it in a small CMP component so scanner setup and cleanup are isolated from page logic.
3. Emit the decoded token back to `EventDetailPage`.
4. Reuse `attendanceApi.checkIn(token)` immediately after decode.

Recommended dependency choice:

- add a dedicated scanner library such as `html5-qrcode` for V1 reliability on mobile browsers

Reason:

- the app currently has no live scanner dependency
- relying only on browser-native barcode APIs would make support less predictable across phones

---

## Step 1 - Add Scanner Dependency and Wrapper Component

**Files:**

- `apps/frontend/package.json`
- new file: `apps/frontend/src/components/attendance/QrCameraScanner.tsx`

### Responsibilities of `QrCameraScanner`

- request camera access when the parent tells it to start
- render a live preview area
- decode QR content from the camera stream
- call `onDetected(token)` once for the first valid result
- expose `onError(message)` for permission and device failures
- stop camera tracks cleanly on close or unmount

### Component requirements

- must support explicit start/stop lifecycle
- must not keep the camera active after the student closes the scanner
- must not emit the same scan repeatedly while a request is already in progress

---

## Step 2 - Refactor Student Check-In Mutation for Auto-Submit

**File:** `apps/frontend/src/pages/EventDetailPage.tsx`

The current check-in mutation closes over `checkInToken` state. For scan-driven submission, refactor it to accept the token directly.

Recommended change:

- change the mutation from `mutationFn: () => attendanceApi.checkIn(checkInToken)`
- to a token-parameter form such as `mutationFn: (token: string) => attendanceApi.checkIn(token)`

Then wire scan success like this:

- set `checkInToken` to the decoded value so the student can see what was scanned
- immediately call `checkInMutation.mutate(decodedToken)`
- set status/message the same way the current manual path does

Also add a scan-processing guard such as a ref flag to avoid duplicate attendance calls while the camera keeps seeing the same QR code.

---

## Step 3 - Add Mobile Camera UI to the Student Check-In Card

**File:** `apps/frontend/src/pages/EventDetailPage.tsx`

Extend the existing student check-in section with:

- `Open Camera` button
- `Close Camera` button while scanning is active
- inline scanner region or a dialog-based scanner panel
- short helper text such as "Point your camera at the event QR code"

Recommended V1 flow:

1. Student opens event detail page.
2. Student presses `Open Camera`.
3. Browser permission prompt appears.
4. Camera preview starts inside the web app.
5. QR token is detected.
6. Token field is auto-filled.
7. Attendance is auto-submitted.
8. Camera stops on success.

Recommended UX details:

- keep the manual token field visible at all times
- disable duplicate actions while attendance submission is pending
- keep success, duplicate, and error messages in the same check-in card
- on submission failure after a scan, allow the student to reopen or continue scanning without a page refresh

---

## Step 4 - Add Scanner States and Localized Strings

**Files:**

- `apps/frontend/src/i18n/locales/en/translation.json`
- `apps/frontend/src/i18n/locales/ar/translation.json`

New strings likely needed:

- `attendance.openCamera`
- `attendance.closeCamera`
- `attendance.cameraStarting`
- `attendance.cameraHelp`
- `attendance.cameraPermissionDenied`
- `attendance.cameraUnsupported`
- `attendance.cameraError`
- `attendance.scanning`

Notes:

- current attendance strings already cover manual token entry, success, duplicate, and generic check-in failure
- the new strings should focus on camera-specific guidance and failures

---

## Step 5 - Failure Handling and Edge Cases

The implementation should explicitly handle these cases:

- permission denied
  - show a clear message
  - keep manual token entry available
- no camera device found
  - show a clear message
  - keep manual token entry available
- unsupported browser or insecure context
  - show why the camera cannot be opened
- duplicate attendance
  - preserve current duplicate message behavior
- closed or finalized check-in window
  - surface the backend error returned by `/api/attendance/check-in`
- scan callback fires multiple times
  - process only one token while a request is active
- scanner left open during navigation or unmount
  - release media tracks cleanly

---

## Verification Plan

Because the current frontend workspace does not appear to have a dedicated frontend test runner configured yet, V1 verification should be:

- `npm run lint --workspace=apps/frontend`
- `npm run build --workspace=apps/frontend`
- manual QA on a phone or mobile browser emulator

Manual QA checklist:

- student presses `Open Camera` and the browser asks for permission
- valid QR scan auto-fills the token
- valid QR scan auto-submits attendance without pressing `Check In`
- success message appears and camera stops
- duplicate scan shows the duplicate message
- denied permission shows a helpful fallback message
- closed/finalized session shows backend error feedback
- manual token entry still works when camera is not used
- closing the scanner releases the camera and reopening works again

---

## Acceptance Criteria Checklist

- [ ] Student sees an `Open Camera` button in the event attendance section
- [ ] Pressing the button triggers the browser camera permission prompt in the web app
- [ ] A successful QR scan automatically fills the token field
- [ ] A successful QR scan automatically submits attendance
- [ ] On successful submission, the student is marked attended without a second tap
- [ ] Duplicate and backend validation errors are still shown correctly
- [ ] Manual token entry remains available as a fallback
- [ ] Camera resources are released when scanning stops or the page closes

---

## Files Summary

| Action | File |
|---|---|
| Modify | `apps/frontend/package.json` |
| Create | `apps/frontend/src/components/attendance/QrCameraScanner.tsx` |
| Modify | `apps/frontend/src/pages/EventDetailPage.tsx` |
| Modify | `apps/frontend/src/i18n/locales/en/translation.json` |
| Modify | `apps/frontend/src/i18n/locales/ar/translation.json` |

---

## Notes

- The backend attendance flow already satisfies the "automatically attended" requirement once a valid token is submitted.
- This plan intentionally avoids backend changes unless implementation exposes a browser-specific issue that requires server-side support later.
- If the team wants a desktop scanner experience later, the same component can be reused there without changing the API contract.
