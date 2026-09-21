"""The FastMCP server for {{title}}."""

from __future__ import annotations

from fastmcp import FastMCP

from {{pyPackage}}.tools import register_tools
from {{pyPackage}}.ui import register_ui


def create_server() -> FastMCP:
    """Build the server with its tools and UI resource registered."""
    mcp = FastMCP(
        name="{{slug}}",
        instructions=(
            "{{title}} renders its results as an interactive panel. "
            "Call {{toolName}} when the user wants to browse items."
        ),
    )

    register_ui(mcp)
    register_tools(mcp)
    return mcp


# Module-level instance so `fastmcp run {{pyPackage}}/server.py` and
# `fastmcp dev inspector {{pyPackage}}/server.py` can find it by name.
mcp = create_server()
