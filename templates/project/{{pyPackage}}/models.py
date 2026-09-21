"""Payload models shared by the tools and the UI.

These models are the contract between the Python server and the React app.
FastMCP turns the return annotation into the tool's ``outputSchema``, and
serialises the value into both ``structuredContent`` and a JSON text block —
so the UI can read whichever the host hands it.

Keep this file in sync with ``ui/src/types.ts``.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class Item(BaseModel):
    """One row rendered as a card in the UI."""

    id: str = Field(description="Stable identifier for the item")
    title: str = Field(description="Short human-readable label")
    detail: str = Field(description="Supporting line shown under the title")
    score: float = Field(description="Relevance score between 0 and 1")


class PanelData(BaseModel):
    """The full payload the UI renders."""

    query: str = Field(description="The query these results correspond to")
    generated_at: str = Field(description="ISO-8601 timestamp of this result")
    items: list[Item] = Field(description="Items to display")
