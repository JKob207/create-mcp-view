"""Entry point: ``uv run {{slug}}``.

Defaults to stdio, which is what desktop MCP hosts launch. Pass ``--http``
for a streamable-HTTP server, which is what browser-based hosts and the
MCP Inspector connect to.
"""

from __future__ import annotations

import argparse

from {{pyPackage}}.server import mcp


def main() -> None:
    parser = argparse.ArgumentParser(prog="{{slug}}", description="{{title}} MCP server")
    parser.add_argument(
        "--http",
        action="store_true",
        help="Serve over streamable HTTP instead of stdio.",
    )
    parser.add_argument("--host", default="127.0.0.1", help="HTTP bind host.")
    parser.add_argument("--port", type=int, default=8000, help="HTTP bind port.")
    args = parser.parse_args()

    if args.http:
        mcp.run(transport="http", host=args.host, port=args.port)
    else:
        mcp.run()


if __name__ == "__main__":
    main()
