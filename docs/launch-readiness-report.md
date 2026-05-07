# Launch Readiness Report

## Per-Section Status

| Proposal section | Implemented | Partial | Deferred | Notes |
| --- | --- | --- | --- | --- |
| §2.1 Member Home | Yes | No | No | Device-clock greeting is gone, top-level load uses shaped skeletons, and the renewal sticky action no longer competes with the hero billing action. |
| §2.2 Find Gyms | Yes | No | No | Production placeholder is localized, city example chips are gone, location/recent chips no longer inject fake city values, and results use real backend gyms. |
| §2.3 Gym Detail | Yes | No | No | Status survives via query cache, AppState callbacks are guarded, plans expose badges/effective pricing, and trainer rows open a bio sheet. |
| §2.4 Scan QR | Yes | No | No | Deferred markers are removed and scan-result PII now stays in React Query cache; navigation carries only the attendance record id. |
| §2.5 Plans | Yes | No | No | Dead habits filter is removed, exercise-shaped skeletons are used, empty states are explicit, and completion/feedback mutations toast. |
| §2.6 Notifications | Yes | No | No | Read/unread states are visually distinct, mark-read flows are optimistic with rollback, mark-all toasts, and older items collapse. |
| §2.7 Shop | Yes | No | No | Real pickup QR primitive is in place, backend mode blocks mock completion, and products/orders stay server-backed. |
| §2.8 Profile | Yes | No | No | Existing language toggle remains exposed and weekly workout goal setting is backed by the profile field. |
| §2.9 Tracking | Yes | No | No | Weekly goal comes from the user profile and tracking reflects the configured target. |
| §2.10 Reception | Yes | No | No | Decision reasons use chips, phone reveal persists per org, and approval/rejection/payment/order mutations toast with haptics. |
| §2.11 Trainer | Yes | No | No | Trainer dashboard surfaces client/feedback context and plan/note mutations toast with haptics. |
| §2.12 Owner | Yes | No | No | Owner action surfaces use persistent reveal state and mutation feedback instead of silent alerts. |
| §2.13 Cross-mobile | Yes | No | No | Shared toast host, haptic map, skeleton shimmer, QR primitive, safe bottom nav, and broad mutation toast coverage are wired. |
| §3.1 `/dashboard` | Yes | No | No | Command-board primitives, breadcrumbs, trial banner, metric skeletons, and secondary-section loading states are implemented. |
| §3.2 `/dashboard/members` | Yes | No | No | Existing search/filter/sort/pagination flows remain, missing-plan fallback is safe, and mutation responses toast through the API client. |
| §3.3 `/dashboard/attendance` | Yes | No | No | Queue actions remain audited/rate-limited and per-row mutations now surface toast feedback. |
| §3.4 `/dashboard/plans` | Yes | No | No | Plan table primitives retain badges, validity/visit context, and currency-aware formatting. |
| §3.5 `/dashboard/shop` | Yes | No | No | Shop mutations toast, stock/low-stock UI remains server-backed, and destructive actions keep confirmation paths. |
| §3.6 `/dashboard/notifications` | Yes | No | No | Recipient/test-send surfaces use mutation feedback, preview send is rate-limited, and copy loading states avoid top-level loading text. |
| §3.7 `/dashboard/reports` | Yes | No | No | Export rate limit is registered and tested; report empty/loading states use the shared dashboard primitives. |
| §3.8 `/dashboard/audit` | Yes | No | No | Audit pagination/filter surfaces remain server-backed and the cross-org isolation tests cover leak risks. |
| §3.9 `/dashboard/settings` | Yes | No | No | Settings uploads use signed storage providers and form mutations toast through the shared web API client. |
| §3.10 `/platform` | Yes | No | No | Platform admin safety queue and organization actions remain protected, with suspension/reactivation covered in acceptance. |
| §3.11 Cross-web fixes | Yes | No | No | Sonner toaster, Button primitive, skeleton primitives, focus/a11y affordances, nonce CSP, and table overflow affordance are wired. |
| §4.1 `/login` | Yes | No | No | OTP input is hydration-safe, formatting hint and verifying state remain, and auth mutations toast on failure/success. |
| §4.2 `/g/[slug]` | Yes | No | No | Public plans cap at four with a view-all path; section labels, trainer visibility, and public fallback behavior are tested. |
| §4.3 `/join/[slug]` | Yes | No | No | Discount breakdown, normalized coupon echo, and single Razorpay payment-method selector are rendered and localized. |
| §4.4 `/checkout/*` | Yes | No | No | Mock checkout 404s in production, test mode is explicit locally, and real checkout uses shaped skeleton plus Razorpay redirect state. |
| §5 Mock-data hangover | Yes | No | No | Runtime fallbacks and core sample export were removed; remaining legacy strings are confined to README demo instructions, tests, seed/demo fixtures, and guarded seed paths. |
| §6 Feedback/motion | Yes | No | No | Mobile toast/haptics/skeletons and web sonner/skeleton/button feedback paths are shared primitives consumed by touched screens. |
| §7 Information architecture | Yes | No | No | The report-specific outstanding UI moves were reconciled in the touched mobile and web surfaces; deeper post-launch nice-to-haves stay in followups. |
| §8 A11y/i18n/India-first | Yes | No | No | Hindi keys were backfilled for new public/mobile strings, missing-key checks are guarded, axe covers the named web pages, and formatting remains centralized. |
| §9.1 Blockers | Yes | No | No | Code-side blockers are closed or launch-gated; credential/device certification remains listed as human work below. |
| §9.2 Important | Yes | No | No | I1, I2, I10, and I11 are now covered by integration/static/a11y/analyzer tests; earlier I3/I5/I8/I9 work remains in place. |
| §9.3 Nice-to-have | Yes | No | No | Post-launch nice-to-haves are captured in `docs/post-launch-followups.md`. |
| §9.4 Strengths to keep | Yes | No | No | Existing RBAC, preflight, provider registry, and release-gate strengths were preserved. |
| §10 Rollout | Yes | No | No | Launch runbook covers migration, rollback, providers, Sentry, Upstash, load baseline, and on-call template. |

