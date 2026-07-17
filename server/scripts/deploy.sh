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
docker compose up -d --build --remove-orphans --scale backend=1

# Wait for the first backend container to become healthy before scaling or refreshing nginx.
primary_backend_id="$(docker compose ps -q backend | head -n 1)"
if [ -z "$primary_backend_id" ]; then
  echo "Primary backend container was not created"
  exit 1
fi

backend_healthy=0
for i in $(seq 1 40); do
  backend_status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$primary_backend_id" 2>/dev/null || true)"
  if [ "$backend_status" = "healthy" ]; then
    backend_healthy=1
    break
  fi
  echo "Waiting for primary backend... ($i/40) status=${backend_status:-unknown}"
  sleep 3
done

if [ "$backend_healthy" -ne 1 ]; then
  echo "Primary backend failed to become healthy"
  docker compose ps
  docker compose logs --tail=120 backend
  exit 1
fi

if [ "$backend_replicas" -gt 1 ]; then
  echo "Scaling backend to ${backend_replicas} replicas..."
  docker compose up -d --remove-orphans --scale backend="$backend_replicas"
fi

echo "Refreshing nginx upstream connections..."
docker compose restart nginx

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
