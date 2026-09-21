"""The payload shared by the server and the UI.

FastMCP turns the return annotation into the tool's ``outputSchema`` and
serialises the value into both ``structuredContent`` and a JSON text block,
so the UI can read whichever form the host hands it.

Keep this in sync with ``ui/src/types.ts``.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class AppState(BaseModel):
    """What the panel renders."""

    message: str = Field(description="Line shown under the app title")
