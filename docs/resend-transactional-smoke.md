# Resend Transactional Smoke

Command:

```bash
EMAIL_FROM=Zook <no-reply@zookfit.in> \
RESEND_API_KEY=... \
RESEND_SMOKE_TO=internal@example.com \
pnpm smoke:resend
```

Optional automatic header check:

```bash
RESEND_SMOKE_HEADERS_URL=https://internal-mailbox.example/raw/latest pnpm smoke:resend
```

Checklist:

- [ ] Message delivered to the internal mailbox.
- [ ] SPF passes.
- [ ] DKIM passes.
- [ ] DMARC passes.
- [ ] From domain matches the production sender.
- [ ] Screenshot or raw-header excerpt saved under `docs/evidence/resend/`.
