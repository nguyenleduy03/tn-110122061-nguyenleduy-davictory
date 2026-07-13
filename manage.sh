#!/usr/bin/env bash
# ===============================================================
# manage.sh — Quản lý tất cả services DAVictory
#   ./manage.sh                 → Menu tương tác
#   ./manage.sh status          → Xem trạng thái
#   ./manage.sh start           → Start tất cả (native)
#   ./manage.sh stop backend    → Stop riêng
#   ./manage.sh log ai-writing  → Xem log
#   ./manage.sh build backend   → Build backend
#   ./manage.sh build frontend  → Build frontend
#   ./manage.sh bebuild         → Build backend (shortcut)
#   ./manage.sh febuild         → Build frontend (shortcut)
#
#   Docker mode:
#   ./manage.sh docker-up       → docker compose up -d --build (all)
#   ./manage.sh docker-down     → docker compose down (all)
#   ./manage.sh docker-start backend → docker compose up -d backend
#   ./manage.sh docker-stop backend  → docker compose stop backend
#   ./manage.sh docker-logs ai-agent → docker compose logs -f ai-agent-python
# ===============================================================
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"
mkdir -p "$RUN_DIR"

# Load env vars (Google Drive, JWT, DB)
if [[ -f "$ROOT_DIR/env.template.sh" ]]; then
  source "$ROOT_DIR/env.template.sh"
fi

# Xoá key giả khỏi process env — tránh đè .env của AI services
unset NVIDIA_API_KEY GROQ_API_KEY GROQ_API_KEY_2 GROQ_API_KEY_3 GROQ_API_KEY_4 GROQ_API_KEY_5
unset OPENAI_API_KEY

# Docker mode: 0 = native processes, 1 = Docker Compose
USE_DOCKER=${USE_DOCKER:-0}

# Ports
BACKEND_PORT=8080; FRONTEND_PORT=5173
AI_WRITING_PORT=5182; AI_SPEAKING_PORT=5181; AI_AGENT_PORT=5187; AI_IMPORT_PORT=5186
CHROMA_PORT=5184; REDIS_PORT=6379; MYSQL_PORT=3306
BACKEND_DIR="backend"; FRONTEND_DIR="frontend"
AI_WRITING_DIR="ai-writing-python"; AI_SPEAKING_DIR="ai-speaking-python"; AI_AGENT_DIR="ai-agent-python"; AI_IMPORT_DIR="ai-import-python"
CHROMA_DATA_DIR="$ROOT_DIR/data/chroma"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

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
    ai-agent) echo $AI_AGENT_PORT;; ai-import) echo $AI_IMPORT_PORT;;
    chroma) echo $CHROMA_PORT;; redis) echo $REDIS_PORT;;
  esac
}

_name() {
  case $1 in
    backend) echo "Backend";; frontend) echo "Frontend";;
    ai-writing) echo "AI Writing";; ai-speaking) echo "AI Speaking";;
    ai-agent) echo "AI Agent";; ai-import) echo "AI Import";;
    chroma) echo "ChromaDB";; redis) echo "Redis";; mysql) echo "MySQL";;
  esac
}

_dir() {
  case $1 in
    backend) echo "$ROOT_DIR/$BACKEND_DIR";; frontend) echo "$ROOT_DIR/$FRONTEND_DIR";;
    ai-writing) echo "$ROOT_DIR/$AI_WRITING_DIR";; ai-speaking) echo "$ROOT_DIR/$AI_SPEAKING_DIR";;
    ai-agent) echo "$ROOT_DIR/$AI_AGENT_DIR";; ai-import) echo "$ROOT_DIR/$AI_IMPORT_DIR";;
    chroma) echo "$ROOT_DIR";; redis) echo "$ROOT_DIR";;
  esac
}

# Map short service name → docker-compose.yml service name
_docker_compose_svc() {
  case $1 in
    backend) echo "backend";;
    frontend) echo "frontend";;
    ai-writing) echo "ai-writing-python";;
    ai-speaking) echo "ai-speaking-python";;
    ai-agent) echo "ai-agent-python";;
    ai-import) echo "ai-import-python";;
    chroma) echo "chromadb";;
    redis) echo "redis";;
    mysql) echo "mysql";;
    *) echo "$1";;
  esac
}

