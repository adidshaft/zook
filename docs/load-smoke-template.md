# Production Load Smoke Template

Install once:

```bash
brew install k6
```

Run against staging first:

```bash
ZOOK_BASE_URL=https://staging.example pnpm test:load
```

Copy results to `docs/load-smoke-YYYY-MM-DD.md`.

## Result

- Date:
- Target URL:
- Git SHA:
- k6 version:
- Peak virtual users:
- HTTP failure rate:
- p95 latency:
- Error notes:

## Acceptance

- [ ] No sustained 5xx spike.
- [ ] p95 latency remains acceptable for pilot traffic.
- [ ] Login, public gym page, and readiness endpoints remain healthy after the run.
