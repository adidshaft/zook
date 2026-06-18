# Mobile UI Cleanup External Evidence Checklist

Last updated: 18 June 2026

Branch: `mobile-ui-cleanup`

Use this checklist to close the non-code gates from
`docs/mobile-ui-cleanup-completion-audit.md`. Do not commit secrets, raw tokens, private customer
data, unredacted live payment identifiers, or provider dashboard screenshots that expose credentials.
Store sensitive proof in the launch evidence folder or ticket system and link only redacted paths or
ticket IDs here.

## Evidence Rules

- Record the date, environment, build/deployment ID, tester, and role for every run.
- Prefer redacted screenshots, provider event IDs, backend request IDs, and log excerpts over
  free-form claims.
- Mark a gate `Passed`, `Failed`, `Blocked`, or `Out of launch scope`.
- If a run mutates production money, membership, SMS/email, or customer records, attach the explicit
  approval reference before executing it.
- If a gate is narrowed or skipped, link the product/ops approval that changed the launch scope.

## Live Razorpay Membership Checkout

Status: `Not run`

Required evidence:

- Approval reference for the live payment and refund/void plan, if money will move.
- Environment and deployment URL.
- Mobile/web build or deployment ID.
- Test member account and organization/branch.
- Membership plan selected, amount, currency, and expected subscription result.
- Zook payment/session ID.
- Razorpay order/payment ID, redacted if committed.
- Webhook event ID and signature-verification result.
- Backend request ID or log excerpt showing membership activation.
- Owner/member UI screenshot or API readback proving active membership.
- Refund/cancel evidence, if the test required reversing the charge.

Pass criteria:

- Checkout opens with live Razorpay configuration.
- Successful payment activates exactly one membership for the intended member and branch.
- Duplicate webhook delivery is idempotent.
- Failure/cancel state leaves no active paid membership.
- Refund/cancel behavior matches the approved finance decision.

## Live Razorpay Shop Order

Status: `Not run`

Required evidence:

- Approval reference for the live payment and refund/void plan, if money will move.
- Test member account, organization, branch, and product.
- Zook shop order ID and payment/session ID.
- Razorpay order/payment ID, redacted if committed.
- Webhook event ID and signature-verification result.
- Owner/reception order view showing `Paid` or the expected settled state.
- Pickup code/fulfillment evidence, if tested.
- Refund/cancel evidence, if tested.

Pass criteria:

- Payment settles the intended order only.
- Reception/owner views update without manual refresh dependency.
- Fulfillment cannot proceed before the paid state unless an approved offline mode is used.
- Refund/cancel behavior matches the approved finance decision.

## Razorpay Dashboard Configuration

Status: `Not certified`

Required evidence:

- Dashboard screenshot or ticket confirming the production webhook URL.
- Event list enabled for membership and shop payment flows.
- Webhook secret rotation/storage confirmation without exposing the secret.
- UPI prominence/checkout-method configuration screenshot or ops note.
- Date and owner who verified the dashboard state.

Pass criteria:

- Hosted checkout shows the intended payment methods for Indian users.
- Production webhook endpoint receives signed events.
- The app rejects invalid signatures.
- Rotation procedure is documented before broad launch.

## Provider Credential Certification

Status: `Not certified`

Complete one row per provider:

| Provider | Environment | Secret owner | Smoke result | Evidence link | Notes |
| --- | --- | --- | --- | --- | --- |
| Object storage |  |  |  |  |  |
| Expo push |  |  |  |  |  |
| Sentry |  |  |  |  |  |
| Upstash Redis |  |  |  |  |  |
| Resend email |  |  |  |  |  |
| MSG91 SMS |  |  |  |  |  |
| OpenAI, if enabled |  |  |  |  |  |

Pass criteria:

- Production/staging environment variables are present in the deployment platform.
- Provider smoke tests prove the live provider path, not only a mock/local path.
- Failure modes are controlled and visible in product diagnostics or logs.
- No secret value is copied into source control, screenshots, or public tickets.

## Physical Device QA

Status: `Not run`

Required matrix:

| Platform | Device/OS | Build ID | Theme | Reduce motion | Role | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| iOS |  |  | Light | Off | Member |  |  |
| iOS |  |  | Dark | On | Owner |  |  |
| Android |  |  | Light | Off | Member |  |  |
| Android |  |  | Dark | On | Owner |  |  |

Required flows:

- Sign in, logout, and role switch for owner/admin/reception/trainer/member where available.
- Bottom navigation selected state on iOS and Android.
- Header branch selector alignment on owner, trainer, reception, shop, classes, and member contexts.
- Push permission, foreground notification, background tap, and cold-start deep link.
- QR scanning in normal and low-light conditions, including haptic success feedback.
- Keyboard behavior on login, OTP, forms, and payment/contact screens.
- Safe-area behavior on small Android and notched iPhone devices.
- Loading/splash screen shows the complete `Zook` wordmark or an approved replacement.

Pass criteria:

- No primary action is hidden behind warning banners, keyboards, safe areas, or the bottom bar.
- Light/dark surfaces preserve readable contrast.
- Reduced-motion setting removes or softens non-essential motion.
- Push and QR behavior are proven on physical hardware, not only simulators.

## Store Console and Release Metadata

Status: `Not certified`

Required evidence:

- App Store Connect app information, privacy labels, age rating, support URL, and screenshots.
- Play Console store listing, data safety, content rating, support email, and screenshots.
- Screenshot set generated from non-blank app states with pixel-variance guard passing.
- Refund/cancellation wording approved for membership and shop flows.
- No store copy overpromises AI, regional-language coverage, payment methods, or device features.
- Release notes include any remaining limitations or pilot scope.

Pass criteria:

- Store metadata matches implemented launch scope.
- Screenshots show real app states and do not expose private user data.
- Support/refund paths are visible and operational.
- App review credentials or demo instructions are prepared without committing passwords.

## Product and Finance Decisions

Status: `Awaiting approval`

Required decisions:

- Part E feature scope and launch order.
- GST/e-invoicing scope, invoice numbering policy, and historical remediation rules.
- Historical receipt/subscription/attendance data cleanup policy.
- Whether broader regional staff-web localization is in launch scope or fast-follow.
- Whether any remaining external gates can be explicitly moved out of launch scope.

Pass criteria:

- Each decision has an owner, date, and written approval reference.
- Any decision that changes business logic has a separate implementation item and rollback plan.
- Destructive data changes are rehearsed in staging before production.
