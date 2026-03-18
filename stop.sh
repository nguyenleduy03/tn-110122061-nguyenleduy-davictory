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

    # Chờ tối đa 5 giây
    for _ in {1..10}; do
      if ! kill -0 "$pid" 2>/dev/null; then
        break
      fi
      sleep 0.5
    done

    # Nếu vẫn còn thì kill mạnh
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

# 2. Dừng tất cả tiến trình Java Spring Boot của dự án
JAVA_PIDS=$(ps aux | grep -i "DAVictory" | grep -i "spring-boot" | grep -v grep | awk '{print $2}' || true)
if [[ -n "$JAVA_PIDS" ]]; then
  echo "Tìm thấy tiến trình Java Spring Boot:"
  echo "$JAVA_PIDS" | while read -r pid; do
    if [[ -n "$pid" ]]; then
      echo "  - Dừng Java PID: $pid"
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
else
  echo "✓ Không có tiến trình Java Spring Boot nào"
fi

# 3. Dừng tất cả tiến trình Maven của dự án
MVN_PIDS=$(ps aux | grep -E "mvn.*spring-boot:run|maven.*DAVictory" | grep -v grep | awk '{print $2}' || true)
if [[ -n "$MVN_PIDS" ]]; then
  echo "Tìm thấy tiến trình Maven:"
  echo "$MVN_PIDS" | while read -r pid; do
    if [[ -n "$pid" ]]; then
      echo "  - Dừng Maven PID: $pid"
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
else
  echo "✓ Không có tiến trình Maven nào"
fi

# 4. Dừng tất cả tiến trình Vite/Node của frontend
VITE_PIDS=$(ps aux | grep -E "vite|node.*frontend" | grep -E "$ROOT_DIR|DAVictory" | grep -v grep | awk '{print $2}' || true)
if [[ -n "$VITE_PIDS" ]]; then
  echo "Tìm thấy tiến trình Vite/Node:"
  echo "$VITE_PIDS" | while read -r pid; do
    if [[ -n "$pid" ]]; then
      echo "  - Dừng Vite/Node PID: $pid"
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
else
  echo "✓ Không có tiến trình Vite/Node nào"
fi

# 5. Dừng tiến trình đang dùng port 8080 (backend)
PORT_8080_PID=$(lsof -ti:8080 2>/dev/null || true)
if [[ -n "$PORT_8080_PID" ]]; then
  echo "Tìm thấy tiến trình trên port 8080:"
  echo "$PORT_8080_PID" | while read -r pid; do
    if [[ -n "$pid" ]]; then
      echo "  - Dừng port 8080 PID: $pid"
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
else
  echo "✓ Port 8080 trống"
fi

# 6. Dừng tiến trình đang dùng port 5173 (frontend)
PORT_5173_PID=$(lsof -ti:5173 2>/dev/null || true)
if [[ -n "$PORT_5173_PID" ]]; then
  echo "Tìm thấy tiến trình trên port 5173:"
  echo "$PORT_5173_PID" | while read -r pid; do
    if [[ -n "$pid" ]]; then
      echo "  - Dừng port 5173 PID: $pid"
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
else
  echo "✓ Port 5173 trống"
fi

# 7. Dừng các port khác có thể dùng (3000, 3001, 8081, 5174)
for port in 3000 3001 8081 5174; do
  PORT_PID=$(lsof -ti:$port 2>/dev/null || true)
  if [[ -n "$PORT_PID" ]]; then
    # Kiểm tra xem có liên quan đến dự án không
    if ps -p "$PORT_PID" -o command= | grep -qi "DAVictory\|vite\|spring-boot" 2>/dev/null; then
      echo "Tìm thấy tiến trình liên quan trên port $port:"
      echo "$PORT_PID" | while read -r pid; do
        if [[ -n "$pid" ]]; then
          echo "  - Dừng port $port PID: $pid"
          kill -9 "$pid" 2>/dev/null || true
        fi
      done
    fi
  fi
done

# 8. Xóa các file log cũ (tùy chọn)
if [[ -d "$RUN_DIR" ]]; then
  echo ""
  echo "🧹 Dọn dẹp file log cũ..."
  rm -f "$RUN_DIR"/*.log
  echo "✓ Đã xóa log files"
fi

echo ""
echo "✅ Đã dừng TOÀN BỘ tiến trình liên quan đến dự án DAVictory"
echo ""
echo "📊 Kiểm tra lại:"
echo "  - Port 8080: $(lsof -ti:8080 2>/dev/null | wc -l) tiến trình"
echo "  - Port 5173: $(lsof -ti:5173 2>/dev/null | wc -l) tiến trình"
echo "  - Java/Maven: $(ps aux | grep -E "DAVictory.*java|maven.*DAVictory" | grep -v grep | wc -l) tiến trình"
echo "  - Vite/Node: $(ps aux | grep -E "vite.*DAVictory|node.*frontend.*DAVictory" | grep -v grep | wc -l) tiến trình"
