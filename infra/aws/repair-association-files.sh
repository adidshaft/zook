#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  infra/aws/repair-association-files.sh <ssh-target>

Example:
  infra/aws/repair-association-files.sh ec2-user@13.204.196.160

The target host must have /opt/zook/Caddyfile and /opt/zook/docker-compose.yml.
The script backs up the Caddyfile, installs the Zook universal/app-link handlers,
reloads Caddy, and verifies the public zookfit.in association files.

Optional:
  ZOOK_REPAIR_SSH_OPTS='-i ~/.ssh/zook_production -o BatchMode=yes'
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -ne 1 ]]; then
  usage >&2
  exit 64
fi

TARGET="$1"
read -r -a SSH_OPTS <<<"${ZOOK_REPAIR_SSH_OPTS:-}"

ssh "${SSH_OPTS[@]}" -o BatchMode=yes -o ConnectTimeout=10 "${TARGET}" 'sudo bash -s' <<'REMOTE'
set -euo pipefail

CADDYFILE=/opt/zook/Caddyfile
COMPOSE_FILE=/opt/zook/docker-compose.yml

if [[ ! -f "${CADDYFILE}" ]]; then
  echo "Missing ${CADDYFILE}" >&2
  exit 66
fi

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Missing ${COMPOSE_FILE}" >&2
  exit 66
fi

backup="${CADDYFILE}.bak.$(date +%Y%m%d%H%M%S)"
cp "${CADDYFILE}" "${backup}"

python3 - "${CADDYFILE}" <<'PY'
from __future__ import annotations

import re
import sys
from pathlib import Path

caddyfile = Path(sys.argv[1])
text = caddyfile.read_text()

block = '''  header /.well-known/apple-app-site-association Content-Type application/json
  respond /.well-known/apple-app-site-association `{
    "applinks": {
      "apps": [],
      "details": [
        {
          "appID": "JP4HU7X6G7.com.zook.app",
          "paths": ["/checkin", "/checkin/*", "/join/*", "/plans/*", "/shop/*", "/dashboard"]
        }
      ]
    }
  }` 200

  header /.well-known/assetlinks.json Content-Type application/json
  respond /.well-known/assetlinks.json `[
    {
      "relation": ["delegate_permission/common.handle_all_urls"],
      "target": {
        "namespace": "android_app",
        "package_name": "com.zook.app",
        "sha256_cert_fingerprints": [
          "AF:CE:B5:DF:52:85:0C:5A:A5:70:30:CF:EF:53:57:F5:C8:39:AD:ED:16:ED:70:D1:FF:FB:BE:2C:E4:23:45:5F"
        ]
      }
    }
  ]` 200
'''

patterns = [
    r"(?ms)^\s*header\s+/.well-known/apple-app-site-association\s+Content-Type\s+application/json\s*\n\s*respond\s+/.well-known/apple-app-site-association\s+`.*?`\s+200\s*\n+",
    r"(?ms)^\s*header\s+/.well-known/assetlinks\.json\s+Content-Type\s+application/json\s*\n\s*respond\s+/.well-known/assetlinks\.json\s+`.*?`\s+200\s*\n+",
]

next_text = text
for pattern in patterns:
    next_text = re.sub(pattern, "", next_text)

reverse_proxy_pattern = re.compile(r"(?m)^(\s*reverse_proxy\s+web:3000\s*)$")
if reverse_proxy_pattern.search(next_text):
    next_text = reverse_proxy_pattern.sub(block + r"\1", next_text, count=1)
else:
    brace_index = next_text.rfind("}")
    if brace_index == -1:
        raise SystemExit("Could not find a Caddy site block to patch.")
    next_text = next_text[:brace_index].rstrip() + "\n\n" + block + next_text[brace_index:]

caddyfile.write_text(next_text)
PY

if docker compose version >/dev/null 2>&1; then
  docker compose -f "${COMPOSE_FILE}" exec -T caddy caddy reload --config /etc/caddy/Caddyfile
else
  docker-compose -f "${COMPOSE_FILE}" exec -T caddy caddy reload --config /etc/caddy/Caddyfile
fi

echo "Backed up Caddyfile to ${backup}"
REMOTE

curl -fsS -D /tmp/zook-repair-aasa.headers -o /tmp/zook-repair-aasa.body \
  https://zookfit.in/.well-known/apple-app-site-association
curl -fsS -D /tmp/zook-repair-assetlinks.headers -o /tmp/zook-repair-assetlinks.body \
  https://zookfit.in/.well-known/assetlinks.json

grep -qi '^content-type: application/json' /tmp/zook-repair-aasa.headers
grep -q 'JP4HU7X6G7.com.zook.app' /tmp/zook-repair-aasa.body
grep -q '"/checkin"' /tmp/zook-repair-aasa.body
grep -q 'AF:CE:B5:DF:52:85:0C:5A:A5:70:30:CF:EF:53:57:F5:C8:39:AD:ED:16:ED:70:D1:FF:FB:BE:2C:E4:23:45:5F' /tmp/zook-repair-assetlinks.body

echo "Association files verified on https://zookfit.in"
