#!/bin/sh
set -e

# Clear any failed migration so deploy can proceed.
# This is safe to run even if the migration was never attempted.
npx prisma migrate resolve --rolled-back 20261116091206_add_account_to_audit || true

npx prisma migrate deploy

exec node dist/main
