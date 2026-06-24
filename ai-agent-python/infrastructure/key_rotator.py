import os

from config import get_settings


class KeyRotator:
    def __init__(self):
        self._keys: list[str] = []
        self._index = 0
        self._load()

    def _load(self):
        s = get_settings()
        env_keys = os.environ.get("GROQ_API_KEYS", "")
        if env_keys:
            self._keys = [k.strip() for k in env_keys.split(",") if k.strip()]
            if self._keys:
                return
        self._keys = s.groq_key_list

    def get_key(self) -> str:
        if not self._keys:
            raise ValueError("No API keys configured. Set GROQ_API_KEYS or GROQ_API_KEY")
        key = self._keys[self._index]
        self._index = (self._index + 1) % len(self._keys)
        return key

    def key_count(self) -> int:
        return len(self._keys)

    def get_status(self) -> dict:
        return {
            "total_keys": len(self._keys),
            "current_index": self._index,
            "active_key_prefix": (self._keys[self._index % len(self._keys)][:15] + "...") if self._keys else "",
        }


_rotator: KeyRotator | None = None


def get_rotator() -> KeyRotator:
    global _rotator
    if _rotator is None:
        _rotator = KeyRotator()
    return _rotator
