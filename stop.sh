#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"

BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"

echo "🛑 Đang dừng toàn bộ tiến trình liên quan đến dự án DAVictory..."
echo ""

# Function dừng tiến trình theo PID file
stop_by_pid_file() {
  local name="$1"
  local pid_file="$2"

  if [[ ! -f "$pid_file" ]]; then
    echo "[$name] Không thấy file PID"
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

    for _ in {1..10}; do
      if ! kill -0 "$pid" 2>/dev/null; then
        break
      fi
      sleep 0.5
    done

    if kill -0 "$pid" 2>/dev/null; then
      echo "[$name] Force kill PID: $pid"
      kill -9 "$pid" 2>/dev/null || true
    fi

    echo "[$name] ✓ Đã dừng"
  else
    echo "[$name] PID không còn chạy"
  fi

  rm -f "$pid_file"
}

# 1. Dừng theo PID file
stop_by_pid_file "backend" "$BACKEND_PID_FILE"
stop_by_pid_file "frontend" "$FRONTEND_PID_FILE"

echo ""
echo "🔍 Kiểm tra và dừng các tiến trình còn sót..."

# 2. Dừng tất cả tiến trình Java Spring Boot
JAVA_PIDS=$(ps aux | grep -i "DAVictory.*spring-boot" | grep -v grep | awk '{print $2}' || true)
if [[ -n "$JAVA_PIDS" ]]; then
  echo "$JAVA_PIDS" | while read -r pid; do
    [[ -n "$pid" ]] && { echo "  - Dừng Java PID: $pid"; kill -9 "$pid" 2>/dev/null || true; }
  done
else
  echo "✓ Không có Java Spring Boot"
fi

# 3. Dừng Maven
MVN_PIDS=$(ps aux | grep -E "mvn.*spring-boot:run" | grep -v grep | awk '{print $2}' || true)
if [[ -n "$MVN_PIDS" ]]; then
  echo "$MVN_PIDS" | while read -r pid; do
    [[ -n "$pid" ]] && { echo "  - Dừng Maven PID: $pid"; kill -9 "$pid" 2>/dev/null || true; }
  done
else
  echo "✓ Không có Maven"
fi

  # 4. Dừng Node frontend (Vite) hoặc Python static server
  PY_PIDS=$(ps aux | grep "python.*serve.py" | grep -v grep | awk '{print $2}' || true)
  if [[ -n "$PY_PIDS" ]]; then
    echo "[frontend] Đang dừng Python static server PID: $PY_PIDS"
    kill $PY_PIDS 2>/dev/null || true
  fi
  NODE_PIDS=$(ps aux | grep -E "node.*serve\.js|vite" | grep -v grep | awk '{print $2}' || true)
  if [[ -n "$NODE_PIDS" ]]; then
    echo "[frontend] Đang dừng PID: $NODE_PIDS"
    kill $NODE_PIDS 2>/dev/null || true
    echo "[frontend] ✓ Đã dừng"
  else
    echo "✓ Không có Node frontend"
  fi

# 5-6. Dừng theo port
for port in 8080 5173; do
  PORT_PID=$(lsof -ti:$port 2>/dev/null || true)
  if [[ -n "$PORT_PID" ]]; then
    echo "Tìm thấy tiến trình trên port $port:"
    echo "$PORT_PID" | while read -r pid; do
      [[ -n "$pid" ]] && { echo "  - Dừng port $port PID: $pid"; kill -9 "$pid" 2>/dev/null || true; }
    done
  else
    echo "✓ Port $port trống"
  fi
done

# 7. Dừng port liên quan khác
for port in 3000 3001 8081 5174; do
  PORT_PID=$(lsof -ti:$port 2>/dev/null || true)
  if [[ -n "$PORT_PID" ]] && ps -p "$PORT_PID" -o command= 2>/dev/null | grep -qi "DAVictory\|vite\|spring-boot\|serve\.js"; then
    echo "$PORT_PID" | while read -r pid; do
      [[ -n "$pid" ]] && { echo "  - Dừng port $port PID: $pid"; kill -9 "$pid" 2>/dev/null || true; }
    done
  fi
done

echo ""
echo "✅ Đã dừng TOÀN BỘ tiến trình liên quan đến dự án DAVictory"
