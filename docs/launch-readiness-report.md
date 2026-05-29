# Launch Readiness Report

Updated: 2026-05-08 (Asia/Kolkata)

Scope covered: early product-readiness findings from the May 2026 launch pass. Code-side Phase 1 and Phase 2 work is implemented and locally verified. Public rollout still depends on provider credentials, quota windows, and physical-device certification.

## Executive Status

| Area | Status | Notes |
| --- | --- | --- |
| Critical security S1-S5 | Code-side done | QR secret hardening, safe signature compare, webhook idempotency gate, production fixed-OTP runtime guard, session rotation/revocation/device fingerprinting. |
| High and medium security | Done for current surfaces | S7 stays with trainer messaging scope per the implementation prompt; password-change sibling revocation is ready for the revocation path, but the product remains OTP-only. |
| UX residuals section 3 | Code-side done | Mobile mutation feedback, web mutation feedback, trial banner gating, bulk member actions, date range picker, audit diff drawer, discount breakdown, skeleton and empty-state polish. |
| New pilot capabilities | Code-side done | C7 approval/invite join, C8 expired-scan precheck, U2 plan-published fanout, C3 plan switch and pause/freeze. |
| B5 Sentry | Code-side done | Real web and mobile SDK setup, env-driven DSNs/projects, and redaction before send. |
| Provider blockers B1-B4/B6 | Human gated | Razorpay, storage, OpenAI, Expo push, and Upstash require credentialed staging/production certification. |
| Resend email path | Quota gated today | Resend has reached 100% of the daily limit on 2026-05-08, so no real email smoke was attempted in this pass. |

## Scope Status

