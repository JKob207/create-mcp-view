# create-mcp-view

Scaffold an **MCP App** — a FastMCP server in Python whose tool renders an
interactive React UI inside the host, instead of returning text the model has
to describe.

```bash
npm create mcp-view "Weather Radar"
```

You get a project that runs immediately: install, build, serve, and the tool
renders a working panel in any MCP Apps host.

## What it generates

```
weather-radar/
├── weather_radar/
│   ├── __main__.py      stdio by default, --http for streamable HTTP
│   ├── server.py        the FastMCP instance
│   ├── tools.py         two tools: one model-facing, one app-only
│   ├── ui.py            the ui:// resource serving the bundle
│   └── models.py        Pydantic payloads
├── ui/
│   ├── src/useMcpApp.ts all SDK wiring in one hook
│   ├── src/App.tsx      the view
│   ├── src/types.ts     payload shape + runtime validation
│   └── vite.config.ts   single-file bundling
├── tests/
│   └── test_app_wiring.py
├── pyproject.toml
└── README.md
```

## Pre-wired

- **`vite-plugin-singlefile`** — the host injects the resource body into a
  sandboxed iframe with no origin to resolve `<script src>` against, so the
  whole bundle has to be one self-contained HTML file.
- **The correct mime type** — `text/html;profile=mcp-app`, set by
  `app=AppConfig()` on the resource rather than written by hand.
- **The tool ↔ resource link** — `app=AppConfig(resource_uri=...)`, the
  `_meta.ui.resourceUri` that tells the host what to render.
- **Tool visibility** — a model-facing tool and an app-only tool
  (`visibility=["app"]`) that the UI's refresh button calls.
- **Every SDK lifecycle handler**, registered before `connect()`:
  `ontoolresult`, `ontoolinput`, `ontoolinputpartial`, `ontoolcancelled`,
  `onhostcontextchanged`, `onteardown`, `onerror`.
- **Host theming** — `useHostStyles` plus a stylesheet built on the host's
  CSS variables, with fallbacks for every one.
- **Safe-area insets**, auto-resize, and a fullscreen toggle gated on
  `availableDisplayModes`.
- **Wiring tests** that fail if the tool and resource ever drift apart.

## Installation

`create-mcp-view` is published on npm. No global install needed — `npm create`
fetches and runs it:

```bash
npm create mcp-view "Weather Radar"
```

Run it with no arguments for an interactive prompt.

## Usage

```
create-mcp-view [name] [options]

  --dir <path>     Parent directory to create the app in (default: cwd)
  --install        Install Python and npm dependencies after scaffolding
  --no-install     Skip dependency installation
  -y, --yes        Accept defaults, no prompts (implies --install)
  -h, --help       Show help
```

When invoking through `npm create`, separate the flags with `--`:

```bash
npm create mcp-view "Weather Radar" -- --dir ~/projects --yes
```

The app name is normalized into every form the project needs — directory and
npm name (`weather-radar`), Python package (`weather_radar`), tool names
(`show_weather_radar`), and resource URI (`ui://weather-radar/main.html`).
Python keywords and leading digits are handled.

## Requirements

For the scaffolder: **Node 18+**.
For the generated project: **Python 3.10+**, [**uv**](https://docs.astral.sh/uv/), **Node 18+**.

## Versions targeted

| Piece | Version |
| ----- | ------- |
| `fastmcp` | 4.0.5+ |
| `@modelcontextprotocol/ext-apps` | 2.0.0 |
| MCP Apps spec | 2026-01-26 |
| React / Vite | 19 / 8 |

The generated server uses FastMCP 4's first-class MCP Apps support
(`app=AppConfig(...)` on tools and resources) rather than hand-written
`meta={"ui": {...}}` dictionaries.

## Developing this scaffolder

Templates live in `templates/project/`. `{{variable}}` placeholders are
substituted in both file contents and path names, so a directory can be named
after a variable too.

Available variables are whatever `deriveNames()` in `src/names.js` returns:
`appName`, `slug`, `pyName`, `title`, `toolName`, `resourceUri`, `year`. An
unknown placeholder throws at render time rather than emitting `{{typo}}` into
someone's project.

`pyName` is the app's snake_case identifier — it appears in tool names, not as
a directory. The Python package is always `server/`, so generated projects have
the same layout whatever the app is called.

Files named `gitignore` are renamed to `.gitignore` on the way out, because
npm strips dotfiles from published packages.

To verify a change locally before publishing a new version, scaffold and build
straight from the repo instead of going through the registry:

```bash
node bin/cli.js "Smoke Test" --dir /tmp --no-install
cd /tmp/smoke-test
npm install --prefix ui && npm run build --prefix ui
uv sync && uv run pytest
```

## License

MIT