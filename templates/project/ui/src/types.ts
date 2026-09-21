/**
 * The shape the server sends. Mirror of `server/models.py` — change both
 * together.
 */

export interface AppState {
  message: string;
}

/**
 * Tool results arrive as untyped JSON from outside this bundle, so they are
 * validated rather than cast — a malformed payload should leave the panel on
 * its default text, not crash the iframe.
 */
export function isAppState(value: unknown): value is AppState {
  if (typeof value !== "object" || value === null) return false;
  return typeof (value as Record<string, unknown>).message === "string";
}
