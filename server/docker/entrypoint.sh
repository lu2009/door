#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting application..."
if [ "$NODE_ENV" = "development" ]; then
  exec npm run dev
fi

exec node dist/index.js
