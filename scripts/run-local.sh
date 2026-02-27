#!/usr/bin/env bash
set -euo pipefail

# ── VaultForge: Run local development stack ──────────────────────────
# One command to launch the entire stack via Docker Compose.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

# Ensure .env exists
if [ ! -f .env ]; then
  echo "==> No .env found — copying from .env.example"
  cp .env.example .env
  echo "    Edit .env with your keys, then re-run this script."
  exit 1
fi

echo "==> Starting VaultForge with Docker Compose..."
docker compose up --build
