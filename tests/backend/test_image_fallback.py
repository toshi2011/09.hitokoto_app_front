# === tests/backend/test_image_fallback.py ===
import pytest
from app.infrastructure.image_service import FallbackImageService, DummyImageService

@pytest.mark.asyncio
async def test_fallback_returns_first_available(monkeypatch):
    class AlwaysService(DummyImageService):
        async def generate(self, text: str, tags=None):
            return "http://example.com/ok.jpg"

    service = FallbackImageService([DummyImageService(), AlwaysService()])
    url = await service.generate("test")
    assert url.endswith("ok.jpg")