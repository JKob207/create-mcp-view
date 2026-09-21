/**
 * Everything this app needs from the MCP Apps SDK, in one hook.
 *
 * The lifecycle rule that matters: every handler must be attached before the
 * app connects, or the host's opening notifications arrive with nowhere to go.
 * `useApp` enforces this by giving you `onAppCreated`, which runs after the
 * `App` is constructed but before `connect()`.
 */
import type {
  McpUiDisplayMode,
  McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/client";
import { useCallback, useEffect, useState } from "react";

import { isAppState, type AppState } from "./types";

const APP_INFO = { name: "{{slug}}", version: "0.1.0" };

/**
 * A host may deliver the payload as `structuredContent`, as a JSON text
 * block, or both. Try the structured form first and fall back to text.
 */
function parseAppState(result: CallToolResult): AppState | null {
  if (isAppState(result.structuredContent)) {
    return result.structuredContent;
  }

  const textBlock = result.content?.find((block) => block.type === "text");
  if (textBlock?.type === "text") {
    try {
      const parsed: unknown = JSON.parse(textBlock.text);
      if (isAppState(parsed)) return parsed;
    } catch {
      // Not JSON — fall through to the null return below.
    }
  }

  return null;
}

export interface McpAppState {
  isConnected: boolean;
  error: Error | null;
  hostContext: McpUiHostContext | undefined;

  /** The server's message, or null until the first tool result arrives. */
  message: string | null;
  /** Set when a UI-initiated action failed; cleared on the next one. */
  actionError: string | null;

  /** `"inline"`, `"fullscreen"` or `"pip"` — hosts may add more. */
  displayMode: McpUiDisplayMode;
  canGoFullscreen: boolean;

  toggleFullscreen: () => Promise<void>;
  sendToChat: (text: string) => Promise<void>;
}

export function useMcpApp(): McpAppState {
  const [message, setMessage] = useState<string | null>(null);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();
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
        const parsed = parseAppState(result);
        if (parsed) setMessage(parsed.message);
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

  /**
   * The host decides whether to grant the mode, and answers with the mode
   * actually applied — so the result is authoritative, not the request.
   */
  const toggleFullscreen = useCallback(async () => {
    if (!app) return;
    const next = displayMode === "fullscreen" ? "inline" : "fullscreen";
    setActionError(null);
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

  return {
    isConnected,
    error,
    hostContext,
    message,
    actionError,
    displayMode,
    canGoFullscreen,
    toggleFullscreen,
    sendToChat,
  };
}
