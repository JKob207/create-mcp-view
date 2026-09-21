/**
 * Copies the template tree into the target directory, substituting {{vars}}
 * in both file contents and path segments.
 */
import fs from "node:fs/promises";
import path from "node:path";

/**
 * npm strips a published package's `.gitignore`, so templates store these
 * under a safe name and they are restored on the way out.
 */
const RENAME_ON_COPY = {
  gitignore: ".gitignore",
};

/** Extensions treated as binary and copied through untouched. */
const BINARY_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".woff", ".woff2", ".ttf", ".otf", ".pdf",
]);

/**
 * Replaces every {{key}} with its value. An unknown placeholder is a template
 * bug rather than user input, so it throws instead of silently emitting
 * "{{typo}}" into the generated project.
 */
export function renderString(input, vars, sourceLabel) {
  return input.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!(key in vars)) {
      throw new Error(`Unknown template variable "${key}" in ${sourceLabel}`);
    }
    return vars[key];
  });
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * Walks `sourceDir` and writes the rendered result under `targetDir`.
 * Returns the list of created file paths, relative to targetDir.
 */
export async function renderTree(sourceDir, targetDir, vars) {
  const created = [];

  async function walk(currentSource, currentTarget) {
    const entries = await fs.readdir(currentSource, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(currentSource, entry.name);

      const renamed = RENAME_ON_COPY[entry.name] ?? entry.name;
      const targetName = renderString(renamed, vars, sourcePath);
      const targetPath = path.join(currentTarget, targetName);

      if (entry.isDirectory()) {
        await fs.mkdir(targetPath, { recursive: true });
        await walk(sourcePath, targetPath);
        continue;
      }

      if (!entry.isFile()) continue;

      if (BINARY_EXT.has(path.extname(entry.name).toLowerCase())) {
        await fs.copyFile(sourcePath, targetPath);
      } else {
        const raw = await fs.readFile(sourcePath, "utf8");
        await fs.writeFile(targetPath, renderString(raw, vars, sourcePath), "utf8");
      }

      created.push(path.relative(targetDir, targetPath));
    }
  }

  await fs.mkdir(targetDir, { recursive: true });
  await walk(sourceDir, targetDir);
  created.sort();
  return created;
}

/**
 * A target is usable when it does not exist, or exists but is empty.
 * Refusing a non-empty directory avoids half-overwriting someone's work.
 */
export async function assertTargetUsable(targetDir) {
  if (!(await pathExists(targetDir))) return;

  const stat = await fs.stat(targetDir);
  if (!stat.isDirectory()) {
    throw new Error(`${targetDir} exists and is not a directory.`);
  }

  const entries = await fs.readdir(targetDir);
  const meaningful = entries.filter((e) => e !== ".DS_Store" && e !== ".git");
  if (meaningful.length > 0) {
    throw new Error(
      `Directory ${path.basename(targetDir)} already exists and is not empty.\n` +
        `        Choose a different app name, or remove the directory first.`
    );
  }
}
