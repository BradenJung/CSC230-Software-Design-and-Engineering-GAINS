#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Install and start client dev server
(
  cd "$SCRIPT_DIR/client"
  npm install
  npm run dev
) &
CLIENT_PID=$!

# Install and start server
(
  cd "$SCRIPT_DIR/server"
  npm install
  npm start
) &
SERVER_PID=$!

cleanup() {
  trap - INT TERM EXIT
  kill "$CLIENT_PID" "$SERVER_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

wait "$CLIENT_PID"
wait "$SERVER_PID"
