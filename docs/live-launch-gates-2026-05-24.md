# Live Launch Gates - 2026-05-24

This note records the live/manual production gates run on 2026-05-24 after the
phase branches were merged to `main`.

## Passed

- Production readiness endpoints returned healthy for `zookfit.in`,
  `www.zookfit.in`, `app.zookfit.in`, and `dashboard.zookfit.in`.
- Razorpay production webhook is enabled for
  `https://www.zookfit.in/api/payments/webhooks/razorpay`, has a configured
  secret, and includes payment, order, subscription, and refund events.
- Razorpay signed webhook smoke passed against the live endpoint with signed
  synthetic `payment.captured` and `refund.processed` fixtures. Both responses
  returned HTTP 200 with `ok: true`.
- Resend production smoke sent message
  `73a4df8f-526d-4e0b-876e-06b2bd13e939` to `adidshaft@gmail.com`.
- Gmail receipt evidence showed sender `Zook <noreply@zookfit.in>`,
  mailed-by `send.zookfit.in`, signed-by `zookfit.in`, and TLS transport.
- Google OAuth production client `Zook Web Production` has the expected
  JavaScript origins for `https://www.zookfit.in`, `https://zookfit.in`, and
  `https://app.zookfit.in`, plus matching login redirect URIs.
- Expo production project evidence showed recent finished iOS App Store and
  Android Play Store builds/submissions.
- Production push-device audit found one active iOS device record without
  exposing token, user ID, or org ID.

## Failed Or Not Certified

- Expo physical-device push is not certified. A single benign launch-smoke push
  was attempted through Expo's production push API, but Expo returned an error
  indicating the active production token is not a valid registered Expo token.
- Production load smoke was functionally healthy but failed the configured
  latency threshold. With `K6_VUS=5`, `K6_DURATION=1m`, and
  `ZOOK_BASE_URL=https://zookfit.in`, checks passed 244/244 and
  `http_req_failed` was 0%, but `http_req_duration p(95)` was 1.48s against the
  configured 750ms threshold.
- Real Razorpay live payment/refund state-transition certification was not run.
  The signed webhook path is certified, but initiating a real live payment or
  refund requires explicit financial-operation approval.
- Raw SPF/DMARC headers were not captured automatically. Gmail showed domain
  mailing/signing alignment, but full header evidence still needs manual export
  if required.

## Intentionally Skipped

- Supabase scheduled backups and PITR were not enabled. The project is on the
  Free plan; scheduled backups require Pro, and PITR is a paid Pro add-on.
  This was skipped per owner instruction because it requires money.

