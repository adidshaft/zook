# AI Assistant

Zook includes a backend-only AI gateway for assistant workflows. It is provider-selected by environment and guarded by feature flags, quotas, scope checks, and usage logs.

## Surfaces

- `/dashboard/ai`
- `/coach`
- Mobile `/assistant`
- Trainer plan assistant surfaces

## Capabilities

- Chat-style assistant.
- Plan generation path.
- Image generation path where enabled.
- Usage logging.
- Provider diagnostics.
- Scope and safety enforcement.

## Provider Modes

- `disabled`
- `mock`
- `openai`

Production launch can keep AI disabled while preserving product routes and safe messaging.

## Important APIs

- `POST /api/ai/chat`
- `POST /api/ai/generate-plan`
- `POST /api/ai/generate-image`
- `GET /api/orgs/:orgId/ai/usage`
- `GET /api/platform/ai-usage`

## Safety Notes

- AI should not browse uncontrolled web sources.
- Sensitive data should be redacted in errors and telemetry.
- Trainer-generated plans require review before assignment.

