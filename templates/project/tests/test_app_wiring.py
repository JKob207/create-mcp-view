"""Checks the wiring that makes this an MCP App rather than a plain server.

These assertions are cheap and catch the failure modes that are otherwise
only visible as a blank panel inside a host: a tool that points at no
resource, a resource served with the wrong mime type, or the two drifting
apart after a rename.
"""

from __future__ import annotations

import pytest
from fastmcp import Client

from server.app import create_server
from server.ui import RESOURCE_URI

UI_MIME_TYPE = "text/html;profile=mcp-app"


@pytest.fixture
def mcp():
    return create_server()


async def test_tool_points_at_the_ui_resource(mcp):
    async with Client(mcp) as client:
        tools = {tool.name: tool for tool in await client.list_tools()}

    assert "{{toolName}}" in tools
    ui_meta = (tools["{{toolName}}"].meta or {}).get("ui", {})
    assert ui_meta.get("resourceUri") == RESOURCE_URI


async def test_ui_resource_uses_the_mcp_app_mime_type(mcp):
    async with Client(mcp) as client:
        resources = {str(res.uri): res for res in await client.list_resources()}

        assert RESOURCE_URI in resources
        assert resources[RESOURCE_URI].mime_type == UI_MIME_TYPE

        contents = await client.read_resource(RESOURCE_URI)

    assert contents[0].mime_type == UI_MIME_TYPE
    assert "<html" in contents[0].text.lower()


async def test_tool_returns_renderable_data(mcp):
    async with Client(mcp) as client:
        result = await client.call_tool("{{toolName}}", {"message": "Hello."})

    # The UI validates on this exact key — see ui/src/types.ts.
    assert result.structured_content == {"message": "Hello."}
