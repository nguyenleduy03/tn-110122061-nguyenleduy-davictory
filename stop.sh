#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"

BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"

stop_by_pid_file() {
  local name="$1"
  local pid_file="$2"

  if [[ ! -f "$pid_file" ]]; then
    echo "[$name] Không thấy file PID, bỏ qua"
    return
  fi

  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"

  if [[ -z "$pid" ]]; then
    echo "[$name] PID rỗng, xoá file PID"
    rm -f "$pid_file"
    return
  fi

  if kill -0 "$pid" 2>/dev/null; then
    echo "[$name] Đang dừng PID: $pid"
    kill "$pid" 2>/dev/null || true

    # Chờ tối đa 5 giây
    for _ in {1..10}; do
      if ! kill -0 "$pid" 2>/dev/null; then
        break
      fi
      sleep 0.5
    done

    # Nếu vẫn còn thì kill mạnh
    if kill -0 "$pid" 2>/dev/null; then
      echo "[$name] Tiến trình chưa dừng, force kill PID: $pid"
      kill -9 "$pid" 2>/dev/null || true
    fi

    echo "[$name] Đã dừng"
  else
    echo "[$name] PID không còn chạy"
  fi

  rm -f "$pid_file"
}

stop_by_pid_file "backend" "$BACKEND_PID_FILE"
stop_by_pid_file "frontend" "$FRONTEND_PID_FILE"

echo ""
echo "✅ Đã stop toàn bộ dự án"
