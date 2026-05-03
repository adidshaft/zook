# Push Notifications

Last updated: 3 May 2026

## Source Of Truth

- in-app notifications remain canonical
- push delivery is best-effort
- notification records are created before push attempts

## Provider Modes

Selector env:

- `PUSH_PROVIDER=mock|expo|disabled`

Expo env:

- `EXPO_PROJECT_ID`
- `EXPO_ACCESS_TOKEN` optional
- `PUSH_ENVIRONMENT=development|preview|production`

## Backend Endpoints

- `POST /api/push/register-device`
- `POST /api/push/unregister-device`
- `GET /api/me/push-devices`
- `DELETE /api/me/push-devices/:id`

## Phase 4 Backend Behavior

- validates push tokens through the selected provider
- stores active devices in `PushDevice`
- records push outcomes in `PushDelivery`
- invalidates bad tokens when the provider reports them
- respects user push preference records
- keeps push secrets server-side
- records provider-disabled and provider-send failures as `PushDelivery` failures instead of failing the originating product action
- treats device registrations as user/global device records so switching active org does not move the same phone token away from another org's notifications

## Delivery Rules

- transactional and security notifications can still be created in-app even if push fails
- promotional delivery respects notification preferences
- minor users stay excluded from promotional and engagement messaging by default
- scheduled notifications create scheduled recipient rows but are hidden from the member inbox until dispatched
- scheduled dispatch still needs a worker/cron before it can be considered production complete

## Mobile Status

Phase 5 mobile readiness now includes:

- permission prompts and denied-state handling
- Expo push token registration through the backend `/api/push/register-device` route
- device unregister on logout when practical
- notification preference toggles in the mobile profile
- device registry visibility for QA
- tap routing for plan, order, membership, attendance, and generic inbox flows
- tap routing also handles membership join request approval/rejection payloads

The in-app notification center remains canonical if native push is unavailable.

## Local Development

- use `PUSH_PROVIDER=mock` locally
- in-app notifications can still be tested end to end
- mock push delivery is recorded without requiring Expo credentials

## Disabled Mode

- use `PUSH_PROVIDER=disabled` when remote push is intentionally unavailable
- in-app notifications remain the source of truth
- backend device registration returns a controlled unavailable state instead of recording fake remote success
- product notifications still persist to the in-app inbox; if active devices exist, delivery attempts are recorded as provider-disabled failures

## Staging

- set `PUSH_PROVIDER=expo`
- provide `EXPO_PROJECT_ID`
- optionally add `EXPO_ACCESS_TOKEN`
- confirm `/api/ready` and `/api/platform/provider-status` before pilot rollout

## Tap Routing

Current tap routing targets:

- assigned plans
- shop orders
- membership status
- attendance result context
- generic notification center context

## Known Limitations

- receipt polling for Expo tickets is not fully implemented yet
- scheduled notification dispatch has no production scheduler in this repo slice
- the current pilot prioritizes persistence and invalid-token handling over advanced delivery analytics
- Expo Go should not be used as the final push-validation environment for the private pilot
- physical-device push and deep-link QA were not performed in the 2026-05-03 hardening pass
