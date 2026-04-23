# Security And Privacy

## Auth

- Email OTP challenges store only hashes.
- Development may use `000000` only when `NODE_ENV=development`.
- OTP expiry, attempt limits, and resend counters are modeled.
- Sessions use random tokens stored hashed in the database.
- Web uses secure cookies where practical; mobile stores tokens with Expo SecureStore.
- Logout revokes the current session.

## Tenant Isolation

- Every organization-scoped query requires `orgId`.
- Every privileged action checks role/permission in the request context.
- Platform routes are isolated and require `PLATFORM_ADMIN`.
- Audit logs record privileged mutation attempts and outcomes.

## Payments

- No raw card data is collected or stored.
- Client redirects are informational only.
- Payment activation occurs only after provider verification or mock completion service.
- Manual payments are immutable; corrections use adjustment/reversal records.

## Attendance

- QR tokens are signed with a server secret and expire within minutes.
- Replayed, stale, wrong-branch, no-photo, no-membership, and empty-visit scans are rejected or flagged.
- Manual overrides require a reason and are audit-logged.

## AI Safety

- AI calls are backend-only.
- Role and organization quotas are enforced before provider calls.
- Out-of-scope, medical-risk, eating-disorder, steroid, extreme-diet, and unsafe exercise requests are rejected or redirected.
- Members cannot generate images.
- Minors use safe mode after guardian consent and are blocked before consent.

## Minors

- Guardian consent is required before joining, AI personalization, attendance, purchases, or personalized plans.
- Marketing notifications default off.
- Public/leaderboard visibility is disabled by default.

## Privacy Controls

- Consent records cover marketing, AI personalization, profile photo attendance, guardian consent, and notifications.
- Mobile exposes privacy, notification, AI consent, export, and deletion request screens.
- Web exposes organization privacy settings, audit logs, consent records, and retention placeholders.
