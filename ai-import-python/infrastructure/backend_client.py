"""HTTP client to call DAVictory Backend REST APIs."""

import httpx
from loguru import logger

from config import get_settings


class BackendClientError(Exception):
    pass


class BackendClient:
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.backend_url

    async def _post(self, path: str, body: dict) -> dict:
        url = f"{self.base_url}{path}"
        async with httpx.AsyncClient(timeout=self.settings.backend_timeout) as client:
            try:
                resp = await client.post(url, json=body)
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPStatusError as e:
                error_body = e.response.text[:500]
                logger.error(f"Backend error {e.response.status_code}: {error_body}")
                raise BackendClientError(f"Backend returned {e.response.status_code}: {error_body}")
            except httpx.RequestError as e:
                logger.error(f"Backend request failed: {e}")
                raise BackendClientError(f"Backend unreachable: {e}")

    async def _get(self, path: str, params: dict | None = None) -> dict:
        url = f"{self.base_url}{path}"
        async with httpx.AsyncClient(timeout=self.settings.backend_timeout) as client:
            try:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPStatusError as e:
                raise BackendClientError(f"Backend returned {e.response.status_code}")
            except httpx.RequestError as e:
                raise BackendClientError(f"Backend unreachable: {e}")

    async def save_test(self, test_data: dict, user_id: int) -> dict:
        """Call internal endpoint POST /api/internal/ai/import/save-test to create a test."""
        test_data["createdByUserId"] = user_id
        test_data["createVersion"] = True
        logger.info(f"Saving test: {test_data.get('title', 'Untitled')}")
        return await self._post("/api/internal/ai/import/save-test", test_data)

    async def get_master_sessions(self, test_type: str = "ACADEMIC") -> list[dict]:
        """Get master session templates."""
        result = await self._get("/api/tests/sessions/master", {"testType": test_type})
        return result if isinstance(result, list) else []

    async def get_question_types(self) -> list[dict]:
        """Get all question types."""
        result = await self._get("/api/tests/question-types")
        return result if isinstance(result, list) else []
