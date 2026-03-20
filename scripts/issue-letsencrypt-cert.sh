#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <email> <domain> [extra_domain ...]"
  echo "Example: $0 admin@example.com app.example.com www.example.com"
  exit 1
fi

EMAIL="$1"
shift
DOMAINS=("$@")

PRIMARY_DOMAIN="${DOMAINS[0]}"
DOMAIN_ARGS=()
for d in "${DOMAINS[@]}"; do
  DOMAIN_ARGS+=("-d" "$d")
done

echo "[1/4] Starting app services (without nginx)..."
docker compose -f docker-compose.https.yml up -d postgres redis backend frontend

echo "[2/4] Requesting Let's Encrypt certificate for: ${DOMAINS[*]}"
docker compose -f docker-compose.https.yml run --rm --service-ports --entrypoint certbot certbot certonly \
  --standalone \
  --preferred-challenges http \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  "${DOMAIN_ARGS[@]}"

echo "[3/4] IMPORTANT: update nginx/production/conf.d/app.conf placeholders now:"
echo "      - YOUR_DOMAIN -> ${PRIMARY_DOMAIN}"
echo "      - YOUR_WWW_DOMAIN -> optional second domain or remove it"

echo "[4/4] Starting nginx and cert auto-renew..."
docker compose -f docker-compose.https.yml up -d nginx certbot

echo "Done. Verify: https://${PRIMARY_DOMAIN}"
