"""The FastMCP server for {{title}}."""

from __future__ import annotations

from fastmcp import FastMCP

from server.tools import register_tools
from server.ui import register_ui


def create_server() -> FastMCP:
    """Build the server with its tool and UI resource registered."""
    mcp = FastMCP(
        name="{{slug}}",
        instructions=(
            "{{title}} renders an interactive panel. Call {{toolName}} when "
            "the user wants to open it."
        ),
    )

    register_ui(mcp)
    register_tools(mcp)
    return mcp


# Module-level instance so `fastmcp run server/app.py` and
# `fastmcp dev inspector server/app.py` can find it by name.
mcp = create_server()
