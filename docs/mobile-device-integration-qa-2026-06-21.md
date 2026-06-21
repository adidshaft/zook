# Mobile Device & Integration QA Report

Date: 2026-06-21

Source handoff: `/tmp/zook-mobile-device-qa-handoff.md`

## Scope

This report records the non-interactive checks that can be run from the local workstation and the remaining physical-device/live-service checks that still need a human QA pass on TestFlight and Play internal builds.

## Static Configuration Checks

### Universal Links / App Links

Verified local association files:

- `apps/web/public/.well-known/apple-app-site-association`
  - `appID`: `JP4HU7X6G7.com.zook.app`
  - paths preserved: `/checkin`, `/checkin/*`, `/join/*`, `/plans/*`, `/shop/*`, `/dashboard`
- `apps/web/public/.well-known/assetlinks.json`
  - Android package: `com.zook.app`
  - release SHA-256 present: `AF:CE:B5:DF:52:85:0C:5A:A5:70:30:CF:EF:53:57:F5:C8:39:AD:ED:16:ED:70:D1:FF:FB:BE:2C:E4:23:45:5F`

Verified mobile app config references:

- custom scheme: `zook`
- iOS bundle identifier: `com.zook.app`
- iOS associated domains: `applinks:zookfit.in`, `applinks:app.zookfit.in`
- Android package: `com.zook.app`
- Android intent filters include `https://zookfit.in` and `https://app.zookfit.in`

### Live Association File Serving

Checked live production association files on 2026-06-21:

```text
curl -sS -D /tmp/zook-aasa.headers -o /tmp/zook-aasa.body https://zookfit.in/.well-known/apple-app-site-association
curl -sS -D /tmp/zook-assetlinks.headers -o /tmp/zook-assetlinks.body https://zookfit.in/.well-known/assetlinks.json
curl -sS -D /tmp/zook-app-aasa.headers -o /tmp/zook-app-aasa.body https://app.zookfit.in/.well-known/apple-app-site-association
curl -sS -D /tmp/zook-app-assetlinks.headers -o /tmp/zook-app-assetlinks.body https://app.zookfit.in/.well-known/assetlinks.json
```

Results:

- `https://zookfit.in/.well-known/apple-app-site-association`
  - HTTP 200, no redirect
  - **Content-Type is `application/octet-stream`, not `application/json`**
  - **body is stale**: `appID` is `com.zook.app`, missing `JP4HU7X6G7.`
  - **body is missing check-in paths**: no `/checkin` or `/checkin/*`
- `https://app.zookfit.in/.well-known/apple-app-site-association`
  - HTTP 200, no redirect
  - **Content-Type is `application/octet-stream`, not `application/json`**
  - **body is stale** in the same way as `zookfit.in`
- `https://zookfit.in/.well-known/assetlinks.json`
  - HTTP 200, no redirect
  - Content-Type is `application/json; charset=UTF-8`
  - **body is stale**: `sha256_cert_fingerprints` is still `["CODEX_FILL_SHA256_FROM_EAS"]`
- `https://app.zookfit.in/.well-known/assetlinks.json`
  - HTTP 200, no redirect
  - Content-Type is `application/json; charset=UTF-8`
  - **body is stale** in the same way as `zookfit.in`

Local repo state is corrected, but the live domains are not serving the corrected files yet. A new web deployment or static-server/Caddy asset update is required before iOS universal links or Android app links can verify on production domains.

`apps/web/next.config.ts` defines JSON headers for both `.well-known` files, and `apps/web/middleware.ts` does not redirect these paths. The live `application/octet-stream` AASA response appears to come from the currently deployed/static-served artifact rather than the current local Next config.

Follow-up guard added:

- `scripts/check-mobile-release-readiness.ts` now validates local AASA/assetlinks content on every mobile release check.
- Production release checks can set `ZOOK_CHECK_LIVE_ASSOCIATION_FILES=1` to fail if either live domain serves redirected, stale, incorrectly typed, or placeholder association files.
- `docs/deployment.md` records this production release command.

Local serving check:

- Ran `pnpm --filter @zook/web dev` and curled both local paths from `http://localhost:3000`.
- `/.well-known/apple-app-site-association` returned HTTP 200, no redirect, `Content-Type: application/json`, `appID: JP4HU7X6G7.com.zook.app`, and the expected `/checkin` paths.
- `/.well-known/assetlinks.json` returned HTTP 200, no redirect, `Content-Type: application/json`, package `com.zook.app`, and the real release SHA-256 fingerprint.
- This confirms the current app code serves the association files correctly; the remaining mismatch is production deployment/static freshness.

Deployment-template fix added:

- `infra/aws/cloudformation.yaml` now writes explicit Caddy `respond` handlers for both association files before `reverse_proxy web:3000`.
- `infra/aws/README.md` documents how to apply the same Caddy block to an already-running `/opt/zook/Caddyfile` and reload Caddy.
- The live host is not visible in the AWS account configured on this workstation, SSH to `13.204.196.160:22` timed out, and no Route 53 zone for `zookfit.in` is visible here. The live host still needs an operator with the correct AWS/SSH access to apply the Caddyfile update or deploy the current web container.

Production image serving check:

