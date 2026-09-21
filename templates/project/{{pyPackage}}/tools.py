"""The tools behind {{title}}.

Two tools, showing the two directions an MCP App moves in:

* ``{{toolName}}`` — the model calls it; the host renders the UI resource
  named in its ``app=`` config and hands the result to the app's
  ``ontoolresult`` handler.
* ``{{refreshToolName}}`` — the *app* calls it via ``callServerTool``.
  ``visibility=["app"]`` keeps it out of the model's tool list, which is
  what you want for buttons: a refresh action is not a thing the model
  should decide to invoke on its own.

Replace ``_load_items`` with a real data source; the rest of the wiring stays.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastmcp import FastMCP
from fastmcp.apps.config import AppConfig
from pydantic import Field

from {{pyPackage}}.models import Item, PanelData
from {{pyPackage}}.ui import RESOURCE_URI

# Stand-in data so the scaffold runs with no external services. Replace it.
_SAMPLE = [
    ("Ingest pipeline", "Streaming source, 12k events/min", 0.94),
    ("Schema registry", "3 subjects pending approval", 0.81),
    ("Nightly rollup", "Last run 04:12 UTC, 1m 38s", 0.67),
    ("Access reviews", "6 grants expiring this week", 0.52),
]


def _load_items(query: str, limit: int) -> list[Item]:
    """Return items matching ``query``. Swap this for real I/O."""
    needle = query.strip().lower()

    matches = [
        Item(
            id=f"item-{index}",
            title=title,
            detail=detail,
            score=score,
        )
        for index, (title, detail, score) in enumerate(_SAMPLE)
        # An empty query means "everything"; otherwise match on either field.
        if not needle or needle in title.lower() or needle in detail.lower()
    ]
    return matches[:limit]


def _build_panel(query: str, limit: int) -> PanelData:
    return PanelData(
        query=query,
        generated_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        items=_load_items(query, limit),
    )


def register_tools(mcp: FastMCP) -> None:
    """Register this app's tools on ``mcp``."""

    @mcp.tool(
        name="{{toolName}}",
        title="{{title}}",
        description=(
            "Open the {{title}} panel. Returns matching items and renders them "
            "as an interactive view in hosts that support MCP Apps. Use this "
            "when the user wants to browse or explore results rather than read "
            "a single answer."
        ),
        annotations={"readOnlyHint": True, "openWorldHint": False},
        # Binds this tool to the UI resource. Both audiences see it: the model
        # may call it, and the app may call it again to re-query.
        app=AppConfig(resource_uri=RESOURCE_URI, visibility=["model", "app"]),
    )
    async def {{toolName}}(
        query: Annotated[
            str,
            Field(description="Text to filter items by. Empty returns everything."),
        ] = "",
        limit: Annotated[
            int,
            Field(description="Maximum number of items to return.", ge=1, le=50),
        ] = 10,
    ) -> PanelData:
        # Add a `ctx: Context` parameter here for progress reporting,
        # sampling or elicitation — FastMCP injects it automatically.
        return _build_panel(query, limit)

    @mcp.tool(
        name="{{refreshToolName}}",
        title="Refresh {{title}}",
        description="Re-fetch items for the {{title}} panel.",
        annotations={"readOnlyHint": True, "openWorldHint": False},
        # App-only: the UI's refresh button calls this, the model never sees it.
        app=AppConfig(visibility=["app"]),
    )
    async def {{refreshToolName}}(
        query: Annotated[str, Field(description="Text to filter items by.")] = "",
        limit: Annotated[
            int,
            Field(description="Maximum number of items to return.", ge=1, le=50),
        ] = 10,
    ) -> PanelData:
        return _build_panel(query, limit)
