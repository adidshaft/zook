# Push Notifications

Last updated: 24 April 2026

## Source Of Truth

- in-app notifications remain canonical
- push delivery is best-effort
- notification records are created before push attempts

## Provider Modes

Selector env:

- `PUSH_PROVIDER=mock|expo`

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

## Delivery Rules

- transactional and security notifications can still be created in-app even if push fails
- promotional delivery respects notification preferences
- minor users stay excluded from promotional and engagement messaging by default

## Mobile Status

Backend readiness is in place for Expo push.

Current client limitations:

- the Expo app configuration is pilot-ready
- full native permission and token registration UX is still incomplete in the mobile client
- the mobile inbox remains the reliable verification path today

## Local Development

- use `PUSH_PROVIDER=mock` locally
- in-app notifications can still be tested end to end
- mock push delivery is recorded without requiring Expo credentials

## Staging

- set `PUSH_PROVIDER=expo`
- provide `EXPO_PROJECT_ID`
- optionally add `EXPO_ACCESS_TOKEN`
- confirm `/api/ready` and `/api/platform/provider-status` before pilot rollout

## Tap Routing

Phase 4 stores payload context so mobile tap routing can eventually target:

- assigned plans
- shop orders
- membership status
- notification center context

## Known Limitations

- receipt polling for Expo tickets is not fully implemented yet
- the current pilot prioritizes persistence and invalid-token handling over advanced delivery analytics
