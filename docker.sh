#!/usr/bin/env bash
# docker.sh — Quản lý services DAVictory bằng Docker
#   ./docker.sh              → Menu tương tác
#   ./docker.sh up           → docker compose up -d --build
#   ./docker.sh down         → docker compose down
#   ./docker.sh ps           → Danh sách container
#   ./docker.sh logs backend → Xem log service
#   ./docker.sh start mysql  → Start 1 service
#   ./docker.sh stop mysql   → Stop 1 service
#   ./docker.sh rebuild ai-agent → Build lại + start 1 service
# ===============================================================
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

_info() { echo -e "${CYAN}INFO${NC}  $*"; }
_ok()   { echo -e "${GREEN}OK${NC}    $*"; }
_warn() { echo -e "${YELLOW}WARN${NC}  $*"; }
_err()  { echo -e "${RED}ERROR${NC} $*"; }

_compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

_container_name() {
  case $1 in
    backend) echo "davictory-backend";; frontend) echo "davictory-frontend";;
    ai-writing) echo "davictory-ai-writing";; ai-speaking) echo "davictory-ai-speaking";;
    ai-agent) echo "davictory-ai-agent";; ai-import) echo "davictory-ai-import";;
    chroma) echo "davictory-chromadb";; mysql) echo "davictory-mysql";;
    *) echo "davictory-$1";;
  esac
}

_is_running() {
  local cname; cname=$(_container_name "$1")
  [[ "$(docker inspect --format='{{.State.Status}}' "$cname" 2>/dev/null)" == "running" ]]
}

_compose_svc() {
  case $1 in
    ai-writing) echo "ai-writing-python";; ai-speaking) echo "ai-speaking-python";;
    ai-agent) echo "ai-agent-python";; ai-import) echo "ai-import-python";;
    chroma) echo "chromadb";; *) echo "$1";;
  esac
}

port_of() {
  case $1 in
    backend) echo 8080;; frontend) echo 5173;; ai-writing) echo 5182;;
    ai-speaking) echo 5181;; ai-agent) echo 5187;; ai-import) echo 5186;;
    chroma) echo 5184;; mysql) echo 3306;;
  esac
}

name_of() {
  case $1 in
    backend) echo "Backend";; frontend) echo "Frontend";; ai-writing) echo "AI Writing";;
    ai-speaking) echo "AI Speaking";; ai-agent) echo "AI Agent";; ai-import) echo "AI Import";;
    chroma) echo "ChromaDB";; mysql) echo "MySQL";;
  esac
}

status() {
  echo ""
  echo -e "  ${BOLD}Mode: 🐳 Docker${NC}"
  echo ""
  printf "  ${BOLD}%-20s %8s %s${NC}\n" "SERVICE" "PORT" "STATUS"
  echo "  $(printf '─%.0s' {1..55})"
  local count=0
  for svc in mysql chroma backend frontend ai-writing ai-speaking ai-agent ai-import; do
    local port; port=$(port_of "$svc"); local name; name=$(name_of "$svc")
    if _is_running "$svc" 2>/dev/null; then
      printf "  ${GREEN}%-20s ${NC}:%-5s ${GREEN}● Running${NC}\n" "$name" "$port"
      count=$((count + 1))
    else
      printf "  ${RED}%-20s ${NC}:%-5s ${RED}○ Stopped${NC}\n" "$name" "$port"
    fi
  done
  echo ""
  echo -e "  ${BOLD}→ $count/8 services đang chạy${NC}"
  echo ""
}

do_up() {
  echo -e "  ${BOLD}🐳 docker compose up -d --build${NC}"
  _compose up -d --build 2>&1 | tail -10
  _ok "All containers started"
  docker ps --format "table {{.Names}}\t{{.Status}}"
}

do_down() {
  echo -e "  ${BOLD}🐳 docker compose down${NC}"
  _compose down 2>&1 | tail -5
  _ok "All containers stopped"
}

do_ps() {
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" --filter name=davictory
}

do_logs() {
  local dsvc; dsvc=$(_compose_svc "$1")
  _compose logs "$dsvc" --tail 50 -f 2>&1
}

do_start() {
  local svc=$1; local name; name=$(name_of "$svc")
  local dsvc; dsvc=$(_compose_svc "$svc")
  if _is_running "$svc"; then
    _ok "$name đã chạy"; return 0
  fi
  echo -e "  Starting ${BOLD}$name${NC}..."
  _compose up -d --build "$dsvc" 2>&1 | tail -3
  sleep 2
  if _is_running "$svc"; then
    _ok "$name sẵn sàng"
  else
    _err "$name khởi động thất bại"
  fi
}

