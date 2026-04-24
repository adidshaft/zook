# Provider Integrations

Zook remains mock-first in Phase 3. Provider selection happens only through `packages/core/src/providers/registry.ts`, and the registry now follows one consistent rule:

- If no live provider is selected, Zook uses the safe default provider for that channel.
- If a live provider is explicitly selected, the registry must be fully configured or it throws a `ProviderSetupError`.
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

Diagnostics include:

- `selectedProvider`: the provider value requested by env, or the implicit default when unset
- `activeProvider`: the instantiated provider, or `null` when setup is invalid
- `missingEnv`: required env vars still absent for the selected live provider
- `env`: boolean presence flags only, never secret values
- `metadata`: safe provider/factory metadata such as model name, capabilities, or local path prefix

## Email

Selector env:

- `EMAIL_PROVIDER=mock|resend`

Known envs:

- `RESEND_API_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

Current behavior:

- `mock`: supported and default
- `resend`: supported when `RESEND_API_KEY` is present
- `smtp`: documented as future work only; selecting it is currently `unsupported`

## Payments

Selector env:

- `PAYMENT_PROVIDER=mock`

Current behavior:

- `mock`: supported and default
- any other value: `unsupported`

Mock checkout still lives at `/checkout/mock/{sessionId}` and remains the safe development path.

## Maps

Selector env:

- `MAP_PROVIDER=mock|google`

Known envs:

- `GOOGLE_MAPS_API_KEY`

Current behavior:

- `mock`: supported and default
- `google`: supported when `GOOGLE_MAPS_API_KEY` is present

If `MAP_PROVIDER=google` is set without a key, the registry reports `misconfigured` and `getMapProvider()` throws instead of silently falling back.

## AI

Selector env:

- `AI_PROVIDER=mock|openai`

Known envs:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Current behavior:

- `mock`: supported and default
- `openai`: supported when `OPENAI_API_KEY` is present

Diagnostics may expose the selected `OPENAI_MODEL`, but never the API key.

## Storage

Selector env:

- `STORAGE_PROVIDER=local`

Known envs for future live targets:

- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `R2_ACCOUNT_ID`
- `R2_BUCKET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Current behavior:

- `local`: supported and default
- `s3` / `r2`: future targets; selecting them is currently `unsupported`

## Push

Selector env:

- `PUSH_PROVIDER=mock`

Current behavior:

- `mock`: supported and default
- `expo`: future target; selecting it is currently `unsupported`

## Safe Rollout Summary

- Local development keeps working with no provider env set.
- Staging and production must opt into live providers explicitly.
- Partial live setup is treated as a setup error, not a silent fallback.
- Admin diagnostics can safely inspect provider readiness without exposing secrets.
