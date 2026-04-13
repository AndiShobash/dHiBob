#!/bin/sh
set -e

# Wait for Postgres to accept TCP connections
if [ -n "$DATABASE_URL" ]; then
  # Extract host and port from postgres DSN
  # postgresql://user:pass@host:port/db
  DB_HOST=$(echo "$DATABASE_URL" | sed 's|.*@\(.*\):\([0-9]*\)/.*|\1|')
  DB_PORT=$(echo "$DATABASE_URL" | sed 's|.*@.*:\([0-9]*\)/.*|\1|')
  echo "Waiting for Postgres at $DB_HOST:$DB_PORT..."
  until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
    sleep 1
  done
  echo "Postgres is up."
fi

echo "Setting up database..."
npx prisma db push --skip-generate --accept-data-loss

echo "Seeding database..."
npx tsx prisma/seed.ts

echo "Starting server..."
exec npm run start
