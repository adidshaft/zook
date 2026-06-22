# Zook AWS Migration

This folder captures the low-cost AWS target for moving Zook off Vercel/Supabase/Upstash hosting primitives while keeping the existing product providers.

## Target Region

Use `ap-south-1` (Asia Pacific Mumbai). It is the closest default-enabled AWS region for the current India-focused app/domain and has 3 Availability Zones.

## Cost-Sensitive Shape

- EC2 `t4g.small` for the web/API container, Caddy TLS reverse proxy, host cron, and Redis sidecar.
- RDS PostgreSQL `db.t4g.micro`, encrypted, single-AZ, 7-day backups, deletion protection.
- S3 encrypted uploads bucket.
- ECR image repository with lifecycle pruning.
- No NAT gateway and no ALB. This avoids two common baseline charges.

Tradeoff: this is not multi-AZ web high availability. It is intentionally optimized for lower monthly cost and lower Mumbai latency. RDS keeps the database managed and snapshot-safe.

## Runtime Changes

The app now supports:

- `RATE_LIMIT_PROVIDER=redis`
- `SERVER_CACHE_PROVIDER=redis`
- `REDIS_URL=redis://redis:6379`

This lets AWS use a Redis sidecar now and an ElastiCache/Valkey endpoint later without changing app code.

## Deployment Order

1. Build and push the ARM64 web image to ECR:
   ```bash
   AWS_REGION=ap-south-1 ./infra/aws/deploy-image.sh
   ```
   Use the returned `repositoryUri` and `repositoryArn` as CloudFormation parameters.
2. Create the CloudFormation stack in `ap-south-1`.
3. Store the production env file in SSM Parameter Store at `/zook/production/web-env`.
4. Replace the env values for AWS:
   - `STORAGE_PROVIDER=s3`
   - `S3_BUCKET=<stack output>`
   - `S3_REGION=ap-south-1`
   - `S3_PUBLIC_BASE_URL=` unless CloudFront is added later
   - `RATE_LIMIT_PROVIDER=redis`
   - `SERVER_CACHE_PROVIDER=redis`
   - `REDIS_URL=redis://redis:6379`
   - `DATABASE_URL=postgresql://...@<rds endpoint>:5432/zook?schema=public`
5. Run Prisma migrations against the RDS database.
6. Restore/copy production data from the current Supabase database.
7. Smoke the AWS URL/IP:
   - `GET /api/health`
   - `GET /api/ready`
   - login/dashboard redirect checks
   - Razorpay webhook URL after DNS cutover
8. Point DNS for `zookfit.in`, `app.zookfit.in`, `dashboard.zookfit.in`, and `www.zookfit.in` to the EC2 Elastic IP.
9. Verify HTTPS via Caddy and rerun readiness.
10. Only after AWS is healthy, disable old hosting crons/deployments and then close Render if it has active paid resources.

## Universal/App Link Association Files

The CloudFormation Caddyfile serves these directly at the proxy before `reverse_proxy web:3000`:

- `/.well-known/apple-app-site-association`
- `/.well-known/assetlinks.json`

This keeps iOS universal links and Android app links working even if a stale web container is accidentally left running.

For an already-running instance, a CloudFormation `UserData` edit alone will not rewrite `/opt/zook/Caddyfile`. If SSH to the live host is available, apply the same handlers, reload Caddy, and verify the public files with:

```bash
infra/aws/repair-association-files.sh ec2-user@13.204.196.160
```

The script requires `/opt/zook/Caddyfile` and `/opt/zook/docker-compose.yml` on the target host. It backs up the Caddyfile, installs the known-good Zook universal/app-link handlers before `reverse_proxy web:3000`, reloads Caddy through Docker Compose, and verifies `https://zookfit.in/.well-known/*`.

If local SSH is not available but GitHub Actions has production SSH access, run the manual `Repair Association Files` workflow with:

- `ssh_host`: `13.204.196.160`
- `ssh_user`: the production host user, usually `ec2-user`
- repository secret `ZOOK_PRODUCTION_SSH_KEY`: private SSH key with sudo access on the host

The workflow uses `infra/aws/repair-association-files.sh`, then runs `pnpm mobile:release:check` with live association-file validation enabled.

Manual equivalent:

```bash
sudo cp /opt/zook/Caddyfile /opt/zook/Caddyfile.bak.$(date +%Y%m%d%H%M%S)
sudo vi /opt/zook/Caddyfile
docker compose -f /opt/zook/docker-compose.yml exec caddy caddy reload --config /etc/caddy/Caddyfile
```

After reload:

```bash
curl -sS -D- https://zookfit.in/.well-known/apple-app-site-association
curl -sS -D- https://zookfit.in/.well-known/assetlinks.json
ZOOK_CHECK_LIVE_ASSOCIATION_FILES=1 pnpm mobile:release:check
```

Expected results: both files return HTTP 200 without redirects, `Content-Type: application/json`, `JP4HU7X6G7.com.zook.app`, `/checkin` paths, package `com.zook.app`, and the Android release SHA-256 fingerprint.

## Render Shutdown

The repo has no Render blueprint or deploy hook. Render shutdown is account-level:

- delete/suspend all Render web services, workers, cron jobs, Postgres/Redis, disks, domains, deploy hooks, API keys, and GitHub auto-deploy links
- verify the billing/final invoice page shows no future paid resources
- close the Render account from the dashboard

Do not delete data-bearing services until AWS health/readiness and data restore are confirmed.