| Proposal item | Status | Evidence / decision |
| --- | --- | --- |
| S1 QR secret | Done | `ZOOK_QR_SECRET` no longer falls back to a literal default; non-local envs require a strong secret and tests cover missing, weak, and strong cases. |
| S2 Razorpay timing compare | Done | Razorpay webhook signatures use `crypto.timingSafeEqual` with equal-length precondition. |
| S3 webhook idempotency | Done | `PaymentEvent` has a provider event unique gate, duplicate/replay handling, and concurrent replay tests. |
| S4 fixed OTP runtime guard | Done | Production verification rejects leaked fixed OTP values and audit-logs failed OTP attempts. |
| S5 session rotation/device pinning | Done for current auth | OTP login creates a fresh token with UA/IP fingerprint, role and permission changes revoke sessions, and new device notifications are emitted. Password auth is not currently a product surface. |
| S6 member enumeration | Done | Member lists use cursor pagination, hard caps, per-actor/org limits, and large-read audit logging. |
| S7 trainer-client assignment guard | Deferred with C1 | Explicitly excluded by the prompt's Phase B scope; current trainer notes/client reads remain assignment-scoped where routes exist. |
| S8 file deletion ownership | Done | Delete paths assert asset ownership/permission before removal. |
| S9 storage signed URL timing compare | Done | Local-storage signed URL verification uses safe comparison. |
| S10 OTP identifier bypass | Done | Rate limiting applies to normalized identifiers and IP. |
| S11 public org search enumeration | Done for launch | Public search remains rate-limited; a higher-tier CAPTCHA/API-key layer is parked for abuse-scale traffic. |
| S12 deleted email hash | Done | Account deletion uses non-deterministic anonymized email generation. |
| S13 guardian email ownership | Done, certification gated | Guardian consent uses email-delivered challenge link/code and records verification; live email certification waits for Resend quota reset. |
| S14 push payload PII | Done | Push payloads carry only `notificationId` and `type`; details are fetched server-side. |
| S15 secure cookies | Done | Session cookies are always secure and staging must use HTTPS. |
| S16 coupon redemption | Done | Coupon usage is atomically bounded and redemption rows are unique per payment session/user/coupon. |
| S17 receptionist branch guard | Done | Attendance/payment reception paths enforce branch ownership. |
| S18 magic-byte file validation | Done | Upload parsing validates magic bytes and rejects content-type mismatch. |
| S19 filename traversal rejection | Done | `/`, `\`, `..`, and NUL are explicitly rejected in original filenames. |
| S20 rich-text sanitization | Done | Plan content, member notes, trainer notes, and product descriptions are sanitized on write. |
| S21 AI prompt hardening | Done | AI calls receive a system-role prefix, injection-pattern rejection, and prompt/completion audit logging. |
| S22 AI response validation | Done | AI response shapes are Zod-validated before persistence. |
| S23 PII redaction | Done | Redaction patterns and recursive walking now cover nested objects/arrays and additional contact keys. |
| S24 minor consent guard | Done for touched flows | Membership, payment, scan, and plan-publication paths use the shared minor-consent gate. |
| S25 signed URL expiry | Done | File signed URLs default to and cap at five minutes. |
| S26 manual payment ceiling | Done for launch | Manual payments are capped at two per actor/org/day with reason/audit; re-OTP is parked until a dedicated confirmation surface exists. |
| S27 password-change sibling revocation | Ready path, no current route | The current product is OTP-only; role/permission sibling revocation is implemented and the same revocation helper is documented for any future password-change route. |
| S28 per-token QR counter | Done | QR tokens track scan count and last scan time, with token-scoped scan rate limiting. |
| S29 HSTS | Done | Production headers include strict HSTS. |
| S30 CSP connect-src | Done | CSP connect sources are narrowed to known service origins. |
| S31 diagnostics lock | Done | Diagnostics endpoints are platform-admin guarded and return minimal provider state. |
| S32 audit/dependabot | Done | `pnpm audit --audit-level high` is in CI and Dependabot config is present. |
| S33 file-read audit log | Done | Signed URL and file-content reads create audit entries. |
| S34 failed OTP logging | Done | Failed OTP attempts are structured security events. |
| U1 mobile silent mutations | Done | Mobile mutation flows use toast and haptic feedback, with a launch gate for bare `mutateAsync` calls. |
| U2 trial banner gating | Done | Trial banner no longer hides near-expiry active orgs due to status gating. |
| C7 approval/invite join surfaces | Done | Web and mobile show pending/approval-required and invite-code join surfaces. |
| C8 expired scan precheck | Done | Expired membership is detected before entering the reception queue. |
| C3 plan switch/pause/freeze | Done | Server endpoints, member UI, owner UI, audit entries, and proration/pause policy docs are in place. |
| 5.12 plan-published fanout | Done, email provider gated | Plan publish sends in-app and push notifications; opt-in email is behind provider availability and quota. |
| Section 3 web important block | Done | Unsaved guard, toasts, banner fix, char counter, members bulk actions, reports date picker, audit diff drawer, and join discount table are implemented. |
| Section 3 web polish | Done | Demo deltas stripped, plan-name validation centralized, stock bars color-blind-safe, contextual empty states, dynamic skeleton labels, and coupon refetch wait added. |
| B5 Sentry SDK | Done | Web and mobile use the real SDK with DSNs from env and PII scrubbing before send. |

## 6.3 Important Items

| Item | Status | Evidence / decision |
| --- | --- | --- |
| I1 cross-org isolation tests | Done | Web integration coverage asserts member and attendance isolation boundaries. |
| I2 route rate-limit registry | Done | Static route-registry check covers sensitive endpoints. |
| I3 axe a11y pass | Done | `/dashboard`, `/login`, `/g/[slug]`, and `/join/[slug]` are covered by axe tests. |
| I4 web bundle analyzer | Done | `pnpm analyze:web` completed and wrote analyzer reports under `apps/web/.next/analyze/`. |
| I5 Hindi parity | Done | New strings have `en` and `hi`; `pnpm check:i18n` is wired into build/preflight/lint. |
| I6 rich-text sanitization | Done | See S20. |
| I7 AI hardening | Done | See S21 and S22. |
| I8 file validation | Done | See S18 and S19. |
| I9 HSTS/CSP | Done | See S29 and S30. |
| I10 coupon redemption | Done | See S16. |
| I11 receptionist branch guard | Done | See S17. |
| I12 PII redaction | Done | See S23. |
| I13 deletion email randomization | Done | See S12. |
| I14 minimal push payload | Done | See S14. |
| I15 secure cookies | Done | See S15. |
| I16 sibling session revocation | Done for current session-changing routes | Role and permission changes revoke affected sessions; password-change is not a current route. |
| I17 per-token QR counter | Done | See S28. |
| I18 diagnostics admin lock | Done | See S31. |
| I19 audit/dependabot | Done | See S32. |
| I20 file-read audit log | Done | See S33. |

## Blocker Status B1-B6

| Blocker | Code-side state | Remaining human step |
| --- | --- | --- |
| B1 Razorpay live + signed webhook cert | Signature verification and idempotency are hardened. | Add live credentials and run signed staging/prod webhook certification for success, failure, duplicate, and out-of-order paths. |
| B2 S3/R2 or storage provider cert | File validation, signed URL expiry, deletion guards, and read auditing are implemented. | Promote/certify the selected storage provider with real bucket credentials. |
| B3 OpenAI live keys + error-path tests | AI is safety-hardened and can remain feature-gated. | Certify quota, 401, 429, and 5xx behavior in staging before enabling. |
| B4 Expo push device QA | Payload shape is minimal and notification routing remains code-side ready. | Run physical iOS and Android foreground/background/cold-start push QA. |
| B5 Sentry SDK | Closed code-side. | Promote Sentry env vars and verify handled/unhandled staging events. |
| B6 Upstash Redis prod env | Runtime/preflight supports non-memory production rate limiting. | Promote Upstash REST URL/token and verify production preflight rejects missing/unsafe providers. |

## Web UX Gap Fixes

| Phase / item | Status | Launch-readiness audit note |
| --- | --- | --- |
| Phase A primitives | Done | `RadioCardGroup`, `HelpHint`, `ManagedOn`, and `SearchableSelect` are shared web primitives with colocated unit tests and stories. Visible to roles through consuming screens; no direct audit event. |
| Phase B chip-picker migrations | Done | Notification composer message type/audience and dashboard commerce preset chips now use `RadioCardGroup`. Owners/admins with message or dashboard permissions can see them; submit actions use existing notification/product audit paths. |
| Phase B in-flight disabling gate | Done | `check-launch-gates` flags busy form buttons that are not disabled, preserving operator feedback during mutations. Applies to all web roles through CI; no runtime audit event. |
| Phase C searchable branch switcher | Done | Branch switching uses `SearchableSelect`, including narrow viewport behavior. Owners/admins/receptionists see it behind dashboard access; branch changes are navigation-only and produce no audit log. |
| Phase C member and picker migration | Done | Notification member picker, staff role/branch pickers, member plan switch picker, and plan-shape pickers use searchable/selectable controls where the rule calls for it. Existing member, staff, plan, and notification mutations retain their audit events. |
| Phase D deep links | Done | Shop order rows link to Desk pickup, Desk honors `tab` and `orderId`, checkout links return users to subscription/order destinations, and notification queues link to history. Owners/admins/receptionists see role-appropriate links; fulfillment and payment actions keep existing audit logs. |
| Phase D modals and drawers | Done | Audit row details open an inline diff drawer and assistant draft rows open details. Owners/admins with audit/AI access can see them; viewing is read-only and not audited. |
| Phase D filters and exception actions | Done | Payments gain order status filters and bulk fulfillment controls, reports add date-range validation, and attendance exception tiles expose review actions. Owners/admins/receptionists see them behind their existing section permissions; approving/rejecting/payment actions audit through current routes. |
| Phase D ManagedOn placements | Done | Desk, shop orders, payments, member activity, coaching library, AI drafts, and settings companion surfaces show concise ownership hints. Visible by role with the section; no audit event. |
| Phase E HelpHint coverage | Done | Header help, branch manager help, pickup code help, payment/refund/discount/stock/staff/branch-hours/attendance hints, and section-specific help are wired. Visible wherever the section is visible; no audit event. |
| Phase E Companion App panel | Done | Settings includes the global companion app panel with operational ownership guidance. Owners/admins with settings access see it; no audit event. |
| Phase F remaining web UX items | Done | Trial banner gating, missing-branch-manager badge, discount placeholders, contextual empty states, color-blind status icons, direct UPI labeling, referral actions, notification affordances, branch-scoped client resources, and demo metric stripping are landed. Mutations keep existing audit logs; read-only affordances do not create logs. |
| Phase G Hindi, axe, screenshot/test affordances | Done | New `webUx` keys have English and Hindi entries, i18n and axe checks pass, and Playwright covers branch dropdown, shop order to Desk deep-link, and audit row to diff drawer. No separate screenshot-diff script exists in this repo. |
| Phase H verification | Done | Full verification battery passed; results are listed in the verification table below. |

## Mobile UX Polish

| Phase / item | Status | Evidence / decision |
| --- | --- | --- |
| Phase A primitives | Code-side done | Added `ChipGroup`, upgraded `ZookButton`, `QueryErrorState`, `DatePickerField`, `OtpInput`, `NetworkBanner`, app-focus invalidation, last-value helpers, toast helpers, and Reanimated motion utilities with mobile tests and Storybook coverage. |
| Phase B selection correctness | Code-side done | Scan mode, tracking type/date inputs, profile role switching, and membership renewal choices now use disabled/busy states, haptics, toast feedback, and single-source selection primitives. Settings preference rapid-tap protection was already covered by the existing mutation gating pattern. |
| Phase C navigation | Code-side done | Notification detail opens from the inbox as a sheet while deep-link routes remain valid; bottom navigation uses route-derived active state; unknown notifications route to detail with a Sentry breadcrumb; renewal sheet state resets on close; tracking entry has Android hardware-back dirty guards. |
| Phase D states | Code-side done | `QueryErrorState` is adopted on touched query surfaces, membership/find-gym/home notification refreshes run on app focus, skeletons remain shape-matched, and long-list conversions were kept to touched/high-risk surfaces to avoid web/backend scope creep. |
| Phase E incomplete features | Code-side done | Owner metrics drill in, bulk join approvals are available, trainer publish uses an explicit confirmation, trainer message intent opens the system share sheet, paused memberships expose resume controls, member home has greeting/today-plan affordances, and receptionist verification has success/failure motion. |
| Phase F forms | Code-side done | Login has blur validation, OTP cell input, `+91` affordance, and busy buttons; reception amount input uses decimal pad and rupee affordance; tracking entry uses the date picker primitive, counters, required-field validation, keyboard dismiss, and destructive confirmation. |
| Phase G onboarding | Code-side done | Splash can be skipped, onboarding motion respects reduced motion, role choices have icons, permission steps include a soft ask, and existing first-time member/owner empty-state surfaces remain in place. |
| Phase H premium feel | Code-side done | Scan failure auto-recovers, pickup QR breathes through Reanimated, toast placement avoids keyboard/bottom-nav collisions, notification read/unread states are stronger, and verification feedback animates without new `Animated.Value`s. |
| Phase I accessibility | Code-side done | Added image labels on home/find-gym surfaces, preserved `PickupQR` image role, added accessibility labels on touched Pressables, and routed nonessential motion through reduced-motion-aware utilities. |
| Phase J offline/stale/auth | Code-side done | Added a NetInfo-powered offline banner, shortened branch stale time, invalidated visible member/branch/notification queries on app focus, guarded org-switch races, surfaced branch-removal fallback, and revalidated stale roles. |
| Phase K push | Partially code-side done | Unknown/cold-start notification destinations now fall back safely through notification detail routing; native push soft-ask, token refresh re-registration, and permission-off settings tile still require a device push pass before claiming provider readiness. |
| Phase L branch/role | Code-side done | Profile role switching is guarded, stale roles are reset with a toast, and branch selection protects against single-org race conditions. |
| Phase M cross-cutting | Code-side done | Standard toast helpers, haptic-backed primary actions, Reanimated toast/motion utilities, Sentry breadcrumbs for unknown notification routing, and i18n parity for new copy are in place. |
| Phase N verification | Automated checks green; physical-device QA pending | `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm test:services`, `pnpm test:web`, `pnpm test:acceptance`, and `pnpm check:launch-gates` passed. Physical iPhone/Android matrix QA remains a human launch gate under B4. |

## Files Changed Summary

- Security and API: auth/session handling, rate limits, webhook/payment paths, storage/file validation, diagnostics, AI safety, rich-text sanitization, QR scan handling, coupon redemption, and audit logging.
- Database: session fingerprint fields, QR scan counters, subscription pause fields, coupon redemption uniqueness/counts, and supporting migration.
- Web: dashboard members/reports/audit/plans/shop/join surfaces, public join approval/invite states, trial banner gating, skeleton/empty-state polish, mutation toasts, i18n checks, CSP/HSTS, Sentry setup, and CI gates.
- Mobile: shared UX primitives, scan/tracking/login/membership/notifications/reception/profile/onboarding polish, offline banner, app-focus refresh, mutation toast/haptics, Reanimated motion, and accessibility labels.
- CI/scripts/docs: launch gates, i18n gate, audit/dependabot, preflight integration, runbook, followups, and this report.

## Verification

| Check | Result |
| --- | --- |
| `pnpm install` | Passed; install completed with the existing ignored build-script warning for `@sentry/cli`. |
| `pnpm typecheck` | Passed. |
| `pnpm test:unit` | Passed: 37 files, 185 tests. |
| `pnpm test:services` | Passed: 14 files, 60 tests. |
| `pnpm test:web` | Passed: 10 passed, 28 DB-gated skipped. |
| `pnpm test:acceptance` | Passed: 37 passed, 1 skipped. |
| `pnpm --filter @zook/mobile typecheck` | Passed. |
| `pnpm --filter @zook/mobile test` | Passed. |
| `pnpm --filter @zook/mobile lint` | Passed. |
| `pnpm db:generate` | Passed. |
| `pnpm release:preflight` | Passed with local warnings for weak local secrets, local QR secret, mock push, and Prisma drift/config status warning. |
| `APP_ENV=local API_MODE=backend pnpm preflight` | Passed with local warnings for weak local secrets and mock push. |
| `pnpm env:check` | Passed with local warnings for weak local secrets and mock push. |
| `pnpm analyze:web` | Passed; emitted analyzer reports and one non-fatal `file-type` dynamic import warning. |
| `pnpm audit --audit-level high` | Passed; audit reports one low and five moderate advisories. |
| `pnpm lint` | Passed; includes ESLint, i18n copy guard, and launch gates. |
| `pnpm check:i18n` | Passed. |
| `pnpm check:launch-gates` | Passed. |
| Banned marker sweep | Passed under `apps/`, `packages/`, and `scripts/`. |
| User-facing top-level loading text sweep | Passed under web and mobile app code. |
| `git diff --check` | Passed. |
| Mobile physical-device QA | Not run in this shell environment; remains the B4 human launch gate for iPhone SE, iPhone 15, Pixel 6, and mid-range Android. |

## Decisions Made

- Email fanout for plan publication is provider-gated and opt-in; no real Resend send was run because the account hit its daily limit on 2026-05-08.
- Pause/freeze policy defaults to 30 paused days per member subscription year. Operators can override via `membershipPauseCapDaysPerYear` or `pauseCapDaysPerYear`.
- Plan switch proration credits unused days by extending the new plan at the new plan's daily rate; cash refunds remain a manual finance decision.
- Password-change sibling revocation is documented as ready for the shared revocation helper, but no password-change route was added because the current auth model is OTP-only.
- S7 trainer-client guard consolidation stays with the trainer messaging capability, matching the prompt's explicit S6-S17 except S7 scope.
- Provider certification remains a human gate; code-side local verification does not claim Razorpay, storage, OpenAI, Expo, Upstash, Sentry, or Resend production readiness.
- Mobile push provider readiness is not claimed from this pass; the code-side routing fallback is in place, but native permission prompts, token refresh behavior, and cold-start delivery still need the B4 physical-device checklist.
