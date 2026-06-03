#!/usr/bin/env bash
# ===============================================================
# run-ai-writing.sh — Chạy AI Writing Grading Service
# ===============================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$ROOT_DIR/ai-writing-service"
JAR="$SERVICE_DIR/target/ai-writing-service-1.0.0.jar"
LOG="$SERVICE_DIR/ai-writing.log"
PID_FILE="$SERVICE_DIR/.pid"

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    -b|--background) MODE="background" ;;
    -f|--foreground) MODE="foreground" ;;
    -p|--port) PORT="$2"; shift ;;
    --skip-build) SKIP_BUILD="true" ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -b, --background    Chạy nền (mặc định: foreground)"
      echo "  -f, --foreground    Chạy trực tiếp"
      echo "  -p, --port PORT     Chọn port (mặc định: 5180)"
      echo "  --skip-build        Dùng JAR có sẵn, không build lại"
      echo "  -h, --help          Hướng dẫn"
      echo ""
      echo "Env:"
      echo "  GROQ_API_KEY        API key cho Groq (bắt buộc)"
      echo "  PORT                Port mặc định"
      echo "  MODE                foreground | background"
      echo "  SKIP_BUILD          true | false"
      exit 0
      ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
  shift
done

PORT="${PORT:-5180}"
MODE="${MODE:-foreground}"
SKIP_BUILD="${SKIP_BUILD:-false}"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; }

cleanup() {
  if [[ -f "$PID_FILE" ]]; then
    local pid; pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      info "Dừng service (PID: $pid)..."
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
  fi
}
trap cleanup EXIT

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   AI WRITING GRADING SERVICE             ║${NC}"
echo -e "${CYAN}║   DAVictory — IELTS Writing Auto Grader  ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ---------------------------------------------------------------
# 1. Kiểm tra Java
# ---------------------------------------------------------------
if ! command -v java &>/dev/null; then
  err "Java không tìm thấy. Cài Java 21+: https://adoptium.net"
  exit 1
fi

JAVA_VER=$(java -version 2>&1 | head -1 | grep -oP '"\d+\.\d+\.\d+' | tr -d '"' || echo "unknown")
info "Java: $JAVA_VER"

# ---------------------------------------------------------------
# 2. Kiểm tra GROQ_API_KEY
# ---------------------------------------------------------------
if [[ -z "${GROQ_API_KEY:-}" && -z "${GROQ_API_KEY_2:-}" ]]; then
  warn "GROQ_API_KEY chưa được set. Service sẽ không gọi được AI."
  echo ""
  echo "  Set key bằng lệnh:"
  echo "    export GROQ_API_KEY=gsk_...   (lấy tại https://console.groq.com)"
  echo ""

  # Hỏi có muốn nhập không
  if [[ -t 0 ]]; then
    read -r -p "Nhập GROQ_API_KEY (hoặc Enter để bỏ qua): " input_key
    if [[ -n "$input_key" ]]; then
      export GROQ_API_KEY="$input_key"
      ok "Đã set GROQ_API_KEY"
    fi
  fi
else
  ok "GROQ_API_KEY đã được cấu hình"
fi

# ---------------------------------------------------------------
# 3. Chọn runner
# ---------------------------------------------------------------
resolve_runner() {
  if command -v mvn &>/dev/null; then
    echo "mvn"
    return 0
  fi
  if [[ -x "$SERVICE_DIR/mvnw" && -f "$SERVICE_DIR/.mvn/wrapper/maven-wrapper.properties" ]]; then
    echo "./mvnw"
    return 0
  fi
  return 1
}

BUILD_MODE="jar"

# ---------------------------------------------------------------
# 4. Build nếu cần
# ---------------------------------------------------------------
if [[ "$SKIP_BUILD" != "true" ]]; then
  if [[ -f "$JAR" ]]; then
    info "JAR đã tồn tại: $JAR"
    echo "  Bỏ qua build. Set SKIP_BUILD=true để không build lại."
    echo "  Muốn build lại? Xoá file: rm $JAR"
  else
    echo ""
    info "Đang build service với Maven..."

    if ! RUNNER="$(resolve_runner)"; then
      err "Không tìm thấy Maven. Cài Maven hoặc dùng SKIP_BUILD=true với JAR có sẵn."
      exit 1
    fi

    cd "$SERVICE_DIR"
    "$RUNNER" clean package -DskipTests -q 2>&1 | tail -5

    if [[ ! -f "$JAR" ]]; then
      err "Build thất bại. Kiểm tra log."
      exit 1
    fi
    ok "Build thành công: $JAR"
  fi