# Map short service name → Docker container name
_docker_container_name() {
  case $1 in
    backend) echo "davictory-backend";;
    frontend) echo "davictory-frontend";;
    ai-writing) echo "davictory-ai-writing";;
    ai-speaking) echo "davictory-ai-speaking";;
    ai-agent) echo "davictory-ai-agent";;
    ai-import) echo "davictory-ai-import";;
    chroma) echo "davictory-chromadb";;
    redis) echo "davictory-redis";;
    mysql) echo "davictory-mysql";;
    *) echo "davictory-$1";;
  esac
}

_docker_running() {
  local cname; cname=$(_docker_container_name "$1")
  [[ "$(docker inspect --format='{{.State.Status}}' "$cname" 2>/dev/null)" == "running" ]]
}

_docker_service() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

_docker_start_svc() {
  local svc=$1; local name; name=$(_name "$svc")
  local dsvc; dsvc=$(_docker_compose_svc "$svc")
  if _docker_running "$svc"; then
    _ok "$name đã chạy trong Docker"
    return 0
  fi
  echo -e "  Starting ${BOLD}$name${NC} (Docker)..."
  _docker_service up -d --build "$dsvc" 2>&1 | tail -3
  sleep 2
  if _docker_running "$svc"; then
    _ok "$name sẵn sàng (Docker)"
  else
    _err "$name khởi động thất bại"
    return 1
  fi
}

_docker_stop_svc() {
  local svc=$1; local name; name=$(_name "$svc")
  local dsvc; dsvc=$(_docker_compose_svc "$svc")
  if ! _docker_running "$svc"; then
    _warn "$name không chạy trong Docker"
    return 0
  fi
  echo -e "  Stopping ${BOLD}$name${NC} (Docker)..."
  _docker_service stop "$dsvc" 2>&1 | tail -2
  _ok "$name đã dừng"
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
  if [[ USE_DOCKER -eq 1 ]]; then
    echo -e "  ${BOLD}Mode: 🐳 Docker Mode${NC}"
  else
    echo -e "  ${BOLD}Mode: Native Process Mode${NC}"
  fi
  echo ""
  printf "  ${BOLD}%-20s %8s %s${NC}\n" "SERVICE" "PORT" "STATUS"
  echo "  $(printf '─%.0s' {1..55})"
  local count=0 total=0
  for svc in mysql redis chroma backend frontend ai-writing ai-speaking ai-agent ai-import; do
    total=$((total + 1))
    local port; port=$(_port "$svc" 2>/dev/null) || port="-"
    local name; name=$(_name "$svc")
    if [[ USE_DOCKER -eq 1 ]]; then
      if _docker_running "$svc" 2>/dev/null; then
        printf "  ${GREEN}%-20s ${NC}:%-5s ${GREEN}● Docker${NC}\n" "$name" "$port"
        count=$((count + 1))
      else
        printf "  ${RED}%-20s ${NC}:%-5s ${RED}○ Stopped${NC}\n" "$name" "$port"
      fi
    else
      if _running "$svc" 2>/dev/null; then
        local pid; pid=$(cat "$(_pid_file "$svc")" 2>/dev/null)
        printf "  ${GREEN}%-20s ${NC}:%-5s ${GREEN}● Running${NC}   PID %s\n" "$name" "$port" "$pid"
        count=$((count + 1))
      elif _docker_running "$svc" 2>/dev/null; then
        printf "  ${GREEN}%-20s ${NC}:%-5s ${GREEN}● Docker${NC}\n" "$name" "$port"
        count=$((count + 1))
      elif lsof -ti:"$port" &>/dev/null 2>/dev/null; then
        local opid; opid=$(lsof -ti:"$port" 2>/dev/null | head -1)
        printf "  ${YELLOW}%-20s ${NC}:%-5s ${YELLOW}⚠ Occupied${NC} by PID %s\n" "$name" "$port" "$opid"
      else
        printf "  ${RED}%-20s ${NC}:%-5s ${RED}○ Stopped${NC}\n" "$name" "$port"
      fi
    fi
  done
  echo ""
  echo -e "  ${BOLD}→ $count/$total services đang chạy${NC}"
  echo ""
}

