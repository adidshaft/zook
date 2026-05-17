# Production Provider Certification

Last updated: 2026-05-17

Use this file as the evidence checklist before marking a provider production-ready. Staging evidence is required first; production should only receive read-only smoke plus one controlled live transaction where relevant.

## Required Release Gates

- `pnpm install --frozen-lockfile`
- `pnpm db:generate`
- `pnpm env:check`
- `pnpm release:preflight`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:unit`
- `pnpm test:acceptance:db`
- `pnpm build`

## Payments

Provider: Razorpay

Certification evidence:

- Test order creation succeeds from public checkout and owner/manual payment paths.
- Webhook signature verification rejects unsigned and tampered payloads.
- Success webhook activates the correct membership or shop order only once.
- Failure, duplicate, and out-of-order webhooks are stored without double activation.
- Payment amount, currency, organization, user, and purpose are validated before activation.
- Refund path is tested in staging and visible in owner reconciliation.
- Day-end reconciliation matches Razorpay dashboard, Zook payments CSV, and cash/UPI/card desk proof.

Production posture:

- Use live keys only in production secret store.
- Never enable mock payment completion in production.
- Keep one small live smoke transaction documented with payment ID, Zook payment ID, webhook event ID, and rollback/refund decision.

## QR Attendance

Certification evidence:

- Reception QR scan succeeds on iOS physical device in normal lighting.
- Reception QR scan succeeds on Android physical device in normal lighting.
- QR low-light scan succeeds with the gym's real desk lighting after at least three attempts.
- Expired, wrong-branch, and repeated QR scans show the correct member-facing state.
- The desk can fall back to entry-code verify when camera permission is denied or lighting is poor.
- Scan records match the dashboard attendance queue and audit log.

Production posture:

- Do not certify QR from simulator screenshots only.
- Record device model, OS version, app build, gym branch, lighting notes, and one attendance record ID.

## Push Notifications

Provider: Expo

Certification evidence:

- iOS physical device receives foreground notification.
- iOS background tap deep-links to the expected screen.
- iOS cold start from notification opens the expected screen.
- Android physical device receives foreground notification.
- Android background tap and cold start deep-link correctly.
- Payload contains only `notificationId` and `type`.
- Provider-disabled state records delivery attempt without blocking the product action.

Production posture:

- Push is not certified by simulator alone.
- Record device model, OS version, app build, Expo project ID, and sample notification ID.

## Email

Provider: Resend or SMTP

Certification evidence:

- OTP email sends to an internal account in staging.
- Transactional membership/payment email sends in staging.
- SPF, DKIM, and DMARC alignment are verified.
- Provider quota and rate-limit behavior are known.
- Bounce/failure is visible in logs or provider dashboard.

Production posture:

- Fixed OTP must be disabled.
- Mock email must be rejected by production preflight.

## Storage

Provider: Supabase Storage, S3, or R2

Certification evidence:

- Profile photo upload/read/delete.
- Payment proof upload/read with private access.
- Organization cover/gallery upload and public read.
- Product image upload and read.
- Invoice/receipt PDF storage and signed URL expiry.
- MIME extension and magic-byte mismatch are rejected.
- Cross-organization file access is denied.

Production posture:

- Service-role secrets stay server-only.
- Public assets are explicitly marked public; private assets require signed URLs.

## AI

Provider: OpenAI

Certification evidence:

- AI disabled mode gives controlled unavailable UX.
- OpenAI staging mode generates a structured trainer draft.
- Timeout, 401, 429, malformed response, and 5xx paths are logged and user-safe.
- Safety/out-of-scope prompts are blocked and auditable.
- Quota/cost tracking appears in platform assistant activity.

Production posture:

- Keep `AI_FEATURES_ENABLED=false` until staging evidence exists.
- Enable per-role and per-org quotas before pilot expansion.

## Rate Limiting

Provider: Upstash Redis

Certification evidence:

- `RATE_LIMIT_PROVIDER=upstash` passes production preflight.
- OTP, login, public checkout, and API mutation limits are enforced across repeated requests.
- Local memory/disabled providers fail production preflight.
- Namespaces are separated by environment.

Production posture:

- Use a production Upstash database and environment-specific namespace.
- Record the Upstash database ID and namespace in release notes.

## Release Evidence Variables

When evidence exists outside the repo, pass references into the static gate so the release log shows them:

```bash
ZOOK_REAL_DEVICE_PUSH_EVIDENCE=/tmp/zook-qa/.../push.md \
ZOOK_QR_LOW_LIGHT_EVIDENCE=/tmp/zook-qa/.../qr-low-light.md \
ZOOK_CHECKOUT_WEBHOOK_EVIDENCE=razorpay:event-id-or-runbook-link \
ZOOK_MOBILE_RELEASE_ENV_FILE=.env.production.local \
pnpm mobile:release:check
```
