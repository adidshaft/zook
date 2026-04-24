# Provider Integrations

Zook is mock-first by default. Real providers are selected only through backend factories in `packages/core/src/providers/registry.ts`.

## Selection Functions

- `getEmailProvider()`
- `getPaymentProvider()`
- `getMapProvider()`
- `getAIProvider()`
- `getStorageProvider()`
- `getPushProvider()`

If env configuration is missing, the registry falls back safely to mock or local providers.

## Email

Env:

- `EMAIL_PROVIDER=mock|resend|smtp`
- `RESEND_API_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

Current state:

- `mock`: fully supported and default
- `resend`: scaffolded and optional
- `smtp`: env placeholders documented, implementation still future work

## Payments

Env:

- `PAYMENT_PROVIDER=mock`

Current state:

- `mock`: fully supported and default
- real provider classes can be added later behind `PaymentProvider`

Mock checkout lives at `/checkout/mock/{sessionId}` and drives membership or shop activation through backend payment-session completion.

## Maps

Env:

- `MAP_PROVIDER=mock|google`
- `GOOGLE_MAPS_API_KEY`

Current state:

- `mock`: deterministic India-focused responses
- `google`: scaffolded for geocode/search/link resolution, but falls back safely if no key is present

## AI

Env:

- `AI_PROVIDER=mock|openai`
- `OPENAI_API_KEY`

Current state:

- `mock`: deterministic and default
- `openai`: scaffolded backend-only provider

Guardrails still run before provider execution, regardless of which provider is selected.

## Storage

Env:

- `STORAGE_PROVIDER=local|s3|r2`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `R2_ACCOUNT_ID`
- `R2_BUCKET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Current state:

- `local`: default
- `s3` / `r2`: scaffold placeholders for future upload paths

## Push

Env:

- `PUSH_PROVIDER=mock|expo`

Current state:

- `mock`: default and safe for local development
- `expo`: documented target path, not required to run the app

## What Is Live vs Mock

Live right now:

- registry-based provider selection
- mock email
- mock payments
- mock maps
- mock AI
- local storage provider
- mock push provider

Still scaffold/future-ready:

- OpenAI
- Resend
- Google Maps
- Expo push
- S3/R2-backed storage

This is intentional: Phase 2 prioritizes real product state and backend integration while keeping runtime cost low.
