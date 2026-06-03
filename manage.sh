#!/usr/bin/env bash
# ===============================================================
# manage.sh — Quản lý tất cả services DAVictory
#   ./manage.sh              → Menu tương tác
#   ./manage.sh status       → Xem trạng thái
#   ./manage.sh start        → Start tất cả
#   ./manage.sh stop backend → Stop riêng
#   ./manage.sh log ai-writing → Xem log
# ===============================================================
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"
mkdir -p "$RUN_DIR"

# Ports
BACKEND_PORT=8080; FRONTEND_PORT=5173; AI_WRITING_PORT=5180; AI_SPEAKING_PORT=5181
BACKEND_DIR="backend"; FRONTEND_DIR="frontend"
AI_WRITING_DIR="ai-writing-service"; AI_SPEAKING_DIR="ai-speaking-service"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

_info() { echo -e "${CYAN}INFO${NC}  $*"; }
_ok()   { echo -e "${GREEN}OK${NC}    $*"; }
_warn() { echo -e "${YELLOW}WARN${NC}  $*"; }
_err()  { echo -e "${RED}ERROR${NC} $*"; }

_pid_file() { echo "$RUN_DIR/$1.pid"; }
_log_file() { echo "$RUN_DIR/$1.log"; }

# ===============================================================
_running() {
  local pid_file; pid_file="$(_pid_file "$1")"
  [[ -f "$pid_file" ]] || return 1
  local pid; pid=$(cat "$pid_file" 2>/dev/null) || return 1
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

_port_in_use() { lsof -ti:"$1" &>/dev/null; }

_port_pid() {
  lsof -ti:"$1" 2>/dev/null | head -1
}

_port() {
  local svc=$1
  case $svc in
    backend) echo $BACKEND_PORT;; frontend) echo $FRONTEND_PORT;;
    ai-writing) echo $AI_WRITING_PORT;; ai-speaking) echo $AI_SPEAKING_PORT;;
  esac
}

_name() {
  case $1 in
    backend) echo "Backend";; frontend) echo "Frontend";;
    ai-writing) echo "AI Writing";; ai-speaking) echo "AI Speaking";;
  esac
}

_dir() {
  case $1 in
    backend) echo "$ROOT_DIR/$BACKEND_DIR";; frontend) echo "$ROOT_DIR/$FRONTEND_DIR";;
    ai-writing) echo "$ROOT_DIR/$AI_WRITING_DIR";; ai-speaking) echo "$ROOT_DIR/$AI_SPEAKING_DIR";;
  esac
}

_maven_runner() {
  local dir; dir=$(_dir "$1")
  if [[ -x "$dir/mvnw" && -f "$dir/.mvn/wrapper/maven-wrapper.properties" ]]; then
    echo "$dir/mvnw"; return
  fi
  command -v mvn &>/dev/null && echo "mvn" || echo ""
}

# ===============================================================
status() {
  echo ""
  printf "  ${BOLD}%-20s %8s %s${NC}\n" "SERVICE" "PORT" "STATUS"
  echo "  $(printf '─%.0s' {1..50})"
  for svc in backend ai-writing ai-speaking frontend; do
    local port; port=$(_port "$svc")
    local name; name=$(_name "$svc")
    if _running "$svc"; then
      local pid; pid=$(cat "$(_pid_file "$svc")" 2>/dev/null)
      printf "  ${GREEN}%-20s ${NC}:%-5s ${GREEN}● Running${NC}   PID %s\n" "$name" "$port" "$pid"
    elif lsof -ti:"$port" &>/dev/null; then
      local opid; opid=$(lsof -ti:"$port" 2>/dev/null | head -1)
      printf "  ${YELLOW}%-20s ${NC}:%-5s ${YELLOW}⚠ Occupied${NC} by PID %s\n" "$name" "$port" "$opid"
    else
      printf "  ${RED}%-20s ${NC}:%-5s ${RED}○ Stopped${NC}\n" "$name" "$port"
    fi
  done
  local n=0
  for svc in backend ai-writing ai-speaking frontend; do _running "$svc" && n=$((n+1)); done
  echo ""
  echo -e "  ${BOLD}→ $n/4 services đang chạy${NC}"
  echo ""
}

