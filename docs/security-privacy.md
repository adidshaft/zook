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
- Subscription activation and shop fulfillment happen only after backend payment-session completion or verified webhook processing.
- Manual payment corrections use adjustments and reversals instead of silent deletion.
- Razorpay webhook handling persists provider events and attempts for reconciliation.

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
- Push device registration and delivery outcomes are persisted server-side.

## Guardian, Export, And Deletion Flow

- Minor guardian consent challenges are stored with hashed OTP values.
- `guardianPending` remains the live session-level gate for restricted minor actions.
- Guardian fallback links now resolve to a public web route that can review, verify, and resend a challenge without requiring the minor to stay logged in.
- Data export requests create `DataExportRequest` plus `DataExportJob`.
- Successful export generation stores a private JSON artifact through the storage provider and returns a signed URL.
- Account deletion requests create `AccountDeletionRequest` plus `AccountDeletionJob`.
- Deletion remains request-driven and does not hard-delete user data immediately in Phase 4.

## Phase 5 Minor Enforcement Notes

- membership activation re-checks guardian consent when a payment is processed, not only when checkout is created
- attendance scan and manual attendance overrides reject pending-consent minor check-ins
- plan assignment and PT subscription activation reject pending-consent minor actions
- promotional delivery still excludes minors by default even after guardian consent unless explicit marketing consent is recorded

## Observability

- Every API response includes a request ID.
- Request logs record method, path, status, duration, and actor context without leaking secrets.
- Health and readiness checks are available at `/api/health` and `/api/ready`.
- Error reporting supports a mock console reporter and a Sentry scaffold selected by env.

## Provider Boundary

- Provider keys stay server-side.
- Mobile/web clients never receive payment, AI, storage, or map secrets.
- Mock providers remain the default local runtime so development is cheap and deterministic.

## S3/R2 Storage Certification

Before production launch, complete and record a staging run with a real private bucket:

1. Set `STORAGE_PROVIDER=s3` or `STORAGE_PROVIDER=r2` with staging credentials and confirm `/api/ready` reports storage configured.
2. Upload each launch-critical category: `profile_photo`, `payment_proof`, `org_logo`, `org_cover`, and `privacy_export`.
3. Confirm oversized uploads return HTTP 413 and unsupported MIME types are rejected.
4. Confirm generated object keys follow `{orgId}/{category}/{fileId}-{timestamp}.{ext}` and do not include client filenames.
5. Confirm private files require a signed URL and org/user permissions, while public logo/cover files are readable without exposing bucket credentials.
6. Delete a test file and confirm the asset can no longer be served.

Record the staging date, bucket name or environment alias, file asset IDs, signed URL checks, access-denied checks, and deletion result here before launch.
