"""{{title}} — an MCP App served by FastMCP.

Deliberately empty of imports. ``server/app.py`` builds a server at module
level so `fastmcp run server/app.py` can find it, and re-exporting that here
would make merely importing ``server.models`` construct a server — which
matters as soon as ``create_server()`` grows startup work like opening a
database connection.

Import what you need from the module that defines it::

    from server.app import create_server, mcp
"""
