# Zook

Zook is an India-first operating system for small and medium gyms. This monorepo contains the mobile app, web dashboard, API backend, Prisma database package, shared core domain logic, and provider abstractions for local-first development.

## Quick Start

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev:web
pnpm dev:mobile
```

Development OTP: `000000`

Seed accounts:

| Role | Email |
| --- | --- |
| Platform admin | `platform@zook.local` |
| Owner | `owner@zook.local` |
| Admin | `admin@zook.local` |
| Receptionist | `reception@zook.local` |
| Trainer | `trainer@zook.local` |
| Member | `member@zook.local` |
| Minor member | `minor@zook.local` |

See [docs/local-development.md](docs/local-development.md) for full run instructions and the manual acceptance checklist.
