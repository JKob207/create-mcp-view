/**
 * The shape the server sends. Mirror of `{{pyPackage}}/models.py` — change
 * both together.
 */

export interface Item {
  id: string;
  title: string;
  detail: string;
  score: number;
}

export interface PanelData {
  query: string;
  /** ISO-8601 timestamp, snake_case because Pydantic serialises it that way. */
  generated_at: string;
  items: Item[];
}

function isItem(value: unknown): value is Item {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.detail === "string" &&
    typeof item.score === "number"
  );
}

/**
 * Tool results arrive as untyped JSON from outside this bundle, so they are
 * validated rather than cast — a malformed payload should render an empty
 * state, not crash the iframe.
 */
export function isPanelData(value: unknown): value is PanelData {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.query === "string" &&
    typeof data.generated_at === "string" &&
    Array.isArray(data.items) &&
    data.items.every(isItem)
  );
}
