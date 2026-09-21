/**
 * Everything this app needs from the MCP Apps SDK, in one hook.
 *
 * The lifecycle rule that matters: every handler must be attached before the
 * app connects, or the host's opening notifications arrive with nowhere to go.
 * `useApp` enforces this by giving you `onAppCreated`, which runs after the
 * `App` is constructed but before `connect()`.
 */
import type {
  App,
  McpUiDisplayMode,
  McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/client";
import { useCallback, useEffect, useState } from "react";

import { isPanelData, type PanelData } from "./types";

const APP_INFO = { name: "{{slug}}", version: "0.1.0" };

/** App-only tool, declared with visibility=["app"] on the server. */
const REFRESH_TOOL = "{{refreshToolName}}";

/**
 * A host may deliver the payload as `structuredContent`, as a JSON text
 * block, or both. Try the structured form first and fall back to text.
 */
function parsePanelData(result: CallToolResult): PanelData | null {
  if (isPanelData(result.structuredContent)) {
    return result.structuredContent;
  }

  const textBlock = result.content?.find((block) => block.type === "text");
  if (textBlock?.type === "text") {
    try {
      const parsed: unknown = JSON.parse(textBlock.text);
      if (isPanelData(parsed)) return parsed;
    } catch {
      // Not JSON — fall through to the null return below.
    }
  }

  return null;
}

export interface McpAppState {
  app: App | null;
  isConnected: boolean;
  error: Error | null;
  hostContext: McpUiHostContext | undefined;

  data: PanelData | null;
  /** True while a tool the UI itself invoked is in flight. */
  isBusy: boolean;
  /** Set when the last UI-initiated action failed; cleared on the next one. */
  actionError: string | null;

  /** `"inline"`, `"fullscreen"` or `"pip"` — hosts may add more. */
  displayMode: McpUiDisplayMode;
  canGoFullscreen: boolean;

  refresh: () => Promise<void>;
  toggleFullscreen: () => Promise<void>;
  sendToChat: (text: string) => Promise<void>;
  reportSelection: (item: { title: string } | null) => Promise<void>;
}

export function useMcpApp(): McpAppState {
  const [data, setData] = useState<PanelData | null>(null);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { app, isConnected, error } = useApp({
    appInfo: APP_INFO,
    capabilities: {},
    onAppCreated: (created) => {
      // Fires while the model is still generating the tool's arguments. The
      // partial JSON is healed, so it is always parseable — use it to show
      // progress for slow or large inputs.
      created.ontoolinputpartial = (params) => {
        console.debug("partial tool input", params.arguments);
      };

      // Final arguments, before the server has returned anything.
      created.ontoolinput = (params) => {
        console.debug("tool input", params.arguments);
      };

      // The result of the tool that opened this app.
      created.ontoolresult = (result) => {
        const parsed = parsePanelData(result);
        if (parsed) setData(parsed);
      };

      created.ontoolcancelled = (params) => {
        console.debug("tool cancelled", params.reason);
      };

      // Theme, fonts, safe-area insets, display mode, container size.
      created.onhostcontextchanged = (params) => {
        setHostContext((previous) => ({ ...previous, ...params }));
      };

      created.onteardown = async () => ({});
      created.onerror = console.error;
    },
  });

  // Handlers only fire on *changes*; the context present at connect time has
  // to be read once directly.
  useEffect(() => {
    if (app) setHostContext(app.getHostContext());
  }, [app]);

  // Applies the host's CSS variables, fonts and light/dark theme to this
  // document, which is what makes var(--color-*) work in styles.css.
  useHostStyles(app);

  const displayMode = hostContext?.displayMode ?? "inline";
  const canGoFullscreen = Boolean(
    hostContext?.availableDisplayModes?.includes("fullscreen"),
  );

  /** Calls the app-only refresh tool and swaps in the new payload. */
  const refresh = useCallback(async () => {
    if (!app) return;
    setIsBusy(true);
    setActionError(null);
    try {
      const result = await app.callServerTool({
        name: REFRESH_TOOL,
        arguments: { query: data?.query ?? "", limit: 10 },
      });
      const parsed = parsePanelData(result);
      if (parsed) {
        setData(parsed);
      } else {
        setActionError("Refresh returned an unexpected payload.");
      }
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsBusy(false);
    }
  }, [app, data?.query]);

  /**
   * The host decides whether to grant the mode, and answers with the mode
   * actually applied — so the result is authoritative, not the request.
   */
  const toggleFullscreen = useCallback(async () => {
    if (!app) return;
    const next = displayMode === "fullscreen" ? "inline" : "fullscreen";
    try {
      const result = await app.requestDisplayMode({ mode: next });
      setHostContext((previous) => ({ ...previous, displayMode: result.mode }));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [app, displayMode]);

  /** Puts a message in the conversation as if the user had typed it. */
  const sendToChat = useCallback(
    async (text: string) => {
      if (!app) return;
      setActionError(null);
      try {
        const { isError } = await app.sendMessage({
          role: "user",
          content: [{ type: "text", text }],
        });
        if (isError) setActionError("The host declined the message.");
      } catch (cause) {
        setActionError(cause instanceof Error ? cause.message : String(cause));
      }
    },
    [app],
  );

  /**
   * Tells the model what the user is looking at, without saying anything in
   * the conversation. Without this the model cannot see UI-only state, so a
   * follow-up like "summarise this one" has nothing to resolve.
   */
  const reportSelection = useCallback(
    async (item: { title: string } | null) => {
      if (!app) return;
      const text = item
        ? `The user selected "${item.title}" in the {{title}} panel.`
        : "The user cleared their selection in the {{title}} panel.";
      try {
        await app.updateModelContext({ content: [{ type: "text", text }] });
      } catch (cause) {
        console.error(cause);
      }
    },
    [app],
  );

  return {
    app,
    isConnected,
    error,
    hostContext,
    data,
    isBusy,
    actionError,
    displayMode,
    canGoFullscreen,
    refresh,
    toggleFullscreen,
    sendToChat,
    reportSelection,
  };
}
