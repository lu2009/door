#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Seeding default data..."
npm run db:seed

echo "Starting application..."
if [ "$NODE_ENV" = "development" ]; then
  exec npm run dev
fi

exec node dist/index.js
