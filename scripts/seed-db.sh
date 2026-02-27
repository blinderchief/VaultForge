#!/usr/bin/env bash
set -euo pipefail

# ── VaultForge: Seed / reset Supabase database ──────────────────────
# Runs all migrations in db/migrations/ against the configured Supabase instance.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

source "$ROOT_DIR/.env" 2>/dev/null || true

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "ERROR: SUPABASE_DB_URL not set. Copy .env.example to .env and fill it in."
  exit 1
fi

echo "==> Running Supabase migrations..."

for migration in "$ROOT_DIR"/db/migrations/*.sql; do
  echo "    Applying: $(basename "$migration")"
  psql "$SUPABASE_DB_URL" -f "$migration"
done

echo "==> Database seeded successfully."
