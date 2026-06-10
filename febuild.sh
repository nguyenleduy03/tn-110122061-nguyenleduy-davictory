#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
RUN_DIR="$ROOT_DIR/.run"
mkdir -p "$RUN_DIR"

echo "=== Building frontend ==="
cd "$FRONTEND_DIR"
npm run build
echo "Build complete."

echo "=== Starting production server ==="
# Kill old frontend dev server if running
if [[ -f "$RUN_DIR/frontend.pid" ]]; then
  old_pid=$(cat "$RUN_DIR/frontend.pid")
  kill "$old_pid" 2>/dev/null || true
  sleep 1
fi

nohup node serve.js > "$RUN_DIR/frontend.log" 2>&1 &
echo $! > "$RUN_DIR/frontend.pid"
echo "Production server running (PID: $(cat "$RUN_DIR/frontend.pid"))"
echo "Log: $RUN_DIR/frontend.log"
