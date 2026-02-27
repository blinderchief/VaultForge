"""CORS, rate-limiting, and API-key auth dependencies."""

from __future__ import annotations

import hmac
from typing import Annotated

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# ── Rate limiter (keyed by remote IP) ────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.rate_limit])

# ── API key auth (for internal agent endpoints) ─────────────────────
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def require_api_key(
    api_key: Annotated[str | None, Security(_api_key_header)] = None,
) -> str:
    """Validate the X-API-Key header against the configured secret."""
    if not settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="API key not configured on server",
        )
    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header",
        )
    if not hmac.compare_digest(api_key, settings.api_key):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key",
        )
    return api_key
