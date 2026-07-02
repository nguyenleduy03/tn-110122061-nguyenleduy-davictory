#!/bin/bash
# DAVictory Python AI Services Management Script
# Usage: ./manage.sh {start|stop|restart|status|log} {writing|speaking|all}

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_DIR="$PROJECT_DIR/.run"

mkdir -p "$PID_DIR"

WRITING_DIR="$PROJECT_DIR/ai-writing-python"
SPEAKING_DIR="$PROJECT_DIR/ai-speaking-python"

WRITING_PORT=5182
SPEAKING_PORT=5181

start_service() {
    local name=$1 dir=$2 port=$3
    local pid_file="$PID_DIR/ai-${name}-python.pid"
    local log_file="$PID_DIR/ai-${name}-python.log"

    if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        echo "[$name] Already running (PID $(cat $pid_file))"
        return
    fi

    echo "[$name] Starting on port $port..."
    cd "$dir"
    nohup .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port "$port" --workers 1 \
        --log-level info > "$log_file" 2>&1 &
    echo $! > "$pid_file"
    sleep 2
    if kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        echo "[$name] Started successfully (PID $(cat $pid_file))"
    else
        echo "[$name] Failed to start. Check $log_file"
    fi
}

stop_service() {
    local name=$1
    local pid_file="$PID_DIR/ai-${name}-python.pid"

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "[$name] Stopping (PID $pid)..."
            kill "$pid" 2>/dev/null || true
            sleep 1
            kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$pid_file"
        echo "[$name] Stopped"
    else
        echo "[$name] Not running"
    fi
}

status_service() {
    local name=$1
    local pid_file="$PID_DIR/ai-${name}-python.pid"
    if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
        echo "[$name] RUNNING (PID $(cat $pid_file))"
    else
        echo "[$name] STOPPED"
    fi
}

case "${1:-}" in
    start)
        case "${2:-all}" in
            writing) start_service "writing" "$WRITING_DIR" "$WRITING_PORT" ;;
            speaking) start_service "speaking" "$SPEAKING_DIR" "$SPEAKING_PORT" ;;
            all)
                start_service "writing" "$WRITING_DIR" "$WRITING_PORT"
                start_service "speaking" "$SPEAKING_DIR" "$SPEAKING_PORT"
                ;;
            *) echo "Usage: $0 start {writing|speaking|all}" ;;
        esac
        ;;
    stop)
        case "${2:-all}" in
            writing) stop_service "writing" ;;
            speaking) stop_service "speaking" ;;
            all)
                stop_service "writing"
                stop_service "speaking"
                ;;
            *) echo "Usage: $0 stop {writing|speaking|all}" ;;
        esac
        ;;
    restart)
        case "${2:-all}" in
            writing) stop_service "writing"; start_service "writing" "$WRITING_DIR" "$WRITING_PORT" ;;
            speaking) stop_service "speaking"; start_service "speaking" "$SPEAKING_DIR" "$SPEAKING_PORT" ;;
            all)
                stop_service "writing"; stop_service "speaking"
                start_service "writing" "$WRITING_DIR" "$WRITING_PORT"
                start_service "speaking" "$SPEAKING_DIR" "$SPEAKING_PORT"
                ;;
            *) echo "Usage: $0 restart {writing|speaking|all}" ;;
        esac
        ;;
    status)
        status_service "writing"
        status_service "speaking"
        ;;
    logs)
        case "${2:-writing}" in
            writing) tail -f "$PID_DIR/ai-writing-python.log" ;;
            speaking) tail -f "$PID_DIR/ai-speaking-python.log" ;;
            *) echo "Usage: $0 logs {writing|speaking}" ;;
        esac
        ;;
    *)
        echo "DAVictory Python AI Services Manager"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs} {writing|speaking|all}"
        echo ""
        echo "Examples:"
        echo "  $0 start all       # Start both services"
        echo "  $0 stop writing    # Stop writing service"
        echo "  $0 restart all     # Restart both"
        echo "  $0 status          # Check status"
        echo "  $0 logs writing    # View writing logs"
        ;;
esac
