"""The tool behind {{title}}.

``app=AppConfig(resource_uri=...)`` is what makes this an MCP App rather than
an ordinary tool: it sets the ``_meta.ui.resourceUri`` that tells the host
which UI resource to render alongside the result.

The result reaches the UI through the app's ``ontoolresult`` handler.
"""

from __future__ import annotations

from typing import Annotated

from fastmcp import FastMCP
from fastmcp.apps.config import AppConfig
from pydantic import Field

from server.models import AppState
from server.ui import RESOURCE_URI


def register_tools(mcp: FastMCP) -> None:
    """Register this app's tools on ``mcp``."""

    @mcp.tool(
        name="{{toolName}}",
        title="{{title}}",
        description=(
            "Open the {{title}} panel — an interactive view rendered in hosts "
            "that support MCP Apps."
        ),
        annotations={"readOnlyHint": True, "openWorldHint": False},
        # Binds the tool to the UI resource. Both audiences see it: the model
        # may call it, and the app may call it again itself.
        app=AppConfig(resource_uri=RESOURCE_URI, visibility=["model", "app"]),
    )
    async def {{toolName}}(
        message: Annotated[
            str,
            Field(description="Line to show under the title in the panel."),
        ] = "Ready.",
    ) -> AppState:
        # Add a `ctx: Context` parameter here for progress reporting,
        # sampling or elicitation — FastMCP injects it automatically.
        return AppState(message=message)
