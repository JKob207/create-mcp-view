"""Registration of the ``ui://`` resource that carries the bundled UI.

An MCP App is two halves joined by one string:

* a **resource** whose body is the app's HTML, served with the MCP Apps
  mime type ``text/html;profile=mcp-app``; and
* a **tool** whose ``_meta.ui.resourceUri`` points at that resource.

``app=AppConfig()`` on the resource is what sets the mime type — writing it
by hand is no longer necessary. Everything the UI needs (JS, CSS) is inlined
into this one file by ``vite-plugin-singlefile``, because the host renders
the resource body in a sandboxed iframe that cannot fetch sibling assets.
"""

from __future__ import annotations

from pathlib import Path

from fastmcp import FastMCP
from fastmcp.apps.config import AppConfig

# The single string that binds tool to resource. Imported by tools.py.
RESOURCE_URI = "{{resourceUri}}"

# vite-plugin-singlefile inlines the whole bundle into this one file.
UI_BUNDLE = Path(__file__).resolve().parent.parent / "ui" / "dist" / "index.html"

_NOT_BUILT_HTML = """<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>{{title}}</title></head>
  <body style="font-family: system-ui, sans-serif; padding: 24px; line-height: 1.5;">
    <h2 style="margin: 0 0 8px;">{{title}}</h2>
    <p style="margin: 0 0 16px;">The UI bundle has not been built yet.</p>
    <pre style="background: #f4f4f5; padding: 12px; border-radius: 6px;">npm install --prefix ui
npm run build --prefix ui</pre>
  </body>
</html>
"""


def register_ui(mcp: FastMCP) -> None:
    """Register the UI resource on ``mcp``."""

    @mcp.resource(
        uri=RESOURCE_URI,
        name="{{slug}}-ui",
        title="{{title}}",
        description="Interactive UI for {{title}}.",
        # Marks this resource as an MCP App and sets the mime type to
        # text/html;profile=mcp-app. Add csp=/permissions= here if the app
        # needs to reach external origins or use the camera, clipboard, etc.
        app=AppConfig(),
    )
    def {{pyPackage}}_ui() -> str:
        """Return the bundled single-file UI."""
        # Read on every request rather than at import time, so `vite build
        # --watch` is picked up without restarting the server.
        if not UI_BUNDLE.is_file():
            return _NOT_BUILT_HTML
        return UI_BUNDLE.read_text(encoding="utf-8")
