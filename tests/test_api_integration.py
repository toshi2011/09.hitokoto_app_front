# tests/test_api_integration.py
import pytest, httpx
from fastapi import status
from app.main import app
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_and_list():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        res = await ac.post("/phrases", json={"text": "テスト!"})
        assert res.status_code == status.HTTP_201_CREATED
        created = res.json()
        assert created["text"] == "テスト!"

        res2 = await ac.get("/phrases")
        lst = res2.json()
        assert any(p["phrase_id"] == created["phrase_id"] for p in lst)