#!/bin/bash
set -euo pipefail

APP_DIR="$HOME/dhibob"
COMPOSE_FILE="docker-compose.prod.yml"

echo "=== DHiBob Deploy ==="
date

# 1. Pull latest code
cd "$APP_DIR"
git pull --ff-only origin main

# 2. Rebuild containers (only rebuilds layers that changed)
docker builder prune -f --filter "until=72h"
docker compose -f "$COMPOSE_FILE" build --no-cache app

# 3. Apply database migrations
docker compose -f "$COMPOSE_FILE" run --rm app npx prisma migrate deploy

# 4. Restart with new image
docker compose -f "$COMPOSE_FILE" up -d app

# 5. Health check -- wait up to 60s for the app to respond
echo "Waiting for health check..."
for i in $(seq 1 12); do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "Health check passed after $((i * 5))s"
    exit 0
  fi
  sleep 5
done

echo "ERROR: Health check failed after 60s"
docker compose -f "$COMPOSE_FILE" logs --tail=50 app
exit 1
