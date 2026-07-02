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

# Pull latest images
docker compose pull

# Build and start services
docker compose up -d --build --scale backend="${BACKEND_REPLICAS:-2}"

# Run database migrations
echo "Running database migrations..."
sleep 5
docker compose exec -T backend npx prisma migrate deploy

echo "Seeding default account..."
docker compose exec -T backend npm run db:seed

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