# ===============================================================
start_svc() {
  local svc=$1; local port; port=$(_port "$svc")
  local name; name=$(_name "$svc")

  # Docker mode
  if [[ USE_DOCKER -eq 1 ]]; then
    _docker_start_svc "$svc"
    return $?
  fi

  # Native mode
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
    backend)
      local dir; dir=$(_dir "$svc")
      local runner; runner=$(_maven_runner "$svc")
      [[ -z "$runner" ]] && { _err "Maven không tìm thấy"; return 1; }
      cd "$dir"
      nohup "$runner" spring-boot:run > "$(_log_file "$svc")" 2>&1 &
      disown
      echo $! > "$(_pid_file "$svc")"
      echo -e "  ${YELLOW}→${NC} Đợi backend khởi động..."
      local waited=0
      local health_url="http://localhost:${port}/api/test-structure/sessions?testType=ACADEMIC"
      while true; do
        if _running "$svc" && curl -sf -o /dev/null "$health_url" 2>/dev/null; then
          break
        fi
        waited=$((waited + 1))
        if [ $waited -ge 120 ]; then
          _err "$name khởi động quá lâu (>120s)"
          return 1
        fi
        sleep 1
      done
      sleep 3
      _ok "$name sẵn sàng (PID: $(cat "$(_pid_file "$svc")"), ~${waited}s)"
      ;;
    frontend)
      local dir; dir=$(_dir "$svc")
      cd "$dir"
      echo -e "  ${YELLOW}→${NC} Building frontend..."
      npm run build > "$(_log_file "$svc")" 2>&1
      echo -e "  ${GREEN}✓${NC} Build complete"
      BACKEND_HOST=localhost AI_WRITING_HOST=localhost AI_SPEAKING_HOST=localhost \
      AI_IMPORT_HOST=localhost AI_AGENT_HOST=localhost \
        nohup node serve.js > "$(_log_file "$svc")" 2>&1 &
      echo $! > "$(_pid_file "$svc")"
      _ok "$name sẵn sàng (http://localhost:$port)"
      ;;
    ai-writing|ai-speaking|ai-agent|ai-import)
      local dir; dir=$(_dir "$svc")
      local python_bin="python3"
      if [[ -f "$dir/.venv/bin/python" ]]; then
        python_bin="$dir/.venv/bin/python"
      fi
      if _port_in_use "$port"; then
        local oldpid; oldpid=$(_port_pid "$port")
        echo -e "  ${YELLOW}→${NC} Port $port đang dùng bởi PID $oldpid, sẽ tắt..."
        kill "$oldpid" 2>/dev/null || true
        for _ in $(seq 1 4); do kill -0 "$oldpid" 2>/dev/null || break; sleep 0.5; done
        kill -0 "$oldpid" 2>/dev/null && kill -9 "$oldpid" 2>/dev/null || true
        echo -e "  ${GREEN}✓${NC} Đã giải phóng port $port"
      fi
      cd "$dir"
      nohup "$python_bin" -m uvicorn main:app --host 0.0.0.0 --port "$port" --workers 1 \
        > "$(_log_file "$svc")" 2>&1 &
      disown
      echo $! > "$(_pid_file "$svc")"
      sleep 3
      if _running "$svc"; then
        _ok "$name sẵn sàng (PID: $(cat "$(_pid_file "$svc")"))"
      else
        _err "$name khởi động thất bại"
        tail -5 "$(_log_file "$svc")"
        return 1
      fi
      ;;
    chroma)
      if _docker_running "$svc"; then
        _ok "$name đã chạy trong Docker (port $port)"
        return 0
      fi
      mkdir -p "$CHROMA_DATA_DIR"
      nohup chroma run --path "$CHROMA_DATA_DIR" --host 0.0.0.0 --port "$port" \
        > "$(_log_file "$svc")" 2>&1 &
      echo $! > "$(_pid_file "$svc")"
      sleep 3
      if _running "$svc"; then
        _ok "$name sẵn sàng (PID: $(cat "$(_pid_file "$svc")"))"
      else
        _err "$name khởi động thất bại"
        return 1
      fi
      ;;
    redis)
      _docker_service up -d redis 2>&1
      sleep 1
      if _docker_running redis; then
        _ok "Redis sẵn sàng (http://localhost:$REDIS_PORT)"
      else
        _err "Redis khởi động thất bại"
        return 1
      fi
      ;;
    mysql)
      _docker_service up -d mysql 2>&1
      sleep 1
      if _docker_running mysql; then
        _ok "MySQL sẵn sàng"
      else
        _err "MySQL khởi động thất bại"
        return 1
      fi
      ;;
  esac
}

