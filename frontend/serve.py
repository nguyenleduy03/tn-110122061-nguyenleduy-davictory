import asyncio
import mimetypes
import os
import re
import subprocess
from pathlib import Path

import httpx

DIST_DIR = Path(__file__).parent / "dist"
API_TARGET = "http://localhost:8080"
AGENT_TARGET = "http://localhost:5187"
PORT = 5173


async def handle_client(reader, writer):
    request_line = await reader.readline()
    if not request_line:
        writer.close()
        return

    method, path, _ = request_line.decode().strip().split(" ", 2)
    headers = {}
    while True:
        line = await reader.readline()
        if line == b"\r\n":
            break
        key, _, value = line.decode().strip().partition(": ")
        headers[key.lower()] = value

    content_length = int(headers.get("content-length", 0))
    body = await reader.readexactly(content_length) if content_length > 0 else b""

    if re.match(r"^/api/agent/sessions/\d+/stream$", path):
        await proxy_sse_direct(method, path, headers, writer)
    elif path.startswith("/api/"):
        await proxy_api(method, path, headers, body, writer)
    elif path.startswith("/uploads/"):
        await proxy_uploads(method, path, headers, writer)
    else:
        await serve_static(path, writer)


_FILE_EXT = re.compile(r"\.[a-zA-Z0-9]{2,5}(?:\?.*)?$")


async def serve_static(path, writer):
    clean_path = path.split("?")[0].split("#")[0]

    if clean_path == "/":
        clean_path = "/index.html"

    file_path = DIST_DIR / clean_path.lstrip("/")
    if file_path.exists() and file_path.is_file():
        content_type, _ = mimetypes.guess_type(str(file_path))
        if content_type is None:
            content_type = "application/octet-stream"

        content = file_path.read_bytes()
        resp = (
            f"HTTP/1.1 200 OK\r\n"
            f"Content-Type: {content_type}\r\n"
            f"Content-Length: {len(content)}\r\n"
            f"Cache-Control: public, max-age=3600\r\n"
            f"Access-Control-Allow-Origin: *\r\n"
            f"\r\n"
        ).encode() + content
        writer.write(resp)
    elif _FILE_EXT.search(clean_path):
        writer.write(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n")
    else:
        # SPA fallback: serve index.html
        index_path = DIST_DIR / "index.html"
        if index_path.exists():
            content = index_path.read_bytes()
            resp = (
                f"HTTP/1.1 200 OK\r\n"
                f"Content-Type: text/html; charset=utf-8\r\n"
                f"Content-Length: {len(content)}\r\n"
                f"\r\n"
            ).encode() + content
            writer.write(resp)
        else:
            writer.write(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n")

    await writer.drain()
    writer.close()


async def proxy_uploads(method, path, headers, writer):
    """Proxy /uploads/ to Python agent (image files)."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(f"{AGENT_TARGET}{path}")
            content_type = resp.headers.get("content-type", "image/jpeg")
            writer.write(
                f"HTTP/1.1 {resp.status_code} OK\r\n"
                f"Content-Type: {content_type}\r\n"
                f"Content-Length: {len(resp.content)}\r\n"
                f"Cache-Control: public, max-age=86400\r\n"
                f"Access-Control-Allow-Origin: *\r\n"
                f"\r\n".encode() + resp.content
            )
    except Exception as e:
        writer.write(f"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n".encode())
    await writer.drain()
    writer.close()


async def proxy_sse_direct(method, path, headers, writer):
    """Proxy SSE stream directly to Python agent, bypass Java."""
    try:
        async with httpx.AsyncClient(timeout=None) as client:
            req_headers = {"Accept": "text/event-stream"}
            if "authorization" in headers:
                req_headers["Authorization"] = headers["authorization"]

            async with client.stream(method, f"{AGENT_TARGET}{path}", headers=req_headers) as resp:
                writer.write(
                    f"HTTP/1.1 {resp.status_code} OK\r\n"
                    f"Content-Type: text/event-stream\r\n"
                    f"Cache-Control: no-cache\r\n"
                    f"Connection: keep-alive\r\n"
                    f"Access-Control-Allow-Origin: *\r\n"
                    f"\r\n".encode()
                )
                async for chunk in resp.aiter_bytes():
                    try:
                        writer.write(chunk)
                        await writer.drain()
                    except Exception:
                        break
    except Exception as e:
        try:
            error = f'data: {{"type":"error","error":"{str(e)}"}}\n\n'
            writer.write(f"HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/event-stream\r\n\r\n{error}".encode())
            await writer.drain()
        except Exception:
            pass
    finally:
        try:
            writer.close()
        except Exception:
            pass


async def proxy_api(method, path, headers, body, writer):
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            target_headers = {
                "Content-Type": headers.get("content-type", "application/json"),
                "Accept": "text/event-stream,application/json",
            }
            if "authorization" in headers:
                target_headers["Authorization"] = headers["authorization"]

            resp = await client.request(
                method=method,
                url=f"{API_TARGET}{path}",
                headers=target_headers,
                content=body,
            )

            if "text/event-stream" in resp.headers.get("content-type", ""):
                writer.write(
                    f"HTTP/1.1 {resp.status_code} OK\r\n"
                    f"Content-Type: text/event-stream\r\n"
                    f"Cache-Control: no-cache\r\n"
                    f"Connection: keep-alive\r\n"
                    f"Access-Control-Allow-Origin: *\r\n"
                    f"\r\n".encode()
                )
                async for chunk in resp.aiter_bytes():
                    writer.write(chunk)
                    await writer.drain()
            else:
                response_headers = (
                    f"HTTP/1.1 {resp.status_code} {'OK' if resp.status_code < 400 else 'Error'}\r\n"
                    f"Content-Type: {resp.headers.get('content-type', 'application/json')}\r\n"
                    f"Content-Length: {len(resp.content)}\r\n"
                    f"Access-Control-Allow-Origin: *\r\n"
                    f"\r\n"
                )
                writer.write(response_headers.encode() + resp.content)

    except Exception as e:
        error = f'{{"error": "Proxy error: {str(e)}"}}'.encode()
        writer.write(
            f"HTTP/1.1 502 Bad Gateway\r\n"
            f"Content-Type: application/json\r\n"
            f"Content-Length: {len(error)}\r\n"
            f"\r\n".encode() + error
        )

    await writer.drain()
    writer.close()


async def main():
    server = await asyncio.start_server(handle_client, "0.0.0.0", PORT)
    addr = server.sockets[0].getsockname()
    print(f"Serving frontend from {DIST_DIR} on http://{addr[0]}:{addr[1]}")
    print(f"API proxy to {API_TARGET}")

    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
