import httpx

JAVA_BACKEND_URL = "http://localhost:8080"


async def check_permission(table: str, role: str = "MANAGER") -> bool:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(
                f"{JAVA_BACKEND_URL}/api/internal/agent/query",
                json={"table": table, "user_role": role},
            )
            data = resp.json()
            return data.get("allowed", False)
    except Exception:
        return True


async def execute_query(sql: str, params: dict = None, table: str = "",
                        limit: int = 100, role: str = "MANAGER") -> list[dict]:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{JAVA_BACKEND_URL}/api/internal/agent/query/execute",
            json={
                "table": table,
                "sql": sql,
                "params": params or {},
                "limit": limit,
                "user_role": role,
            },
        )
        data = resp.json()
        if not data.get("success"):
            raise PermissionError(data.get("error", "Query failed"))
        return data.get("data", [])