do_stop() {
  local svc=$1; local name; name=$(name_of "$svc")
  local dsvc; dsvc=$(_compose_svc "$svc")
  if ! _is_running "$svc"; then
    _warn "$name không chạy"; return 0
  fi
  echo -e "  Stopping ${BOLD}$name${NC}..."
  _compose stop "$dsvc" 2>&1 | tail -2
  _ok "$name đã dừng"
}

do_rebuild() {
  local svc=$1; local name; name=$(name_of "$svc")
  local dsvc; dsvc=$(_compose_svc "$svc")
  echo -e "  Rebuilding ${BOLD}$name${NC}..."
  _compose up -d --build "$dsvc" 2>&1 | tail -5
  if _is_running "$svc"; then
    _ok "$name sẵn sàng"
  else
    _err "$name khởi động thất bại"
  fi
}

menu() {
  while true; do
    clear
    echo ""
    echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}║       DAVictory Docker Manager          ║${NC}"
    echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
    echo ""
    status
    echo -e "  ${BOLD}── MENU ──${NC}"
    echo "    [1] Up (--build tất cả)"
    echo "    [2] Down (dừng tất cả)"
    echo "    [3] PS (danh sách container)"
    echo ""
    for pair in "b:backend" "f:frontend" "w:ai-writing" "p:ai-speaking" "a:ai-agent" "i:ai-import" "c:chroma"; do
      local key="${pair%%:*}"
      local svc="${pair##*:}"
      local name; name=$(name_of "$svc")
      if _is_running "$svc" 2>/dev/null; then
        echo -e "    [S${key}] Dừng ${BOLD}$name${NC}     [R${key}] Rebuild ${BOLD}$name${NC}"
      else
        echo -e "    [${key}]  Start ${BOLD}$name${NC}"
      fi
      echo -e "    [L${key}] Log ${BOLD}$name${NC}"
    done
    echo ""
    echo "    [9] Xem status"
    echo "    [0] Thoát"
    echo ""

    if [[ ! -t 0 ]]; then
      read -r -t 0.1 c || c=""
      [[ -z "$c" ]] && { echo "Not a TTY, running status once."; status; exit 0; }
    else
      read -r -p "  Nhập lựa chọn: " c
    fi
    echo ""

    case "$c" in
      1) do_up;;
      2) do_down;;
      3) do_ps;;
      b) do_start backend;;  Sb) do_stop backend;;  Rb) do_rebuild backend;;
      f) do_start frontend;; Sf) do_stop frontend;; Rf) do_rebuild frontend;;
      w) do_start ai-writing;; Sw) do_stop ai-writing;; Rw) do_rebuild ai-writing;;
      a) do_start ai-agent;; Sa) do_stop ai-agent;;   Ra) do_rebuild ai-agent;;
      i) do_start ai-import;; Si) do_stop ai-import;;  Ri) do_rebuild ai-import;;
      p) do_start ai-speaking;; Sp) do_stop ai-speaking;; Rp) do_rebuild ai-speaking;;
      c) do_start chroma;;     Sc) do_stop chroma;;      Rc) do_rebuild chroma;;
      Lb) do_logs backend;;    Lf) do_logs frontend;;
      Lw) do_logs ai-writing;; La) do_logs ai-agent;;
      Li) do_logs ai-import;;  Lp) do_logs ai-speaking;;
      Lc) do_logs chroma;;
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
  action=$1; shift || true
  case $action in
    up) do_up;;
    down) do_down;;
    ps) do_ps;;
    status) status;;
    start) for s in "$@"; do do_start "$s"; done;;
    stop) for s in "$@"; do do_stop "$s"; done;;
    restart)
      if [[ $# -eq 0 ]]; then
        _compose restart 2>&1
      else
        for s in "$@"; do local dsvc; dsvc=$(_compose_svc "$s"); _compose restart "$dsvc" 2>&1; done
      fi
      ;;
    rebuild) for s in "$@"; do do_rebuild "$s"; done;;
    logs)
      [[ $# -eq 0 ]] && { echo "Usage: $0 logs <service>"; exit 1; }
      do_logs "$1"
      ;;
    *)
      echo "Usage: $0 [up|down|ps|status|start|stop|restart|rebuild|logs]"
      echo "  Services: backend frontend ai-writing ai-speaking ai-agent ai-import chroma mysql"
      exit 1
      ;;
  esac
fi