/**
 * Derives every naming variant the templates need from one raw app name.
 *
 * A single user answer ("My Weather App") has to be valid as a directory name,
 * an npm package name, a Python module name, an MCP tool name and a ui:// URI,
 * and those have incompatible rules. Deriving them all in one place keeps the
 * generated project internally consistent.
 */

const PY_KEYWORDS = new Set([
  "false", "none", "true", "and", "as", "assert", "async", "await", "break",
  "class", "continue", "def", "del", "elif", "else", "except", "finally",
  "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal",
  "not", "or", "pass", "raise", "return", "try", "while", "with", "yield",
]);

/** kebab-case, npm- and URI-safe. */
export function toSlug(raw) {
  return String(raw)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/**
 * snake_case, valid as a Python identifier.
 *
 * The server package is always named `server/`, so this is not a directory
 * name — it is the app's identifier inside Python code, where it ends up in
 * tool names and so must still be a legal identifier.
 */
export function toPyName(slug) {
  let name = slug.replace(/-/g, "_");
  // A Python identifier may not start with a digit, and may not be a keyword.
  if (/^[0-9]/.test(name)) name = `app_${name}`;
  if (PY_KEYWORDS.has(name)) name = `${name}_app`;
  return name;
}

/** Title Case, for headings and descriptions. */
export function toTitle(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Explains why a name is unusable, or returns null when it is fine.
 * Checked before any directory is created so the user can correct it.
 */
export function validateAppName(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "App name cannot be empty.";
  if (trimmed.length > 100) return "App name is too long (max 100 characters).";

  const slug = toSlug(trimmed);
  if (!slug) {
    return "App name must contain at least one letter or digit.";
  }
  if (slug.length > 64) {
    return "App name is too long once normalized (max 64 characters).";
  }
  // npm forbids a leading dot or underscore; the slug rules already exclude
  // those, but a purely numeric name is still a poor package name.
  if (/^[0-9]+$/.test(slug)) {
    return "App name cannot be only digits.";
  }
  return null;
}

/** The full variable set injected into templates. */
export function deriveNames(raw) {
  const appName = String(raw).trim();
  const slug = toSlug(appName);
  const pyName = toPyName(slug);
  const title = toTitle(slug);

  return {
    appName,
    slug,
    pyName,
    title,
    // The MCP tool the model calls to open the UI.
    toolName: `show_${pyName}`,
    // The ui:// resource that carries the bundled HTML.
    resourceUri: `ui://${slug}/main.html`,
    year: String(new Date().getFullYear()),
  };
}
