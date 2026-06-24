import time
from threading import Lock

_progress_store: dict[str, dict] = {}
_store_lock = Lock()
TTL = 600  # 10 phút


def _key(session_id: int, agent_name: str) -> str:
    return f"{session_id}:{agent_name}"


def set_plan(session_id: int, agent_name: str, plan: dict):
    with _store_lock:
        k = _key(session_id, agent_name)
        now = time.time()
        if k not in _progress_store:
            _progress_store[k] = {"plan": plan, "steps": {}, "ttl": now + TTL}
        else:
            _progress_store[k]["plan"] = plan
            _progress_store[k]["ttl"] = now + TTL


def set_progress(session_id: int, agent_name: str, tool_name: str,
                 step: int, total: int, status: str = "processing",
                 model: str = "", current_label: str = ""):
    with _store_lock:
        k = _key(session_id, agent_name)
        now = time.time()
        if k not in _progress_store:
            _progress_store[k] = {"plan": None, "steps": {}, "ttl": now + TTL}
        _progress_store[k]["steps"][step] = {
            "tool": tool_name,
            "status": status,
            "label": current_label,
            "timestamp": now,
        }
        _progress_store[k]["current_step"] = step
        _progress_store[k]["total_steps"] = total
        _progress_store[k]["model"] = model
        _progress_store[k]["ttl"] = now + TTL


def get_progress(session_id: int, agent_name: str) -> dict | None:
    with _store_lock:
        k = _key(session_id, agent_name)
        data = _progress_store.get(k)
        if not data:
            return None
        if time.time() > data.get("ttl", 0):
            del _progress_store[k]
            return None
        return {
            "plan": data.get("plan"),
            "steps": data.get("steps", {}),
            "current_step": data.get("current_step", 0),
            "total_steps": data.get("total_steps", 0),
            "model": data.get("model", ""),
        }


def update_step_status(session_id: int, agent_name: str, step: int, status: str, preview: str = ""):
    with _store_lock:
        k = _key(session_id, agent_name)
        data = _progress_store.get(k)
        if data and step in data.get("steps", {}):
            data["steps"][step]["status"] = status
            if preview:
                data["steps"][step]["preview"] = preview
            data["ttl"] = time.time() + TTL


def get_all_progress(session_id: int) -> dict:
    with _store_lock:
        result = {}
        now = time.time()
        for k, v in list(_progress_store.items()):
            if k.startswith(f"{session_id}:"):
                if now > v.get("ttl", 0):
                    del _progress_store[k]
                    continue
                agent_name = k.split(":", 1)[1]
                result[agent_name] = {
                    "plan": v.get("plan"),
                    "steps": v.get("steps", {}),
                    "current_step": v.get("current_step", 0),
                    "total_steps": v.get("total_steps", 0),
                    "model": v.get("model", ""),
                }
        return result


def clear_progress(session_id: int, agent_name: str | None = None):
    with _store_lock:
        if agent_name:
            _progress_store.pop(_key(session_id, agent_name), None)
        else:
            for k in list(_progress_store.keys()):
                if k.startswith(f"{session_id}:"):
                    del _progress_store[k]
