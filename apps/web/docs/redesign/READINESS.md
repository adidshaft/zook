# Zook Redesign Readiness

Verdict: READY WITH CAVEATS

The redesign is rollout-ready after the small fixes below, provided the manual provider/dashboard checks in `E2E-MATRIX.md` pass on staging and production. No P0 blockers were found.

## Fixes Shipped In This Sprint

| Fix | Files | PR |
| --- | --- | --- |
| Suppressed React hydration noise for the nonce-bearing theme bootstrap script and aligned server `color-scheme` with `data-theme`. | `apps/web/app/layout.tsx` | Inline in rollout PR |
| Ensured production EAS builds strip demo modules by setting `EXPO_PUBLIC_INCLUDE_DEMO=false`. | `apps/mobile/eas.json` | Inline in rollout PR |

No separate fix PR was required because each fix stayed under the branch threshold of 3 files / 100 lines.

## Deferred Issues

| file:line | Severity | Description |
| --- | --- | --- |
| `apps/web/src/lib/host-routing.ts:3` | P2 | `/staff/invite/[token]` is classified under staff-host paths even though middleware exempts it from auth; manually verify invite links after dashboard domain provisioning. |
| `apps/web/app/layout.tsx:76` | P2 | `zook_theme=system` resolves to light on the server before the bootstrap can apply the OS preference; users with system-dark may see a brief light first paint. |
| `apps/mobile/app.config.ts:35` | P2 | Native config still declares `userInterfaceStyle: "dark"` while the redesigned runtime theme defaults to light/system-aware behavior; verify store builds for launch-screen/theme parity. |
| `apps/web/src/components/public/footer.tsx:9` | P2 | Footer year is generated at render time; not harmful for rollout, but keep an eye on SSR/client date drift around year boundary. |
| `apps/web/src/components/dashboard/shell/dashboard-header.tsx:27` | P2 | Trial-days label uses `Date.now()` in render; not a rollout blocker, but a future hydration hardening candidate. |
| `apps/web/src/components/dashboard/shell/dashboard-overview.tsx:232` | P2 | Dashboard date label is generated from current locale/time; acceptable for rollout, but should be snapshotted if hydration strictness increases. |
| `apps/web/src/components/attendance-qr-panel.tsx:91` | P2 | QR elapsed-time UI is client-time based; works today, but should remain client-only if refactored. |

## Manual Pre-Launch Checklist

| Area | Check |
| --- | --- |
| DNS/Vercel | `dashboard.zookfit.in` CNAME, Vercel domain verification, TLS active. |
| OAuth | Google and Apple login on public and dashboard hosts. |
| Razorpay | Test checkout, live webhook delivery, invalid signature rejection, refund smoke. |
| Cron | `/api/cron/renewal-reminders` rejects without `CRON_SECRET` and succeeds with it. |
| Mobile iOS/Android | Production EAS builds install, no demo API/banner, QR scan works, push token registers. |
| Staff invite | Fresh invite token opens and accepts on intended host. |
| Store dashboards | Phased release/rollback controls ready in App Store Connect and Play Console. |

## Env Vars Referenced In Code But Missing From Local Env Files

These were referenced by `apps/web` but absent from the checked local env snapshots I inspected (`.env.example`, `.env.local`, `.env.production.local`, `.vercel/.env.production.local`). Some are intentionally CI/test-only.

| Var | Readiness note |
| --- | --- |
| `ACCOUNT_DELETION_RETENTION_DAYS` | Optional default exists, but set explicitly for production policy. |
| `ANALYZE` | Build-analysis only; leave unset. |
| `CACHE_PROVIDER` | Align with `SERVER_CACHE_PROVIDER`; production should use Redis if cache is enabled. |
| `HOME` | Platform-provided. |
| `MAESTRO_BIN` | Test-only. |
| `MAESTRO_FLOW_TIMEOUT_MS` | Test-only. |
| `MAESTRO_IOS_UDID` | Test-only. |
| `NEXT_DIST_DIR` | Build/runtime internal. |
| `NEXT_PUBLIC_ANDROID_APP_URL` | Set when Play Store URL is final. |
| `NEXT_PUBLIC_APP_NAME` | Set to `Zook` for production. |
| `NEXT_PUBLIC_ENV_PROFILE` | Set to `production`. |
| `NEXT_PUBLIC_IOS_APP_URL` | Set when App Store URL is final. |
| `NEXT_PUBLIC_MOBILE_WEB_URL` | Set to `https://zookfit.in`. |
| `NEXT_PUBLIC_PAYMENT_PROVIDER_LABEL` | Set to `Razorpay`. |
| `NEXT_RUNTIME` | Platform-provided. |
| `RUN_DB_WEB_TESTS` | Test-only. |
| `WALKTHROUGH_INCLUDE_PUBLIC` | Test-only. |
| `WALKTHROUGH_ROLES` | Test-only. |
| `WEB_DEMO_FALLBACK` | Set `false` or leave disabled in production. |
| `ZOOK_BUILD_VERSION` | Set to git SHA during deploy. |
| `ZOOK_SAAS_MONTHLY_AMOUNT_PAISE` | Set to agreed production amount. |

## Known User-Facing Caveats

| Caveat | Communication |
| --- | --- |
| System-dark users may briefly see light theme before bootstrap applies dark. | Treat as cosmetic; no launch comms required unless users report flicker. |
| Existing unauthenticated public pages probe session and can log 401 resource lines in browser devtools. | Expected for logged-out users; support should not treat this alone as an auth outage. |
| Watchman may recrawl the monorepo when booting Metro locally. | Developer-only; clear Watchman state if it slows local QA. |

