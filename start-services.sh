#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ensure_dependencies() {
  # Only run a full workspace install if any node_modules are missing.
  if [[ ! -d "$SCRIPT_DIR/node_modules" || \
        ! -d "$SCRIPT_DIR/client/node_modules" || \
        ! -d "$SCRIPT_DIR/server/node_modules" ]]; then
    echo "[deps] Installing workspace packages..."
    (cd "$SCRIPT_DIR" && npm install)
  fi
}

start_services() {
  echo "[run] Starting backend and frontend (npm run dev)..."
  cd "$SCRIPT_DIR"
  npm run dev
}

ensure_dependencies
start_services
