#!/bin/bash
set -euo pipefail

echo "=== Smart Door Backend Deployment ==="

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Docker is required"; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "Docker Compose is required"; exit 1; }

# Load environment
if [ -f .env ]; then
  set -a; source .env; set +a
fi

# Generate and persist a JWT secret when the env file still contains a placeholder.
if [ "${JWT_SECRET:-}" = "" ] || [ "${JWT_SECRET:-}" = "change-me-to-a-random-string" ] || [ "${JWT_SECRET:-}" = "change-in-production" ]; then
  new_jwt_secret="$(openssl rand -hex 32)"
  if [ -f .env ] && grep -q '^JWT_SECRET=' .env; then
    sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$new_jwt_secret|" .env
    rm -f .env.bak
  else
    printf '\nJWT_SECRET=%s\n' "$new_jwt_secret" >> .env
  fi
  export JWT_SECRET="$new_jwt_secret"
  echo "Generated a new JWT secret in .env"
fi

# Some NAS setups preserve restrictive group-only permissions on checked-out files.
# Nginx serves the frontend via bind mount, so ensure the static assets are world-readable.
chmod -R a+rX ../frontend

# Pull latest images
docker compose pull

backend_replicas="${BACKEND_REPLICAS:-1}"

# Start with a single backend so migrations/seeding happen once before scaling out.
docker compose up -d --build --scale backend=1

# Wait for the first backend to finish migrations/seeding before scaling out.
for i in $(seq 1 20); do
  if curl -sf http://localhost/healthz > /dev/null 2>&1; then
    break
  fi
  echo "Waiting for primary backend... ($i/20)"
  sleep 3
done

if [ "$backend_replicas" -gt 1 ]; then
  echo "Scaling backend to ${backend_replicas} replicas..."
  docker compose up -d --scale backend="$backend_replicas"
fi

# Verify deployment
echo "Verifying deployment..."
for i in $(seq 1 10); do
  if curl -sf http://localhost/healthz > /dev/null 2>&1; then
    echo "Deployment successful!"
    docker compose ps
    exit 0
  fi
  echo "Waiting for services... ($i/10)"
  sleep 3
done

echo "Deployment verification failed"
exit 1