stop_svc() {
  local svc=$1; local name; name=$(_name "$svc")
  local port; port=$(_port "$svc")

  # Docker mode
  if [[ USE_DOCKER -eq 1 ]]; then
    _docker_stop_svc "$svc"
    return $?
  fi

  # Native mode
  case $svc in
    mysql|redis)
      if _docker_running "$svc"; then
        echo -e "  Stopping ${BOLD}$name${NC} (Docker)..."
        local dsvc; dsvc=$(_docker_compose_svc "$svc")
        _docker_service stop "$dsvc" 2>&1
        _ok "$name đã dừng"
      else
        _warn "$name không chạy"
      fi
      return 0
      ;;
    chroma)
      if _docker_running "$svc"; then
        echo -e "  Stopping ${BOLD}$name${NC} (Docker)..."
        _docker_service stop chromadb 2>&1
        _ok "$name đã dừng"
      elif _running "$svc"; then
        local pid; pid=$(cat "$(_pid_file "$svc")" 2>/dev/null)
        echo -e "  Stopping ${BOLD}$name${NC} (PID: $pid)..."
        kill "$pid" 2>/dev/null || true
        for _ in $(seq 1 8); do kill -0 "$pid" 2>/dev/null || break; sleep 0.5; done
        kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
        rm -f "$(_pid_file "$svc")"
        _ok "$name đã dừng"
      else
        _warn "$name không chạy"; rm -f "$(_pid_file "$svc")"
      fi
      return 0
      ;;
  esac

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

# Build backend production
build_backend() {
  local dir; dir=$(_dir "backend")
  local runner; runner=$(_maven_runner "backend")
  [[ -z "$runner" ]] && { _err "Maven không tìm thấy"; return 1; }
  cd "$dir"
  echo -e "  Building backend..."
  "$runner" clean package -DskipTests 2>&1 | tail -20
  if [[ $? -eq 0 ]]; then
    echo -e "  ${GREEN}✓${NC} Build backend hoàn tất"
  else
    _err "Build backend thất bại"
    return 1
  fi
}

# Build frontend production
build_frontend() {
  local dir; dir=$(_dir "frontend")
  cd "$dir"
  echo -e "  Building frontend..."
  npm run build
  echo -e "  ${GREEN}✓${NC} Build hoàn tất"
}

# Build AI test frontend
build_ai_frontend() {
  local dir="$ROOT_DIR/ai-test-frontend"
  cd "$dir"
  echo -e "  Building AI test frontend..."
  npm run build
  echo -e "  ${GREEN}✓${NC} Build AI test frontend hoàn tất"
}

# Docker compose up (all services)
docker_up() {
  echo -e "  ${BOLD}🐳 Docker Compose Up (--build)${NC}"
  _docker_service up -d --build 2>&1 | tail -10
  echo -e "  ${GREEN}✓${NC} All containers started"
  echo ""
  docker ps --format "table {{.Names}}\t{{.Status}}"
}

# Docker compose down (all services)
docker_down() {
  echo -e "  ${BOLD}🐳 Docker Compose Down${NC}"
  _docker_service down 2>&1 | tail -5
  echo -e "  ${GREEN}✓${NC} All containers stopped"
}

# Docker compose logs
docker_logs() {
  local svc=$1
  local dsvc; dsvc=$(_docker_compose_svc "$svc")
  _docker_service logs "$dsvc" --tail 50 -f 2>&1
}