else
  if [[ ! -f "$JAR" ]]; then
    err "SKIP_BUILD=true nhưng không tìm thấy JAR: $JAR"
    echo "  Build trước: cd ai-writing-service && mvn package -DskipTests"
    exit 1
  fi
  info "Bỏ qua build, dùng JAR có sẵn"
fi

# ---------------------------------------------------------------
# 5. Kiểm tra port
# ---------------------------------------------------------------
if lsof -ti:"$PORT" &>/dev/null; then
  warn "Port $PORT đã được sử dụng:"
  lsof -i:"$PORT" | tail -3
  echo ""
  if [[ -t 0 ]]; then
    read -r -p "Giết tiến trình cũ? (Y/n): " kill_old
    if [[ "$kill_old" =~ ^[Yy]?$ ]]; then
      lsof -ti:"$PORT" | xargs kill -9 2>/dev/null || true
      sleep 1
      ok "Đã giải phóng port $PORT"
    else
      err "Port $PORT đang được dùng. Set PORT=5181 để dùng port khác."
      exit 1
    fi
  else
    err "Port $PORT đang được dùng. Set PORT=5181 hoặc giải phóng port."
    exit 1
  fi
fi

# ---------------------------------------------------------------
# 6. Chạy service
# ---------------------------------------------------------------
echo ""
info "Khởi động AI Writing Service..."
echo "  Port    : $PORT"
echo "  Mode    : $MODE"
echo "  JAR     : $JAR"
echo "  Groq    : ${GROQ_API_KEY:+✅ Có key}${GROQ_API_KEY:-${GROQ_API_KEY_2:+✅ Có key 2}}${GROQ_API_KEY:-${GROQ_API_KEY_2:-❌ Không có key}}"
echo "  Swagger : http://localhost:$PORT/swagger-ui.html"
echo "  API     : http://localhost:$PORT/api/ai/writing/grade/{submissionId}"
echo "  Test    : http://localhost:$PORT/api/ai/writing/test-grade"
echo ""

if [[ "$MODE" == "background" ]]; then
  # Background
  nohup java -Xmx4g -Xms1g -Djava.io.tmpdir="$SERVICE_DIR/data/tmp" -jar "$JAR" --server.port="$PORT" >"$LOG" 2>&1 &
  PID=$!
  echo "$PID" > "$PID_FILE"

  sleep 3
  if kill -0 "$PID" 2>/dev/null; then
    ok "Service đã chạy nền (PID: $PID)"
    echo "  Log    : $LOG"
    echo "  Dừng   : kill $PID"
    echo ""
    echo "  Để theo dõi log:"
    echo "    tail -f $LOG"
  else
    err "Khởi động thất bại. Log:"
    tail -n 20 "$LOG" 2>/dev/null || true
    exit 1
  fi
else
  # Foreground
  echo -e "${YELLOW}Nhấn Ctrl+C để dừng${NC}"
  echo ""
  java -Xmx4g -Xms1g -Djava.io.tmpdir="$SERVICE_DIR/data/tmp" -jar "$JAR" --server.port="$PORT"
fi

# ---------------------------------------------------------------
# Bonus: test nhanh sau khi start
# ---------------------------------------------------------------
if [[ "$MODE" == "background" ]]; then
  echo ""
  info "Đang kiểm tra health..."
  sleep 2
  if curl -sf "http://localhost:$PORT/api/ai/writing/result/0" &>/dev/null; then
    ok "Service phản hồi tốt!"
  else
    warn "Chờ service khởi tạo xong (đang load model ONNX ~420MB)..."
    echo "  Kiểm tra: tail -f $LOG"
  fi
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}  AI Writing Service Ready!${NC}"
echo -e "${GREEN}  http://localhost:$PORT${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
