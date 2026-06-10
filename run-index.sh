#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-5180}"
BASE_URL="http://localhost:$PORT"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; }

if ! curl -sf "$BASE_URL/api/ai/writing/result/0" &>/dev/null; then
  err "Service chưa chạy trên port $PORT"
  echo "  Chạy service trước: ./run-ai-writing.sh -b"
  exit 1
fi

info "Đang index vector store..."
RESP=$(curl -s -X POST "$BASE_URL/api/admin/ai/reindex")
echo -e "  ${YELLOW}Response:${NC} $RESP"

if echo "$RESP" | grep -q '"REINDEXED"'; then
  ok "Index thành công!"
else
  err "Index thất bại: $RESP"
  exit 1
fi
