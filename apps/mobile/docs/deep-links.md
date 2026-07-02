# Mobile deep links

This file documents incoming mobile paths that are kept for universal links,
printed QR codes, referral links, or legacy aliases. Do not delete an alias route
without checking the reason column and the matching associated-domain/AASA setup.

## Gym profile links

| Incoming path | Canonical target | Why it exists |
| --- | --- | --- |
| `/gyms/[username]` | `/gyms/[username]` | Canonical in-app gym profile route. Public gym discovery and profile cards should link here. |
| `/g/[username]` | `/gyms/[username]` | Short universal-link alias for printed material and compact sharing. Preserves optional `ref` query. |
| `/gym/[username]` | `/gyms/[username]` | Legacy singular alias from earlier public profile links. Preserves optional `ref` query. |
| `/join/[username]` | `/gyms/[username]?intent=join` | Join-intent alias used by join CTAs, referral sharing, and QR posters. Preserves optional `ref` query. |
| `/r/[code]` | `/gyms/[username]?ref=[code]` when the referral lookup resolves; otherwise `/gyms?ref=[code]&focus=referral` | Referral short-link entrypoint. It resolves the code before forwarding to the matching gym profile. |

## Plan links

| Incoming path | Canonical target | Why it exists |
| --- | --- | --- |
| `/plan/[assignmentId]` | `/plan/[assignmentId]` | Canonical member plan detail route. |
| `/plans/[assignmentId]` | `/plan/[assignmentId]` | Legacy plural alias retained for older push/deep links. |
| `/plans` | `/plan` | Legacy plural tab alias retained for older navigation targets. |

## QR and legacy utility links

| Incoming path | Canonical target | Why it exists |
| --- | --- | --- |
| `/checkin?c=[code]` | `/scan?autoCheckInCode=[code]` | Universal-link target for entry QR short links. |
| `/checkin?p=[payload]` | `/scan?autoQrPayload=[payload]` | Universal-link target for signed QR payloads. |
| `/tracking` | `/progress` | Legacy member progress alias. |
| `/classes` | classes route surface | Stable member classes entrypoint used by navigation and notifications. |
