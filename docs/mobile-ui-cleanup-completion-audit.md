# Mobile UI Cleanup Completion Audit

Last updated: 18 June 2026

Branch: `mobile-ui-cleanup`

This audit records the current evidence for the active mobile/web/product cleanup goal. It is not a
production launch certification. The branch has code-side coverage for the requested mobile
leftovers, web UX items, and product Part A/B rollout artifacts, but the goal cannot be marked
fully complete until the human/device/provider gates below have external evidence.

## Code-side evidence

### Mobile leftovers

- `R1` Android elevation cleanup: `a46bfdd R1: add Android elevation to scan action`
- `R2` mobile header hierarchy decision: `c9aa14b R2: document mobile header hierarchy`
- `R3` mobile typography aliases: `942d400 R3: prune mobile typography aliases`
- `R4` contrast audit token source: `951d65f R4: use real tokens in contrast audit`
- Follow-up mobile UX fixes are also on the branch, including branch-selector alignment, owner
  access actions, Apple sign-in iOS-only behavior, loading wordmark visibility, and bottom-bar
  selected-state consistency.

### Web UI/UX plan

- Blockers `WB1` through `WB4` are represented in branch history.
- High-priority web work `WH1` through `WH8` is represented in branch history.
- Medium/polish/systemic web work landed across `WM*`, `WP*`, and `WS*` commits.
- `docs/launch-readiness-report.md` records the web UX phases as code-side done, including Hindi
  parity, axe coverage, public metadata, destructive-action confirmation, and dashboard flow fixes.

### Product plan Part A and Part B

- Part A P0 atomicity/security work landed through `A1.*` and `A2.*` commits.
- Part A P1/API/queue work landed through `A3.*` and `A4.*` commits.
- Part B data-model rollouts are documented and scripted for `B1` through `B6`.
- Destructive or production-sensitive DB changes were intentionally not applied directly. Each
  rollout uses staging SQL, duplicate/orphan audits, validation queries, and rollback notes.

## Proposed migrations and staging-only artifacts

These are proposed only and require staging rehearsal before production:

- `A1.1`: FK inventory and referential-integrity orphan audits.
- `A1.5`: single-active-subscription partial unique index.
- `A1.6`: attendance per-day uniqueness.
- `A1.7`: visit-deduction uniqueness.
- `A3.1`: durable `BackgroundJob` queue.
- `A3.2`: platform broadcast fan-out validation.
- `A3.3`: async push delivery validation.
- `A3.4`: renewal reminder queue validation.
- `A3.6`: idempotency expiry and purge validation.
- `B1`: multi-role/multi-branch RBAC uniqueness.
- `B2`: status enum conversion.
- `B3`: invoice column collapse.
- `B4`: branch-scope model metadata.
- `B5`: uniqueness gaps for receipt numbers, AI quota, and subscription payment linkage.
- `B6`: retention metadata, purge batches, and AuditLog partitioning rehearsal.

## Remaining gates

These are not code-completable from this workspace without external action or approval:

- Live Razorpay checkout evidence: run real membership and shop payments, verify webhooks, and
  capture payment/refund evidence.
- Provider credential certification: storage, OpenAI if enabled, Expo push, Sentry, Upstash, Resend,
  and MSG91 production credentials need staging/production promotion evidence.
- Physical-device QA: iOS and Android foreground/background/cold-start push, low-light QR scanning,
  full role walkthroughs, keyboard behavior, safe areas, and motion smoothness.
- Store-console work: App Store/Play metadata, screenshots, data safety, age rating, support
  details, and refund/cancellation wording.
- Razorpay checkout configuration: confirm UPI prominence in the hosted checkout dashboard.
- Product-scope decisions: Part E features, GST/e-invoicing scope, any historical data remediation,
  and broader regional staff-web localization need explicit approval before implementation.

Use `docs/mobile-ui-cleanup-external-evidence-checklist.md` to record the evidence for these gates
without committing secrets, raw tokens, or unredacted customer/provider data.

## Completion status

Do not mark the active goal complete from code history alone. Code-side implementation and rollout
tooling are in place for the visible plan items, but final completion requires attaching the external
evidence above or explicitly narrowing the launch scope with product approval.