# ===============================================================
start_svc() {
  local svc=$1; local port; port=$(_port "$svc")
  local name; name=$(_name "$svc")

  _running "$svc" && { _warn "$name đã chạy (port $port)"; return 0; }
  if _port_in_use "$port"; then
    local oldpid; oldpid=$(_port_pid "$port")
    echo -e "  ${YELLOW}→${NC} Port $port đang dùng bởi PID $oldpid, sẽ tắt trước khi start..."
    kill "$oldpid" 2>/dev/null || true
    for _ in $(seq 1 8); do kill -0 "$oldpid" 2>/dev/null || break; sleep 0.5; done
    kill -0 "$oldpid" 2>/dev/null && kill -9 "$oldpid" 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} Đã giải phóng port $port"
  fi

  echo -e "  Starting ${BOLD}$name${NC} (port $port)..."

  case $svc in
    backend|ai-writing|ai-speaking)
      local dir; dir=$(_dir "$svc")
      local artifact; artifact=$(basename "$dir")
      local jar="$dir/target/$artifact-1.0.0.jar"
      echo "  DEBUG: JAR path = $jar"
      echo "  DEBUG: File exists = $(test -f "$jar" && echo YES || echo NO)"
      if [[ ! -f "$jar" ]]; then
        _warn "Chưa có JAR, đang build..."
        local runner; runner=$(_maven_runner "$svc")
        echo "  DEBUG: Maven runner = $runner"
        [[ -z "$runner" ]] && { _err "Maven không tìm thấy"; return 1; }
        (cd "$dir" && "$runner" clean package -DskipTests 2>&1 | tail -20)
        if [[ -f "$jar" ]]; then
          _ok "Build thành công"
        else
          _err "Build thất bại — JAR không được tạo tại: $jar"
          return 1
        fi
      fi
      cd "$dir"
      mkdir -p data/tmp
      nohup java -Xmx4g -Xms1g -Djava.io.tmpdir=./data/tmp -jar "$jar" --server.port="$port" > "$(_log_file "$svc")" 2>&1 &
      echo $! > "$(_pid_file "$svc")"
      sleep 4
      if _running "$svc"; then _ok "$name sẵn sàng (PID: $(cat "$(_pid_file "$svc")"))"; else _err "$name khởi động thất bại"; return 1; fi
      ;;
    frontend)
      local dir; dir=$(_dir "$svc")
      cd "$dir"
      nohup npm run dev -- --host 0.0.0.0 > "$(_log_file "$svc")" 2>&1 &
      echo $! > "$(_pid_file "$svc")"
      _ok "$name sẵn sàng (http://localhost:$port)"
      ;;
  esac
}

stop_svc() {
  local svc=$1; local name; name=$(_name "$svc")
  local port; port=$(_port "$svc")
  local pid

  if _running "$svc"; then
    pid=$(cat "$(_pid_file "$svc")" 2>/dev/null)
  elif _port_in_use "$port"; then
    pid=$(_port_pid "$port")
    echo -e "  ${YELLOW}→${NC} Phát hiện tiến trình chiếm port $port (PID: $pid, không quản lý bởi script)"
  else
    _warn "$name không chạy"; rm -f "$(_pid_file "$svc")"; return 0
  fi

  echo -e "  Stopping ${BOLD}$name${NC} (PID: $pid)..."
  kill "$pid" 2>/dev/null || true
  for _ in $(seq 1 8); do kill -0 "$pid" 2>/dev/null || break; sleep 0.5; done
  kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
  rm -f "$(_pid_file "$svc")"
  _ok "$name đã dừng"
}