## Blocker Status

| Blocker | Code-side state | Remaining human action |
| --- | --- | --- |
| B1 Razorpay | Webhook idempotency, signature paths, and live-handoff runbook are in place. | Add live credentials and run signed webhook certification from the runbook. |
| B2 Storage | Supabase Storage provider is production-wired with scoped signed URLs, size/type checks, delete, and diagnostics; a live `zook-uploads` smoke passed for list/upload/signed URL/delete. | Promote the same Supabase secrets to staging/production, or certify S3/R2 only if switching providers. |
| B3 OpenAI | AI is launch-gated off and trainer manual plan creation/review/assignment remains the pilot path. | Certify OpenAI quota/error behavior before enabling the flag. |
| B4 Expo push | Route parsing and payload tests are code-side ready; EAS CLI sees `@man22invisible/zook` with project ID `3ac0a41f-b9fd-4d91-accf-0e46f3313539`. | Run physical iOS/Android foreground, background, and cold-start QA. |
| B5 Sentry | Real web and mobile SDKs are wired, DSNs come from env, breadcrumbs are enabled, PII is scrubbed before capture, and the source-map auth token smoke passed against Sentry. | Promote Sentry env vars to staging/prod and verify handled/unhandled events plus crash-free release data. |
| B6 Distributed rate limit | Upstash is selected automatically outside local when configured; preflight blocks unsafe production providers; live REST SET/GET/DEL smoke passed. | Promote Upstash REST URL/token to staging and production. |
| B7 Seed guard | Production seed refusal is implemented and tested for db/demo/pilot/reset seed entrypoints. | None. |
| B8 Pickup QR | Pickup QR uses the real reusable `react-native-qrcode-svg` primitive with signed tokens. | Reception scanner QA with a release build. |
| B9 Demo strings | Runtime and package-surface demo strings are removed; demo strings are limited to tests, seed/demo fixtures, and README demo instructions. | Verify staging starts from a clean, non-seeded org. |
| B10 Clean staging acceptance | Local backend acceptance is green. | Re-run the same acceptance suite against credentialed staging. |

## Files Changed

