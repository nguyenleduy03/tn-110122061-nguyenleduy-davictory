import asyncio
import json
import os
from typing import Any

try:
    import redis.asyncio as aioredis
    HAS_REDIS = True
except ImportError:
    HAS_REDIS = False


_redis = None
_in_memory_queues: dict[str, list] = {}
_in_memory_pubsub: dict[str, list[asyncio.Queue]] = {}


async def get_redis():
    global _redis
    if not HAS_REDIS:
        return None
    if _redis is None:
        import asyncio, os
        from config import get_settings
        redis_url = get_settings().redis_url or os.environ.get("REDIS_URL", "")
        if not redis_url:
            _redis = False
            return None
        try:
            _redis = aioredis.from_url(redis_url, decode_responses=True, socket_connect_timeout=2, socket_timeout=2)
            await asyncio.wait_for(_redis.ping(), timeout=2)
        except Exception:
            _redis = False
    return _redis if _redis else None


async def publish(channel: str, data: dict):
    r = await get_redis()
    if r:
        await r.publish(channel, json.dumps(data, ensure_ascii=False))
    else:
        if channel not in _in_memory_pubsub:
            _in_memory_pubsub[channel] = []
        for q in _in_memory_pubsub[channel]:
            await q.put(data)


async def subscribe(channel: str, timeout: float = 5) -> dict | None:
    r = await get_redis()
    if r:
        pubsub = r.pubsub()
        await pubsub.subscribe(channel)
        try:
            msg = await pubsub.get_message(timeout=timeout, ignore_subscribe_messages=True)
            if msg:
                return json.loads(msg["data"])
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
        return None
    else:
        q: asyncio.Queue = asyncio.Queue()
        if channel not in _in_memory_pubsub:
            _in_memory_pubsub[channel] = []
        _in_memory_pubsub[channel].append(q)
        try:
            try:
                return await asyncio.wait_for(q.get(), timeout=timeout)
            except asyncio.TimeoutError:
                return None
        finally:
            _in_memory_pubsub[channel].remove(q)


async def enqueue_task(queue: str, task: dict) -> str:
    r = await get_redis()
    task_id = task.get("task_id", "")
    if r:
        await r.lpush(queue, json.dumps(task, ensure_ascii=False))
    else:
        if queue not in _in_memory_queues:
            _in_memory_queues[queue] = []
        _in_memory_queues[queue].append(task)
    return task_id


async def dequeue_task(queue: str, timeout: float = 5) -> dict | None:
    r = await get_redis()
    if r:
        result = await r.brpop(queue, timeout=int(timeout))
        if result:
            return json.loads(result[1])
        return None
    else:
        q = _in_memory_queues.get(queue, [])
        if q:
            return q.pop(0)
        try:
            await asyncio.sleep(timeout)
        except asyncio.CancelledError:
            return None
        q = _in_memory_queues.get(queue, [])
        if q:
            return q.pop(0)
        return None


async def publish_result(channel: str, result: dict):
    await publish(channel, {"type": "result", "data": result})


async def subscribe_results(channel: str, callback, timeout: float = 30):
    deadline = asyncio.get_event_loop().time() + timeout
    while asyncio.get_event_loop().time() < deadline:
        msg = await subscribe(channel, timeout=min(5, deadline - asyncio.get_event_loop().time()))
        if msg:
            await callback(msg)
            if msg.get("type") == "result":
                return


async def subscribe_continuous(channel: str, callback) -> asyncio.Task:
    """Subscribe to a channel and call callback for every message. Runs until cancelled."""
    async def _listener():
        while True:
            try:
                msg = await subscribe(channel, timeout=5)
                if msg is not None:
                    await callback(msg)
            except asyncio.CancelledError:
                break
            except Exception:
                await asyncio.sleep(1)
    task = asyncio.create_task(_listener())
    return task
