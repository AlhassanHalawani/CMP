# GPT Gap Snapshot

Generated: 2026-03-01
Source baseline: `functional-requirement.md` (FR-001 to FR-010) compared against current codebase.

## FR Status Matrix

| FR | Requirement | Status |
|---|---|---|
| FR-001 | Student Achievement Report Generation | Partial |
| FR-002 | Event Approval Workflow | Partial |
| FR-003 | QR Code Attendance Tracking | Partial |
| FR-004 | Semester KPI Report Generation | Partial |
| FR-005 | Club Registration & Membership | Missing |
| FR-006 | User Authentication & Authorization (SSO RBAC) | Partial |
| FR-007 | Event Calendar & Discovery | Partial |
| FR-008 | Notification System | Partial |
| FR-009 | Club Profile Management | Partial |
| FR-010 | Attendance Report for Club Managers | Partial |

## Highest-Priority Gaps

1. Implement full event approval workflow with explicit `submitted/approved/rejected` states and supervisor-driven approval actions.
2. Add complete club membership domain (`join`, `approve/decline`, `leave`, membership status lifecycle).
3. Harden and complete achievement reports: access control, semester filters, verification QR/code, deterministic output rules.
4. Add KPI and attendance report exports (CSV/PDF) and required filtering dimensions.
5. Implement notification triggers and preferences (email/WhatsApp, reminders, delivery status logging).

## Notes

- Current RBAC roles in code are `student`, `club_leader`, and `admin`; `supervisor` is not yet modeled as a distinct role.
- Notification inbox exists, but automated trigger pipelines are still missing.
- QR attendance exists and is tested, but check-in session open/close controls are not implemented.
