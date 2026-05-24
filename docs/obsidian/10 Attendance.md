# Attendance

Attendance supports QR-based entry, approval modes, manual overrides, and receptionist verification.

## Member Flow

1. Member opens scan.
2. Member scans signed QR.
3. Backend validates token, membership, role, duplicate windows, and branch context.
4. Attendance is approved, pending, rejected, or blocked.
5. Member sees entry result and notifications.

## Reception Flow

1. Pending or unusual attendance appears in queue.
2. Reception approves or rejects with context.
3. Audit log records the decision.
4. Member state updates.

## Owner/Admin Flow

- Display rolling signed QR.
- Review today and pending attendance.
- Create manual attendance with reason.
- Export/report attendance.

## Routes and APIs

- `/dashboard/attendance`
- `/dashboard/attendance/qr-display`
- `/desk/qr`
- `/api/orgs/:orgId/attendance/qr-token`
- `/api/attendance/scan`
- `/api/orgs/:orgId/attendance/live`
- `/api/orgs/:orgId/attendance/today`
- `/api/orgs/:orgId/attendance/pending`
- `/api/orgs/:orgId/attendance/:recordId/approve`
- `/api/orgs/:orgId/attendance/:recordId/reject`
- `/api/orgs/:orgId/attendance/manual`
- `/api/me/attendance`

## Safety Rules

- QR tokens are signed and time-bound.
- Manual overrides need permission and reason.
- Duplicate scans are controlled by backend logic.
- Reception decisions are audited.

