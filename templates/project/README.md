# {{title}}

An **MCP App**: a FastMCP server in Python whose tool renders an interactive
React UI inside the host, instead of returning text the model has to describe.

```
model calls {{toolName}}
        │
        ▼
FastMCP returns PanelData ──────────────┐
        │                               │
        │ tool _meta.ui.resourceUri     │ tool result
        ▼                               ▼
host reads {{resourceUri}}   ──►   iframe runs the bundled UI
   (text/html;profile=mcp-app)          │
                                        ▼
                             app.ontoolresult(data) → render
```

## Requirements

- Python 3.10+ and [uv](https://docs.astral.sh/uv/)
- Node.js 18+

## Getting started

```bash
uv sync                      # Python dependencies
npm install --prefix ui      # UI dependencies
npm run build --prefix ui    # bundle the UI into ui/dist/index.html
uv run {{slug}} --http       # serve on http://127.0.0.1:8000/mcp
```

The UI **must be built** before the server can serve it. Until it is, the
resource returns a placeholder page telling you so.

## Project layout

```
{{pyPackage}}/
  __main__.py   entry point: stdio by default, --http for streamable HTTP
  server.py     builds the FastMCP instance
  tools.py      the two tools — replace _load_items with your data
  ui.py         registers the ui:// resource that serves the bundle
  models.py     Pydantic payloads (mirror of ui/src/types.ts)
ui/
  src/useMcpApp.ts   all MCP Apps SDK wiring: handlers, host context, actions
  src/App.tsx        the view
  src/types.ts       payload shape + runtime validation
  vite.config.ts     single-file bundling
tests/
  test_app_wiring.py asserts the tool ↔ resource link and mime type
```

## How the two halves connect

Three things make this an MCP App:

1. **The resource** carries the HTML, declared with `app=AppConfig()`:

   ```python
   @mcp.resource(uri="{{resourceUri}}", app=AppConfig())
   def {{pyPackage}}_ui() -> str: ...
   ```

   `app=AppConfig()` is what sets the mime type to
   `text/html;profile=mcp-app` — you no longer write that string yourself.

2. **The tool** names that resource, which is how the host knows what to render:

   ```python
   @mcp.tool(app=AppConfig(resource_uri=RESOURCE_URI, visibility=["model", "app"]))
   ```

3. **The bundle is a single file.** The host injects the resource body into a
   sandboxed iframe with no origin to resolve `<script src>` against, so
   `vite-plugin-singlefile` inlines all JS and CSS into `ui/dist/index.html`.

## Tool visibility

`visibility` decides who may call a tool:

| Value                | Meaning                                                  |
| -------------------- | -------------------------------------------------------- |
| `["model", "app"]`   | Default. The model and the UI can both call it.           |
| `["app"]`            | UI only — refresh buttons, form submits, pagination.      |
| `["model"]`          | Model only.                                               |

`{{refreshToolName}}` is `["app"]`, so the model never decides on its own to
refresh the panel; the button does.

## What the UI can do

All of it lives in `ui/src/useMcpApp.ts`:

| Capability              | Call                                | Used for                             |
| ----------------------- | ----------------------------------- | ------------------------------------ |
| Receive the tool result | `app.ontoolresult`                  | Initial render                       |
| Stream arguments        | `app.ontoolinputpartial`            | Progress while the model generates   |
| Call back into Python   | `app.callServerTool()`              | Refresh, pagination, form submits    |
| Speak in the chat       | `app.sendMessage()`                 | "Ask about this"                     |
| Inform the model quietly| `app.updateModelContext()`          | Tell it what the user selected       |
| Go fullscreen           | `app.requestDisplayMode()`          | Expand from inline                   |
| Match the host's design | `useHostStyles(app)`                | CSS variables, fonts, light/dark     |
| Debug inside the host   | `app.sendLog()`                     | Logs the host surfaces               |

> **Register every handler before connecting.** `useApp`'s `onAppCreated` runs
> after the app is constructed but before `connect()`, which is the only
> window where handlers are guaranteed to catch the opening notifications.

## Development loop

Two terminals:

```bash
npm run watch --prefix ui    # rebuild ui/dist/index.html on save
uv run {{slug}} --http       # the server re-reads the bundle per request
```

`ui.py` reads the file on each request, so a UI change needs no server
restart — just reload the app in your host.

`npm run dev --prefix ui` also works for pure layout and CSS work, but there
is no host in that mode: nothing connects, so no data arrives and the app
stays on "Connecting…".

### Inspecting the server

```bash
uv run fastmcp dev inspector {{pyPackage}}/server.py
```

### Tests

```bash
uv run pytest
```

## Connecting a host

**stdio** — for desktop hosts that launch the server themselves:

```json
{
  "mcpServers": {
    "{{slug}}": {
      "command": "uv",
      "args": ["run", "--directory", "/absolute/path/to/{{slug}}", "{{slug}}"]
    }
  }
}
```

**HTTP** — for hosts that connect to a running server:

```
http://127.0.0.1:8000/mcp
```

The UI only renders in hosts that implement the MCP Apps extension. Elsewhere
the tool still works and returns its JSON, which is why `PanelData` should
stay readable on its own.

## Making it yours

1. Replace `_load_items` in `{{pyPackage}}/tools.py` with a real data source.
2. Change `PanelData` / `Item` in `models.py` **and** `ui/src/types.ts`
   together — `isPanelData` will reject payloads that only changed on one side.
3. Rewrite `ui/src/App.tsx`.
4. If the UI needs to reach an external origin, declare it — a sandboxed
   iframe blocks anything undeclared:

   ```python
   from fastmcp.apps.config import AppConfig, ResourceCSP

   app=AppConfig(csp=ResourceCSP(connect_domains=["https://api.example.com"]))
   ```
