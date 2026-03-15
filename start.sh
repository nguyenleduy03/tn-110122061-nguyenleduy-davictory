#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"
mkdir -p "$RUN_DIR"

BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"
BACKEND_LOG="$RUN_DIR/backend.log"
FRONTEND_LOG="$RUN_DIR/frontend.log"

is_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

resolve_backend_runner() {
  # Ưu tiên Maven Wrapper nếu đầy đủ file wrapper
  if [[ -x "$ROOT_DIR/backend/mvnw" && -f "$ROOT_DIR/backend/.mvn/wrapper/maven-wrapper.properties" ]]; then
    echo "./mvnw"
    return 0
  fi

  # Fallback sang mvn hệ thống
  if command -v mvn >/dev/null 2>&1; then
    echo "mvn"
    return 0
  fi

  return 1
}

start_backend() {
  if [[ -f "$BACKEND_PID_FILE" ]]; then
    local old_pid
    old_pid="$(cat "$BACKEND_PID_FILE" 2>/dev/null || true)"
    if is_running "$old_pid"; then
      echo "[backend] Đang chạy (PID: $old_pid)"
      return
    fi
  fi

  echo "[backend] Đang khởi động..."
  cd "$ROOT_DIR/backend"

  local backend_runner
  if ! backend_runner="$(resolve_backend_runner)"; then
    echo "[backend] ❌ Không tìm thấy Maven runner hợp lệ (mvnw thiếu .mvn/wrapper hoặc máy chưa có mvn)."
    return 1
  fi

  nohup "$backend_runner" spring-boot:run >"$BACKEND_LOG" 2>&1 &

  local pid=$!
  echo "$pid" > "$BACKEND_PID_FILE"
  sleep 2

  if is_running "$pid"; then
    echo "[backend] Đã chạy nền bằng '$backend_runner', PID: $pid"
  else
    echo "[backend] ❌ Khởi động thất bại. Xem log: $BACKEND_LOG"
    tail -n 20 "$BACKEND_LOG" || true
    rm -f "$BACKEND_PID_FILE"
    return 1
  fi
}

start_frontend() {
  if [[ -f "$FRONTEND_PID_FILE" ]]; then
    local old_pid
    old_pid="$(cat "$FRONTEND_PID_FILE" 2>/dev/null || true)"
    if is_running "$old_pid"; then
      echo "[frontend] Đang chạy (PID: $old_pid)"
      return
    fi
  fi

  echo "[frontend] Đang khởi động..."
  cd "$ROOT_DIR/frontend"
  nohup npm run dev -- --host 0.0.0.0 >"$FRONTEND_LOG" 2>&1 &

  local pid=$!
  echo "$pid" > "$FRONTEND_PID_FILE"
  echo "[frontend] Đã chạy nền, PID: $pid"
}

start_backend
start_frontend

echo ""
echo "✅ Đã start toàn bộ dự án ở chế độ nền"
echo "- Backend log : $BACKEND_LOG"
echo "- Frontend log: $FRONTEND_LOG"
echo "- Dừng dự án bằng: ./stop.sh"
