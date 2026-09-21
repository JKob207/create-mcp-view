# {{title}}

An **MCP App**: a FastMCP server in Python whose tool renders an interactive
React UI inside the host, instead of returning text the model has to describe.

```
model calls {{toolName}}
        │
        ▼
FastMCP returns AppState ───────────────┐
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
server/
  __main__.py   entry point: stdio by default, --http for streamable HTTP
  app.py        builds the FastMCP instance
  tools.py      the tool the model calls
  ui.py         registers the ui:// resource that serves the bundle
  models.py     Pydantic payload (mirror of ui/src/types.ts)
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
   def ui_resource() -> str: ...
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

## What the UI can do

The panel shows the app title, the server's message, and two buttons —
fullscreen, and one that puts a question in the conversation. All of the SDK
wiring lives in `ui/src/useMcpApp.ts`:

| Capability              | Call                                | Used for                             |
| ----------------------- | ----------------------------------- | ------------------------------------ |
| Receive the tool result | `app.ontoolresult`                  | Initial render                       |
| Stream arguments        | `app.ontoolinputpartial`            | Progress while the model generates   |
| Speak in the chat       | `app.sendMessage()`                 | "Ask about current time"             |
| Go fullscreen           | `app.requestDisplayMode()`          | Expand from inline                   |
| Match the host's design | `useHostStyles(app)`                | CSS variables, fonts, light/dark     |
| Call back into Python   | `app.callServerTool()`              | Refresh, pagination, form submits    |
| Inform the model quietly| `app.updateModelContext()`          | Tell it what the user selected       |
| Debug inside the host   | `app.sendLog()`                     | Logs the host surfaces               |

> **Register every handler before connecting.** `useApp`'s `onAppCreated` runs
> after the app is constructed but before `connect()`, which is the only
> window where handlers are guaranteed to catch the opening notifications.

### Adding a button that calls the server

Give the new tool `visibility=["app"]` so the model never sees it — a button
is not something the model should decide to press:

```python
@mcp.tool(name="refresh_data", app=AppConfig(visibility=["app"]))
async def refresh_data() -> AppState:
    return AppState(message="Refreshed.")
```

```ts
const result = await app.callServerTool({ name: "refresh_data", arguments: {} });
```

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
uv run fastmcp dev inspector server/app.py
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
the tool still works and returns its JSON, which is why `AppState` should stay
readable on its own.

## Making it yours

1. Rewrite `ui/src/App.tsx`. The accent colour is `--accent` in
   `ui/src/styles.css`; everything else follows the host's theme.
2. Change `AppState` in `server/models.py` **and** `ui/src/types.ts` together
   — `isAppState` will reject payloads that only changed on one side.
3. Put real work in `server/tools.py`.
4. If the UI needs to reach an external origin, declare it — a sandboxed
   iframe blocks anything undeclared:

   ```python
   from fastmcp.apps.config import AppConfig, ResourceCSP

   app=AppConfig(csp=ResourceCSP(connect_domains=["https://api.example.com"]))
   ```
