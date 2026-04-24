# Security And Privacy

## Auth And Sessions

- OTP challenges store only hashed codes.
- Fixed dev OTPs are allowed only when `OTP_FIXED_CODE_DEV` is enabled in development.
- OTP requests enforce expiry, attempt limits, and resend limits.
- Session tokens are random, stored hashed in PostgreSQL, and revoked on logout.
- Web reads auth from an HTTP-only cookie.
- Mobile reads auth from the same token through bearer headers and stores it through SecureStore, with an in-memory fallback for unsupported dev runtimes.

## Tenant Isolation

- Every org-scoped API path resolves request context before data access.
- Services and route handlers require explicit `orgId` for tenant-scoped work.
- Platform admin routes are separated from org routes.
- Cross-org leakage is blocked through role/permission checks and org-scoped lookups.

## RBAC And Audit

Privileged mutations now write audit entries for:

- organization updates
- membership plan creation
- manual/offline payments
- join request approval or rejection
- attendance approval, rejection, and manual override
- notification sends
- plan publish and assignment
- shop fulfillment
- platform organization status updates

## Payment Safety

- Zook does not store raw card data.
- Mock checkout redirects are not trusted on their own.
- Subscription activation and shop fulfillment happen only after backend payment-session completion.
- Manual payment corrections use adjustments and reversals instead of silent deletion.

## Attendance Safety

- QR payloads are signed server-side and expire quickly.
- Replay, stale, wrong-branch, duplicate, no-photo, no-membership, and visit-pack-empty scans are blocked or flagged.
- Manual attendance requires a reason and writes override records.
- Visit consumption happens server-side only.

## AI Safety

- Clients never call providers directly.
- AI runs only through backend routes and provider abstractions.
- Quotas are enforced before provider execution.
- Medical-risk, unsafe exercise, eating-disorder, steroid, and out-of-scope prompts are blocked or redirected.
- Members cannot generate images.
- Minors are blocked before guardian consent and stay in safe mode after consent.

## Tracking Privacy

- Workout sessions, body progress, and habits default to `PRIVATE`.
- `TRAINER_VISIBLE` visibility is opt-in and never the default.
- Minor tracking remains private even if trainer visibility is requested.
- Owner/admin dashboards can see aggregate activity, not unrestricted private workout detail.

## Notification And Consent Rules

- Transactional notifications cannot be opted out of entirely.
- Promotional and engagement notifications respect preference records.
- Minor users are excluded from promotional messaging by default.
- Consent records cover marketing, AI personalization, guardian state, profile photo attendance, export, and deletion requests.

## Provider Boundary

- Provider keys stay server-side.
- Mobile/web clients never receive payment, AI, storage, or map secrets.
- Mock providers remain the default local runtime so development is cheap and deterministic.
