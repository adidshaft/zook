# Provider Integrations

Zook remains mock-first in Phase 4, but the registry now supports pilot-ready payment and push selections in addition to email, storage, maps, and AI. Provider selection happens only through `packages/core/src/providers/registry.ts`, and the registry follows one consistent rule:

- If no live provider is selected, Zook uses the safe default provider for that channel.
- If a live provider is explicitly selected, the registry must be fully configured or it throws a `ProviderSetupError`.
- If `disabled` is selected for payment, AI, or push, diagnostics report a disabled state and feature routes return controlled unavailable errors.
- Diagnostics are safe to expose to admins because they report provider names, env presence, and non-secret metadata only. Raw keys and secrets are never returned.

## Selection And Diagnostics

Factory accessors:

- `getEmailProvider()`
- `getPaymentProvider()`
- `getMapProvider()`
- `getAIProvider()`
- `getStorageProvider()`
- `getPushProvider()`

Diagnostics accessors:

- `getEmailProviderDiagnostics()`
- `getPaymentProviderDiagnostics()`
- `getMapProviderDiagnostics()`
- `getAIProviderDiagnostics()`
- `getStorageProviderDiagnostics()`
- `getPushProviderDiagnostics()`
- `getProviderRegistryDiagnostics()`

## Configured-State Rules

Each provider factory reports one of these states:

- `default`: the selector env is unset, so the registry uses the default mock or local provider.
- `ready`: the selector env is set and the chosen provider is available with the required env in place.
- `misconfigured`: a live provider was selected, but one or more required env vars are missing. Calling the factory throws `ProviderSetupError`.
- `unsupported`: a provider value was selected that is not implemented in the current registry. Calling the factory throws `ProviderSetupError`.
- `disabled`: the feature is intentionally unavailable. Calling the factory throws `ProviderSetupError`, and API routes should surface a controlled unavailable state.

Diagnostics include:

- `selectedProvider`: the provider value requested by env, or the implicit default when unset
- `activeProvider`: the instantiated provider, or `null` when setup is invalid
- `missingEnv`: required env vars still absent for the selected live provider
- `env`: boolean presence flags only, never secret values
- `metadata`: safe provider/factory metadata such as model name, capabilities, or local path prefix

## Email

Selector env:

- `EMAIL_PROVIDER=mock|resend|smtp`

Known envs:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Current behavior:

- `mock`: supported and default
- `resend`: supported when `RESEND_API_KEY` is present
- `smtp`: supported when `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` or `EMAIL_FROM` are present

## Payments

Selector env:

- `PAYMENT_PROVIDER=mock|razorpay|disabled`

Known envs:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_MODE=test|live`
- `RAZORPAY_CHECKOUT_THEME_COLOR`

Current behavior:

- `mock`: supported and default
- `razorpay`: supported when the required Razorpay env is present
- `disabled`: supported as an explicit unavailable state

Phase 4 payment readiness now includes:

- provider-backed checkout session creation
- raw-body Razorpay webhook verification
- persisted `PaymentEvent` and `PaymentWebhookAttempt`
- idempotent session activation for memberships and shop orders

Mock checkout still lives at `/checkout/mock/{sessionId}` and remains the safest development path.

## Maps

Selector env:

- `MAP_PROVIDER=mock|google`

Known envs:

- `GOOGLE_MAPS_API_KEY`

Current behavior:

- `mock`: supported and default
- `google`: supported when `GOOGLE_MAPS_API_KEY` is present

If `MAP_PROVIDER=google` is set without a key, the registry reports `misconfigured` and `getMapProvider()` throws instead of silently falling back.

Operational beta map support now includes:

- Google Maps link resolution for owner location setup
- distance calculation for nearby gym sorting
- public gym discovery that can return `distanceMeters` when the client provides `nearLat` and `nearLng`

## AI

Selector env:

- `AI_PROVIDER=mock|openai|disabled`

Known envs:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Current behavior:

- `mock`: supported and default
- `openai`: supported when `OPENAI_API_KEY` is present
- `disabled`: supported as an explicit unavailable state

Diagnostics may expose the selected `OPENAI_MODEL`, but never the API key.

## Storage

Selector env:

- `STORAGE_PROVIDER=local|s3|r2`

Known envs:

- `STORAGE_LOCAL_DIR`
- `STORAGE_URL_SIGNING_SECRET`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL`
- `R2_ACCOUNT_ID`

Current behavior:

- `local`: supported and default
- `s3`: supported when `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` are present
- `r2`: supported when `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and either `S3_ENDPOINT` or `R2_ACCOUNT_ID` are present

Storage-backed upload routes now exist for the operational beta:

- `POST /api/files/upload`
- `GET /api/files/{fileId}/signed-url`
- `GET /api/files/{fileId}/content`
- `DELETE /api/files/{fileId}`

Supported file categories:

- `profile_photo`
- `payment_proof`
- `product_image`
- `plan_image`
- `trainer_upi_qr`
- `org_logo`
- `org_cover`
- `ai_generated_image`
- `body_progress_photo`
- `privacy_export`

Local storage writes to `STORAGE_LOCAL_DIR` and returns signed internal URLs for private assets. S3-compatible storage uses presigned object URLs for private assets and `S3_PUBLIC_BASE_URL` when you want stable public delivery for public-facing files like gym logos, cover images, or product images.

## Push

Selector env:

- `PUSH_PROVIDER=mock|expo|disabled`

Known envs:

- `EXPO_PROJECT_ID`
- `EXPO_ACCESS_TOKEN`
- `PUSH_ENVIRONMENT=development|preview|production`

Current behavior:

- `mock`: supported and default
- `expo`: supported when `EXPO_PROJECT_ID` is present
- `disabled`: supported as an explicit unavailable state; in-app notifications remain canonical

Phase 4 push readiness now includes:

- push device registration APIs
- persisted `PushDevice` records
- persisted `PushDelivery` records
- invalid-token handling and device invalidation

The mobile client is still finishing the native permission/token UX, so Expo push should be treated as pilot-ready backend infrastructure rather than a fully polished client rollout.

## Safe Rollout Summary

- Local development keeps working with no provider env set.
- Staging and production must opt into live providers explicitly.
- Partial live setup is treated as a setup error, not a silent fallback.
- Admin diagnostics can safely inspect provider readiness without exposing secrets.