- Started Docker Desktop locally and built the web production image with `docker build -t zook-web:association-check .`.
- Fixed a production build blocker where client components imported `@zook/core/services`, which pulled `node:crypto` into the browser bundle. The client imports now use `@zook/core/services/organization-service` through a package subpath export.
- Ran the built image on `localhost:3002` and curled both association files from the standalone Next server.
- `/.well-known/apple-app-site-association` returned HTTP 200, no redirect, `Content-Type: application/json`, `appID: JP4HU7X6G7.com.zook.app`, and the expected `/checkin` paths.
- `/.well-known/assetlinks.json` returned HTTP 200, no redirect, `Content-Type: application/json`, package `com.zook.app`, and the real release SHA-256 fingerprint.
- The image architecture is `arm64`, matching the AWS deploy script target.
- Pushed the committed production image to ECR in the configured AWS account:
  - repository: `477817968459.dkr.ecr.ap-south-1.amazonaws.com/zook-web`
  - tags: `7518e705`, `latest`
  - digest: `sha256:446751f69a12cfd810d5e4d4de209865f256e62641b57b0782191598ea2d5a03`
- Rechecked `https://zookfit.in/.well-known/*` after the ECR push; production still served the stale June 12 association files, so the live host did not auto-pull/restart from ECR.
- No SSM managed instances, CloudFormation stacks, or ECS clusters are visible in `ap-south-1` for the configured AWS account, so this workstation still has no control-plane path to update the running `13.204.196.160` Caddy host.
- Follow-up infrastructure audit on 2026-06-22:
  - all-region EC2 instance and Elastic IP lookup found no resource for `13.204.196.160` in the configured AWS account
  - Lightsail, App Runner, ELBv2, and CloudFront checks found no visible deployment serving `zookfit.in`
  - production still serves the stale AASA body with `appID: com.zook.app`, no `/checkin` paths, and `Content-Type: application/octet-stream`
  - production still serves `assetlinks.json` with `CODEX_FILL_SHA256_FROM_EAS`

## Device Availability Checks

### iOS

`xcrun devicectl list devices` found a paired physical iPhone:

- `Aman's iPhone`
- identifier: `3803F5B6-1666-56D3-A71A-62F131F6CE3B`
- state: `available (paired)`
- model: iPhone 15 Pro

`xcrun devicectl device info apps --device 3803F5B6-1666-56D3-A71A-62F131F6CE3B` found:

- `Zook`
- bundle identifier: `com.zook.app`
- version: `0.1.0`

Attempted to open:

```text
https://zookfit.in/checkin?checkInCode=AB-1234&qrPayload=test
```

Result:

- The openURL command failed because the physical iPhone was locked.
- CoreDevice reported the launch target as `com.apple.mobilesafari`, so this attempt is **not** accepted as a universal-link verification pass.
- A real check must be repeated with the device unlocked and a TestFlight/internal build observed opening Zook directly to the check-in flow.

### Android

`adb devices` returned no attached Android devices.

Result:

- Could not run `adb shell pm get-app-links com.zook.app`.
- Could not verify `zookfit.in` app-link status on a Play internal build.

## Remaining Required QA

### Universal Links / QR Check-In

- On an unlocked iOS physical device with TestFlight/internal Zook installed, scan a live reception Entry QR with the native camera.
- Confirm Zook opens directly to the check-in flow, not Safari.
- Confirm auto-check-in succeeds for a valid member.
- Repeat by opening a real `https://zookfit.in/checkin?checkInCode=...&qrPayload=...` URL from Notes or a message.
- On Android Play internal build, scan/open the same live link and confirm Zook opens directly, not Chrome.
- Run `adb shell pm get-app-links com.zook.app` and confirm `zookfit.in` is `verified`.
- If Play App Signing is enabled, add the Play App Signing SHA-256 fingerprint to `apps/web/public/.well-known/assetlinks.json`.

### Check-In Edge Cases

Validate app-visible server messages for:

- `NO_ACTIVE_MEMBERSHIP`, with the gym name in the message
- `MEMBERSHIP_PAUSED`
- `MEMBERSHIP_EXPIRED`
- wrong-branch checkout mismatch
- branch closed

### Camera, Location, Payments, Push, Images

Still requires physical-device/staging validation:

- QR scanner camera grant/deny/blocked states with a real signed QR payload.
- Gym profile distance with foreground location granted, and hidden distance when permission is denied.
- Maps handoff from "Get directions".
- Membership checkout through the real web checkout URL/payment provider, return-to-app, and activation.
- Owner refund flow against real payment data.
- Push notification registration, delivery, and deep-link routing.
- Remote image loading for gym gallery.
- Profile photo, gym logo upload, logo avatar rendering, and brand-monogram fallback.
- Reviews, rewards, and classes mobile screens against live backend endpoints.
- Cross-role and multi-org session switching without stale data.

## Current Status

Local static configuration and the production Docker image are consistent with the intended bundle/package IDs and domains, and the fixed image has been pushed to ECR. Live `zookfit.in` and `app.zookfit.in` are still serving stale association files because the running Caddy host has not been updated and is not visible through the configured AWS account's EC2/EIP/SSM/CloudFormation/ECS/Lightsail/App Runner/ELB/CloudFront surfaces. Real iOS universal-link verification, Android app-link verification, and live integration QA remain open because the live association files must be redeployed/fixed first, the available iPhone was locked during the openURL attempt, and no Android device was attached.