# Docker compose restart
docker_restart() {
  local svc=$1; local name; name=$(_name "$svc")
  local dsvc; dsvc=$(_docker_compose_svc "$svc")
  echo -e "  Restarting ${BOLD}$name${NC} (Docker)..."
  _docker_service stop "$dsvc" 2>&1 | tail -1
  _docker_service up -d --build "$dsvc" 2>&1 | tail -3
  if _docker_running "$svc"; then
    _ok "$name sẵn sàng (Docker)"
  else
    _err "$name restart thất bại"
  fi
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

    if [[ USE_DOCKER -eq 1 ]]; then
      echo "    [1] Docker Compose Up (--build tất cả)"
      echo "    [2] Docker Compose Down (dừng tất cả)"
      echo "    [3] Docker Restart tất cả"
      echo "    [M]  Chuyển sang Native Mode"
    else
      echo "    [1] Khởi động tất cả (native)"
      echo "    [2] Dừng tất cả (native)"
      echo "    [3] Khởi động lại tất cả (native)"
      echo "    [M]  Chuyển sang Docker Mode 🐳"
    fi
    echo "    [4] Build frontend"
    echo "    [5] Build backend"
    echo "    [6] Build AI test frontend"
    echo ""
    for pair in "b:backend" "f:frontend" "w:ai-writing" "p:ai-speaking" "a:ai-agent" "i:ai-import" "c:chroma" "r:redis"; do
      local key="${pair%%:*}"
      local svc="${pair##*:}"
      local port; port=$(_port "$svc"); local name; name=$(_name "$svc")

      if [[ USE_DOCKER -eq 1 ]]; then
        if _docker_running "$svc" 2>/dev/null; then
          echo -e "    [D${key}] Dừng ${BOLD}$name${NC} (Docker)     [R${key}] Restart ${BOLD}$name${NC}"
        else
          echo -e "    [${key}]  Start ${BOLD}$name${NC} (Docker)"
        fi
        echo -e "    [L${key}] Log ${BOLD}$name${NC}"
      else
        if _running "$svc" || _port_in_use "$port" 2>/dev/null; then
          echo -e "    [S${key}] Dừng ${BOLD}$name${NC}     [R${key}] Khởi động lại"
        else
          echo -e "    [${key}]  Start ${BOLD}$name${NC}"
        fi
        echo -e "    [L${key}] Log ${BOLD}$name${NC}"
      fi
    done
    echo ""
    echo "    [9] Xem status"
    echo "    [0] Thoát"
    echo ""

    # Read with timeout to avoid infinite loop on non-TTY
    if [[ ! -t 0 ]]; then
      read -r -t 0.1 c || c=""
      [[ -z "$c" ]] && { echo "Not a TTY, running status once."; status; exit 0; }
    else
      read -r -p "  Nhập lựa chọn: " c
    fi
    echo ""

    case "$c" in
      # Mode toggle
      M|m)
        if [[ USE_DOCKER -eq 1 ]]; then
          USE_DOCKER=0
          _info "Chuyển sang Native Mode"
        else
          USE_DOCKER=1
          _info "Chuyển sang Docker Mode 🐳"
        fi
        ;;

      # Docker mode actions
      1)
        if [[ USE_DOCKER -eq 1 ]]; then
          docker_up
        else
          for s in backend frontend ai-writing ai-speaking ai-agent ai-import chroma; do start_svc "$s"; done
          _ok "Tất cả services đã khởi động"
        fi
        ;;
      2)
        if [[ USE_DOCKER -eq 1 ]]; then
          docker_down
        else
          for s in backend frontend ai-writing ai-speaking ai-agent ai-import chroma; do stop_svc "$s"; done
          _ok "Tất cả services đã dừng"
        fi
        ;;
      3)
        if [[ USE_DOCKER -eq 1 ]]; then
          docker_down
          echo -e "  ${YELLOW}→${NC} Đợi 3 giây..."
          sleep 3
          docker_up
        else
          for s in backend frontend ai-writing ai-speaking ai-agent ai-import chroma; do stop_svc "$s"; done; sleep 1
          for s in backend frontend ai-writing ai-speaking ai-agent ai-import chroma; do start_svc "$s"; done
          _docker_service restart redis 2>&1
        fi
        ;;
      4) build_frontend ;;
      5) build_backend ;;
      6) build_ai_frontend ;;

      # Native start/stop per service
      b) start_svc backend;;        Sb) stop_svc backend;;       Rb) stop_svc backend; sleep 1; start_svc backend;;
      f) start_svc frontend;;       Sf) stop_svc frontend;;      Rf) stop_svc frontend; sleep 1; start_svc frontend;;
      w) start_svc ai-writing;;     Sw) stop_svc ai-writing;;    Rw) stop_svc ai-writing; sleep 1; start_svc ai-writing;;
      a) start_svc ai-agent;;       Sa) stop_svc ai-agent;;      Ra) stop_svc ai-agent; sleep 1; start_svc ai-agent;;
      i) start_svc ai-import;;      Si) stop_svc ai-import;;     Ri) stop_svc ai-import; sleep 1; start_svc ai-import;;
      p) start_svc ai-speaking;;    Sp) stop_svc ai-speaking;;   Rp) stop_svc ai-speaking; sleep 1; start_svc ai-speaking;;
      c) start_svc chroma;;         Sc) stop_svc chroma;;        Rc) stop_svc chroma; sleep 1; start_svc chroma;;
      r) start_svc redis;;          Sr) stop_svc redis;;         Rr) stop_svc redis; sleep 1; start_svc redis;;

      # Docker start/stop per service
      Db) _docker_start_svc backend;;    Rb) docker_restart backend;;
      Df) _docker_start_svc frontend;;   Rf) docker_restart frontend;;
      Dw) _docker_start_svc ai-writing;; Rw) docker_restart ai-writing;;
      Da) _docker_start_svc ai-agent;;   Ra) docker_restart ai-agent;;
      Di) _docker_start_svc ai-import;;  Ri) docker_restart ai-import;;
      Dp) _docker_start_svc ai-speaking;;Rp) docker_restart ai-speaking;;
      Dc) _docker_start_svc chroma;;     Rc) docker_restart chroma;;
      Dr) _docker_start_svc redis;;      Rr) docker_restart redis;;

      # Logs
      Lb) if [[ USE_DOCKER -eq 1 ]]; then docker_logs backend; else tail -f "$(_log_file "backend")" 2>/dev/null || _err "Chưa có log"; fi;;
      Lf) if [[ USE_DOCKER -eq 1 ]]; then docker_logs frontend; else tail -f "$(_log_file "frontend")" 2>/dev/null || _err "Chưa có log"; fi;;
      Lw) if [[ USE_DOCKER -eq 1 ]]; then docker_logs ai-writing; else tail -f "$(_log_file "ai-writing")" 2>/dev/null || _err "Chưa có log"; fi;;
      La) if [[ USE_DOCKER -eq 1 ]]; then docker_logs ai-agent; else tail -f "$(_log_file "ai-agent")" 2>/dev/null || _err "Chưa có log"; fi;;
      Li) if [[ USE_DOCKER -eq 1 ]]; then docker_logs ai-import; else tail -f "$(_log_file "ai-import")" 2>/dev/null || _err "Chưa có log"; fi;;
      Lp) if [[ USE_DOCKER -eq 1 ]]; then docker_logs ai-speaking; else tail -f "$(_log_file "ai-speaking")" 2>/dev/null || _err "Chưa có log"; fi;;
      Lc) if [[ USE_DOCKER -eq 1 ]]; then docker_logs chroma; else tail -f "$(_log_file "chroma")" 2>/dev/null || _err "Chưa có log"; fi;;
      Lr) docker_logs redis;;

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
      if [[ $# -eq 0 ]]; then
        USE_DOCKER=${USE_DOCKER:-0}
        for s in backend frontend ai-writing ai-speaking ai-agent ai-import chroma; do start_svc "$s"; done
        _ok "All services started"
      else
        for s in "$@"; do start_svc "$s"; done
      fi
      ;;
    stop)
      if [[ $# -eq 0 ]]; then
        for s in backend frontend ai-writing ai-speaking ai-agent ai-import chroma; do stop_svc "$s"; done
        _ok "All services stopped"
      else
        for s in "$@"; do stop_svc "$s"; done
      fi
      ;;
    restart)
      if [[ $# -eq 0 ]]; then
        for s in backend frontend ai-writing ai-speaking ai-agent ai-import chroma; do stop_svc "$s"; done; sleep 1
        for s in backend frontend ai-writing ai-speaking ai-agent ai-import chroma; do start_svc "$s"; done
        _docker_service restart redis 2>&1
      else
        for s in "$@"; do stop_svc "$s"; done; sleep 1
        for s in "$@"; do start_svc "$s"; done
      fi
      ;;
    log)
      [[ $# -eq 0 ]] && { echo "Usage: $0 log <service>"; exit 1; }
      case $1 in
        redis) _docker_service logs "$1" --tail 50 -f 2>&1;;
        *) tail -f "$(_log_file "$1")" 2>/dev/null || _err "Chưa có log cho $1";;
      esac
      ;;
    build)
      [[ $# -eq 0 ]] && { echo "Usage: $0 build <service>"; exit 1; }
      case $1 in
        backend) build_backend ;;
        frontend) build_frontend ;;
        ai-test-frontend|ai-frontend) build_ai_frontend ;;
        redis)
          _docker_service up -d --build "$1" 2>&1
          ;;
        *)
          local dir; dir=$(_dir "$1"); local runner; runner=$(_maven_runner "$1")
          [[ -z "$runner" ]] && { _err "Maven không tìm thấy"; exit 1; }
          (cd "$dir" && "$runner" clean package -DskipTests 2>&1 | tail -10)
          ;;
      esac
      ;;
    bebuild)
      build_backend
      ;;
    febuild)
      build_frontend
      ;;
    aibuild)
      build_ai_frontend
      ;;

    # Docker CLI commands
    docker-up)
      docker_up
      ;;
    docker-down)
      docker_down
      ;;
    docker-start)
      [[ $# -eq 0 ]] && { echo "Usage: $0 docker-start <service>"; exit 1; }
      for s in "$@"; do _docker_start_svc "$s"; done
      ;;
    docker-stop)
      [[ $# -eq 0 ]] && { echo "Usage: $0 docker-stop <service>"; exit 1; }
      for s in "$@"; do _docker_stop_svc "$s"; done
      ;;
    docker-restart)
      [[ $# -eq 0 ]] && { echo "Usage: $0 docker-restart <service>"; exit 1; }
      for s in "$@"; do docker_restart "$s"; done
      ;;
    docker-logs)
      [[ $# -eq 0 ]] && { echo "Usage: $0 docker-logs <service>"; exit 1; }
      docker_logs "$1"
      ;;
    docker-ps)
      docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" --filter name=davictory
      ;;
    docker-mode)
      USE_DOCKER=1
      _info "Switched to Docker Mode 🐳"
      if [[ $# -ge 1 ]]; then
        case $1 in
          up) docker_up ;;
          down) docker_down ;;
          start) shift; for s in "$@"; do _docker_start_svc "$s"; done ;;
          stop) shift; for s in "$@"; do _docker_stop_svc "$s"; done ;;
          restart) shift; for s in "$@"; do docker_restart "$s"; done ;;
          logs) shift; docker_logs "$1" ;;
          ps) docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" --filter name=davictory ;;
        esac
      fi
      ;;
    *)
      echo "Usage: $0 [status|start|stop|restart|log|build|bebuild|febuild|aibuild]"
      echo ""
      echo "  Docker commands:"
      echo "    docker-up        docker compose up -d --build"
      echo "    docker-down      docker compose down"
      echo "    docker-start     docker compose up -d <service>"
      echo "    docker-stop      docker compose stop <service>"
      echo "    docker-restart   docker compose restart <service>"
      echo "    docker-logs      docker compose logs -f <service>"
      echo "    docker-ps        list davictory containers"
      echo "    docker-mode      switch to Docker mode, e.g.:"
      echo "                      ./manage.sh docker-mode up"
      echo "                      ./manage.sh docker-mode start backend"
      echo ""
      echo "  Services: backend frontend ai-writing ai-speaking ai-agent ai-import chroma redis mysql"
      exit 1
      ;;
  esac
fi
