import type { CSSProperties } from "react";

import { useMcpApp } from "./useMcpApp";

/** Sent to the conversation by the second button. */
const DATE_PROMPT = "What is the current date?";

export default function App() {
  const {
    isConnected,
    error,
    hostContext,
    message,
    actionError,
    displayMode,
    canGoFullscreen,
    toggleFullscreen,
    sendToChat,
  } = useMcpApp();

  // The host reserves these edges for its own chrome; content drawn under
  // them can be clipped or covered.
  const insets = hostContext?.safeAreaInsets;
  const frameStyle: CSSProperties = {
    paddingTop: insets?.top,
    paddingRight: insets?.right,
    paddingBottom: insets?.bottom,
    paddingLeft: insets?.left,
  };

  const isFullscreen = displayMode === "fullscreen";

  return (
    <main
      className={`frame${isFullscreen ? " frame--fullscreen" : ""}`}
      style={frameStyle}
    >
      {/* Scaffolder placeholder, not a JSX expression: the generator
          replaces the double braces below with the app's name. */}
      <h1 className="title">{{title}}</h1>

      <p className="message">
        {error
          ? error.message
          : !isConnected
            ? "Connecting…"
            : (message ?? "Waiting for the first tool result…")}
      </p>

      <div className="actions">
        <button
          type="button"
          className="button"
          onClick={() => void toggleFullscreen()}
          disabled={!isConnected || !canGoFullscreen}
          title={
            canGoFullscreen ? undefined : "This host does not offer fullscreen"
          }
        >
          {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        </button>

        <button
          type="button"
          className="button"
          onClick={() => void sendToChat(DATE_PROMPT)}
          disabled={!isConnected}
        >
          Ask about current date
        </button>
      </div>

      {actionError && <p className="banner">{actionError}</p>}
    </main>
  );
}