# ===============================================================
menu() {
  while true; do
    clear
    echo ""
    echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║       DAVictory Service Manager         ║${NC}"
    echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
    echo ""
    status
    echo -e "  ${BOLD}── MENU ──${NC}"
    echo "    [1] Khởi động tất cả"
    echo "    [2] Dừng tất cả"
    echo "    [3] Khởi động lại tất cả"
    echo ""
    for pair in "b:backend" "w:ai-writing" "p:ai-speaking" "f:frontend"; do
      local key="${pair%%:*}"
      local svc="${pair##*:}"
      local port; port=$(_port "$svc"); local name; name=$(_name "$svc")
      if _running "$svc" || _port_in_use "$port"; then
        echo -e "    [S${key}] Dừng ${BOLD}$name${NC}     [R${key}] Khởi động lại"
      else
        echo -e "    [${key}]  Start ${BOLD}$name${NC}"
      fi
      echo -e "    [L${key}] Log ${BOLD}$name${NC}"
    done
    echo ""
    echo "    [9] Xem status"
    echo "    [0] Thoát"
    echo ""

    # Read with timeout to avoid infinite loop on non-TTY
    if [[ ! -t 0 ]]; then
      # Non-TTY: read first line from stdin if available
      read -r -t 0.1 c || c=""
      [[ -z "$c" ]] && { echo "Not a TTY, running status once."; status; exit 0; }
    else
      read -r -p "  Nhập lựa chọn: " c
    fi
    echo ""

    case "$c" in
      1) for s in backend ai-writing ai-speaking frontend; do start_svc "$s"; done ;;
      2) for s in backend ai-writing ai-speaking frontend; do stop_svc "$s"; done ;;
      3) for s in backend ai-writing ai-speaking frontend; do stop_svc "$s"; done; sleep 1
         for s in backend ai-writing ai-speaking frontend; do start_svc "$s"; done ;;
      Sb) stop_svc backend;;        Rb) stop_svc backend; sleep 1; start_svc backend;;
      Sw) stop_svc ai-writing;;     Rw) stop_svc ai-writing; sleep 1; start_svc ai-writing;;
      Sp) stop_svc ai-speaking;;    Rp) stop_svc ai-speaking; sleep 1; start_svc ai-speaking;;
      Sf) stop_svc frontend;;       Rf) stop_svc frontend; sleep 1; start_svc frontend;;
      b) start_svc backend;;        rb) stop_svc backend; sleep 1; start_svc backend;;
      w) start_svc ai-writing;;     rw) stop_svc ai-writing; sleep 1; start_svc ai-writing;;
      p) start_svc ai-speaking;;    rp) stop_svc ai-speaking; sleep 1; start_svc ai-speaking;;
      f) start_svc frontend;;       rf) stop_svc frontend; sleep 1; start_svc frontend;;
      Lb) tail -f "$(_log_file "backend")" 2>/dev/null || _err "Chưa có log";;
      Lw) tail -f "$(_log_file "ai-writing")" 2>/dev/null || _err "Chưa có log";;
      Lp) tail -f "$(_log_file "ai-speaking")" 2>/dev/null || _err "Chưa có log";;
      Lf) tail -f "$(_log_file "frontend")" 2>/dev/null || _err "Chưa có log";;
      9) status;;
      0) echo "  Bye!"; exit 0;;
      *) echo -e "  ${YELLOW}Lựa chọn không hợp lệ${NC}";;
    esac
    echo ""; read -r -p "  Nhấn Enter để tiếp tục..." x
  done
}

# ===============================================================
if [[ $# -eq 0 ]]; then
  menu
else
  # CLI mode
  action=$1; shift || true
  case $action in
    status)
      status
      ;;
    start)
      if [[ $# -eq 0 ]]; then for s in backend ai-writing ai-speaking frontend; do start_svc "$s"; done
      else for s in "$@"; do start_svc "$s"; done; fi
      ;;
    stop)
      if [[ $# -eq 0 ]]; then for s in backend ai-writing ai-speaking frontend; do stop_svc "$s"; done
      else for s in "$@"; do stop_svc "$s"; done; fi
      ;;
    restart)
      if [[ $# -eq 0 ]]; then
        for s in backend ai-writing ai-speaking frontend; do stop_svc "$s"; done; sleep 1
        for s in backend ai-writing ai-speaking frontend; do start_svc "$s"; done
      else
        for s in "$@"; do stop_svc "$s"; done; sleep 1
        for s in "$@"; do start_svc "$s"; done
      fi
      ;;
    log)
      [[ $# -eq 0 ]] && { echo "Usage: $0 log <service>"; echo "Services: backend ai-writing ai-speaking frontend"; exit 1; }
      tail -f "$(_log_file "$1")" 2>/dev/null || _err "Chưa có log cho $1"
      ;;
    build)
      [[ $# -eq 0 ]] && { echo "Usage: $0 build <service>"; exit 1; }
      local dir; dir=$(_dir "$1"); local runner; runner=$(_maven_runner "$1")
      [[ -z "$runner" ]] && { _err "Maven không tìm thấy"; exit 1; }
      (cd "$dir" && "$runner" clean package -DskipTests 2>&1 | tail -10)
      ;;
    *)
      echo "Usage: $0 [status|start|stop|restart|log|build] [service...]"
      echo ""
      echo "  Services: backend ai-writing ai-speaking frontend"
      exit 1
      ;;
  esac
fi