# iPhone Simulator QA Notes

Date: 2026-05-03
Environment: `iPhone 15 Pro` simulator, Expo Go, local API on `:3001`

## Scope

This pass covered the current mobile app as rendered in the iOS simulator using live interaction, with emphasis on role-specific shells and obvious layout, navigation, and validation bugs.

## Fix Pass Status

Addressed in the follow-up simulator QA fix pass:

- Shared dock spacing now reserves more bottom space and avoids double iOS safe-area inset adjustment.
- Trainer Home, Clients, and Plans now render as distinct trainer views.
- Trainer/client navigation guards empty client IDs and opens client detail with a client-specific header.
- Local developer scan no longer sends a fake QR payload to the real scan endpoint; it uses a local-only backend dev scan route.
- Reception code verification disables empty submits, clears stale validation messages on edit/view change, and uses neutral pickup placeholders.
- Reception member timestamps use human-friendly date/time formatting.
- OTP login no longer honors stale `/profile` or `/settings` redirects after auth.
- Owner command copy now handles zero/plural transaction and stock phrases.

Roles and flows checked:

- Login
- Member home and check-in entry
- Trainer home, clients, check-in, plans, inbox
- Owner command, approvals, members, profile
- Reception desk, members, payments, orders, profile, settings

## High-Severity Findings

- Trainer `Check in` is broken. Tapping `Demo scan (dev only)` produced `Validation failed (mob_moothiwp_taiep5)` instead of completing the local dev path.
- Trainer navigation is inconsistent. Selecting the bottom-bar `Clients` tab changed the selected state, but the visible screen still looked like the `Clients and plans` home surface.
- Trainer client actions appear dead. `Open Client` and the visible client row did not visibly navigate.
- Reception `Orders` has input/validation state drift. The pickup code field visibly showed `PK-9142` while the screen simultaneously displayed `Enter a code first.`
- Member login preserved a stale redirect. After OTP verification, the app dropped into `Settings` instead of the normal member landing screen, which suggests redirect state is not being cleared reliably after auth.

## Major Layout / UI Bugs

- Bottom navigation overlaps live content on multiple screens instead of reserving space for the scroll area.
- Some screens contain large, unexplained blank vertical regions before the actual content starts.
- Several affected screens also appear effectively non-scrollable in simulator interaction even when content is visibly clipped under the dock.

Screens where this was clearly visible:

- Owner `Profile`
- Owner `Command`
- Reception `Members`
- Reception `Payments`
- Reception `Orders`
- Shared `Profile`

## Role Notes

### Login

- When the backend is unavailable, the login surface shows raw `Network request failed` copy. This is useful for debugging but too raw for a user-facing auth error state.
- OTP flow itself worked once the backend was healthy.

### Member

- Post-login redirect state was inconsistent. A successful OTP verify routed into `Settings` instead of the expected home flow.
- Member home looked comparatively clean once manually returned to `Home`.
- Entering `Check in` raised the expected iOS camera permission prompt. I did not accept or deny the camera permission during this pass.

### Trainer

- Home showed excessive empty vertical space and lower content/chips were clipped behind the bottom dock.
- `Clients` tab selection did not produce a clearly different screen.
- `Open Client` did not visibly navigate.
- Home summary and Plans data disagree. Home showed `1 active plan` / `1 assigned client has active plan work`, while `Plans` showed `No plans assigned`.
- `Inbox` rendered and did not immediately fail.

### Owner

- `Profile` has a very large dead area above the actual profile content.
- Bottom navigation overlaps lower owner surfaces.
- `Command` copy has grammar issues, including `0 transaction need confirmation` and `0 product are under threshold`.
- `Approvals` rendered, but the same dock overlap problem persisted.
- `Members` was one of the cleaner owner flows and member detail opened successfully.

### Reception

- `Desk` allows the empty `Verify Code` action to remain active and relies on inline failure text instead of disabling the CTA up front.
- `Members` shows a raw ISO timestamp (`2026-05-02T20:46:29.941Z`) instead of human-friendly formatting.
- `Members`, `Payments`, and `Orders` all suffer from bottom-dock clipping.
- `Payments` content below the visible fold is obscured by the dock and did not scroll cleanly during the pass.
- `Orders` has the strongest state inconsistency. The pickup code field was visibly prefilled with `PK-9142`, while inline validation still said `Enter a code first.`

## Shared Surface Notes

- Deep-linking to `Profile` worked, but the layout there is visibly broken because the content sits far too low on the screen.
- `Settings` rendered more predictably than `Profile`, but the account card and logout region still sit very close to the bottom dock.

## Product / UX Consistency Notes

- Some role shells feel like separate products rather than variants of one system.
- Layout behavior is not consistent across roles. Member home feels relatively stable, while trainer, owner, and reception share repeated dock/scroll problems.
- Validation style is inconsistent. Some screens disable invalid actions poorly, while others show inline errors against fields that already look populated.

## Suggested Fix Order

1. Fix the shared bottom-dock safe-area / scroll-container layout bug.
2. Fix trainer navigation and the broken `Demo scan` path.
3. Fix reception order verification state so visible field value and validation state cannot disagree.
4. Fix redirect cleanup after OTP verification so auth always lands on the correct default route.
5. Clean up copy, formatting, and timestamp presentation after the blocking interaction issues are resolved.
