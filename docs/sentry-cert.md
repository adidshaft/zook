# Sentry Certification

Endpoint: `POST /api/diagnostics/throw`

Gate: platform admin only, `APP_ENV=staging` only.

Payloads:

```json
{ "mode": "handled" }
```

```json
{ "mode": "unhandled" }
```

## Checklist

- [ ] Handled event appears in Sentry.
- [ ] Unhandled event appears in Sentry.
- [ ] Email and phone in diagnostic metadata are redacted.
- [ ] Source maps resolve to application files.
- [ ] Release/environment match the staging deployment.
- [ ] Breadcrumbs include the request route without leaking secrets.
- [ ] Screenshots saved under `docs/evidence/sentry/`.
