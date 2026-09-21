import { useState, type CSSProperties } from "react";

import type { Item } from "./types";
import { useMcpApp } from "./useMcpApp";

export default function App() {
  const {
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
  } = useMcpApp();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (error) {
    return (
      <div className="state state--error">
        <strong>Could not connect to the host</strong>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!isConnected) {
    return <div className="state">Connecting…</div>;
  }

  // The host reserves these edges for its own chrome; content drawn under
  // them can be clipped or covered.
  const insets = hostContext?.safeAreaInsets;
  const frameStyle: CSSProperties = {
    paddingTop: insets?.top,
    paddingRight: insets?.right,
    paddingBottom: insets?.bottom,
    paddingLeft: insets?.left,
  };

  function handleSelect(item: Item) {
    const next = selectedId === item.id ? null : item.id;
    setSelectedId(next);
    void reportSelection(next ? item : null);
  }

  const items = data?.items ?? [];

  return (
    <main
      className={`frame${displayMode === "fullscreen" ? " frame--fullscreen" : ""}`}
      style={frameStyle}
    >
      <header className="header">
        <div>
          <h1 className="title">{{title}}</h1>
          <p className="subtitle">
            {data
              ? `${items.length} item${items.length === 1 ? "" : "s"}` +
                (data.query ? ` for “${data.query}”` : "") +
                ` · ${new Date(data.generated_at).toLocaleTimeString()}`
              : "Waiting for the first tool result…"}
          </p>
        </div>

        <div className="actions">
          <button type="button" onClick={() => void refresh()} disabled={isBusy}>
            {isBusy ? "Refreshing…" : "Refresh"}
          </button>
          {canGoFullscreen && (
            <button type="button" onClick={() => void toggleFullscreen()}>
              {displayMode === "fullscreen" ? "Exit fullscreen" : "Fullscreen"}
            </button>
          )}
        </div>
      </header>

      {actionError && <p className="banner banner--error">{actionError}</p>}

      {items.length === 0 ? (
        <p className="state">No items to show.</p>
      ) : (
        <ul className="list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`card${selectedId === item.id ? " card--selected" : ""}`}
                onClick={() => handleSelect(item)}
                aria-pressed={selectedId === item.id}
              >
                <span className="card__title">{item.title}</span>
                <span className="card__detail">{item.detail}</span>
                <span className="card__score">{Math.round(item.score * 100)}%</span>
              </button>

              {selectedId === item.id && (
                <div className="card__footer">
                  <button
                    type="button"
                    onClick={() =>
                      void sendToChat(`Tell me more about “${item.title}”.`)
                    }
                  >
                    Ask about this
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