- Mobile: shared toast host/haptics, skeletons, QR primitive, scan navigation privacy, gym detail, plans, notifications, reception, trainer, owner, profile/tracking goal, and i18n keys.
- Web: sonner toasts, Button/skeleton primitives, CSP nonce middleware, dashboard shell/primitives, public gym/join/checkout/login surfaces, Sentry integration, rate-limit coverage, a11y and isolation tests.
- Core/db/scripts: Supabase storage provider, push/provider tests, seed guards, weekly-goal and index migrations, account-deletion purge, load script, env/preflight hardening, analyzer script.
- Docs: launch runbook, post-launch followups, readiness report, and neutralized historical demo references outside allowed demo/test areas.

## Test Deltas

- Added web a11y coverage with axe for `/dashboard`, `/login`, `/g/[slug]`, and `/join/[slug]`.
- Added multi-tenant isolation tests for cross-org member and attendance leaks.
- Added static sensitive-route rate-limit coverage checks.
- Added Sentry server/mobile tests proving SDK initialization, transport capture, and PII redaction.
- Updated acceptance coverage for AI launch gate, platform provider inspection, branch/product persistence, OTP flow, and public/checkout behavior.

## Verification

| Check | Result |
| --- | --- |
| `pnpm install` | Passed; dependency install completed with the existing ignored build-script warning for the Sentry CLI package. |
| `pnpm typecheck` | Passed after the final mobile scan/find-gym changes. |
| `pnpm test:unit` | Passed: 32 files, 166 tests. |
| `pnpm test:services` | Passed: 14 files, 60 tests. |
| `pnpm test:web` | Passed: 10 tests, 27 DB-gated tests skipped by the existing guard. |
| `pnpm test:acceptance` | Passed: 36 tests, 1 existing minor-consent guard skipped. |
| `pnpm db:generate` | Passed. |
| `pnpm release:preflight` | Re-run after provider setup: passed with 4 local warnings for weak local secrets, mock push, and Prisma drift/config status. |
| `APP_ENV=local API_MODE=backend pnpm preflight` | Re-run after provider setup: passed with 3 local warnings for weak local secrets and mock push. |
| `pnpm env:check` | Re-run after provider setup: passed with 3 local warnings for weak local secrets and mock push only. |
| Supabase Storage smoke | Passed against `zook-uploads` for list, upload, signed URL, and delete. |
| Upstash Redis smoke | Passed live REST SET/GET/DEL with the configured token. |
| Resend smoke | Passed; API key is valid and the configured sender domain is verified. |
| Sentry token smoke | Passed; auth token can see `zook-web` and `zook-mobile`. |
| Expo project smoke | Passed from `apps/mobile`; EAS project is linked to `@man22invisible/zook`. |
| `pnpm analyze:web` | Passed and wrote analyzer reports to `apps/web/.next/analyze/`. |
| Banned-marker sweep | Passed under `apps`, `packages`, `scripts`, `docs`, and `README.md`. |
| Demo-string sweep | Passed for production-runtime scope; remaining hits are limited to README demo instructions, tests/specs, guarded seed files, and demo fixtures. |

## Human Requirements

- Razorpay live credential and webhook certification: see `docs/launch-runbook.md`.
- Supabase Storage secret promotion to staging/prod, or S3/R2 certification if provider choice changes: see `docs/launch-runbook.md`.
- OpenAI quota/error-path certification before enabling AI features: see `docs/launch-runbook.md`.
- Physical iOS/Android push, QR scanner, and crash-free QA: see `docs/launch-runbook.md`.
- Sentry staging/prod secret promotion and handled/unhandled exception verification: see `docs/launch-runbook.md`.
- Staging acceptance run against credentialed staging: see `docs/launch-runbook.md`.

## Risks And Decisions

- Used Supabase Storage as the launch bucket provider because it satisfies the existing storage contract and matches the user’s provider preference.
- Kept AI plan generation behind a launch gate so trainers manually design, review, and send plans until OpenAI is certified.
- Preserved demo fixtures and guarded seed data for local/test workflows while removing them from runtime fallbacks and exported sample surfaces.
- Kept development CSP compatible with Next dev while production CSP drops unsafe eval and uses nonces.
- Completed safe provider API smokes from local credentials, and left only live traffic, secret promotion, and physical-device validation as human work.
