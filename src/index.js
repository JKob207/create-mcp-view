import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { deriveNames, toSlug, validateAppName } from "./names.js";
import { ask, confirm, isInteractive } from "./prompt.js";
import { assertTargetUsable, renderTree } from "./render.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.resolve(__dirname, "..", "templates", "project");

const BOLD = "\u001b[1m";
const DIM = "\u001b[2m";
const GREEN = "\u001b[32m";
const CYAN = "\u001b[36m";
const YELLOW = "\u001b[33m";
const RESET = "\u001b[0m";

const HELP = `
${BOLD}create-mcp-view${RESET} — scaffold an MCP App (FastMCP server + React UI)

${BOLD}Usage${RESET}
  npm create mcp-view [name] [options]

${BOLD}Options${RESET}
  --dir <path>     Parent directory to create the app in (default: cwd)
  --install        Install Python and npm dependencies after scaffolding
  --no-install     Skip dependency installation
  -y, --yes        Accept defaults, no prompts (implies --install)
  -h, --help       Show this message

${BOLD}Example${RESET}
  npm create mcp-view "Weather Radar"
`;

function parseArgs(argv) {
  const options = { name: null, dir: process.cwd(), install: null, yes: false, help: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") options.help = true;
    else if (arg === "-y" || arg === "--yes") options.yes = true;
    else if (arg === "--install") options.install = true;
    else if (arg === "--no-install") options.install = false;
    else if (arg === "--dir") {
      const value = argv[++i];
      if (!value) throw new Error("--dir requires a path");
      options.dir = path.resolve(value);
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (options.name === null) {
      options.name = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }
  return options;
}

/** Runs a command, streaming its output. Resolves false on failure. */
function execStreaming(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", shell: false });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

/** True when `command --version` succeeds, i.e. the tool is on PATH. */
function hasCommand(command) {
  return new Promise((resolve) => {
    const child = spawn(command, ["--version"], { stdio: "ignore", shell: false });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

async function installDependencies(projectDir) {
  const results = { python: null, node: null };

  if (await hasCommand("uv")) {
    console.log(`\n${CYAN}›${RESET} Installing Python dependencies ${DIM}(uv sync)${RESET}`);
    results.python = await execStreaming("uv", ["sync"], projectDir);
  } else {
    console.log(`\n${YELLOW}!${RESET} uv not found — skipping Python dependencies.`);
    console.log(`  Install it from https://docs.astral.sh/uv/ then run: uv sync`);
  }

  if (await hasCommand("npm")) {
    console.log(`\n${CYAN}›${RESET} Installing UI dependencies ${DIM}(npm install)${RESET}`);
    results.node = await execStreaming("npm", ["install"], path.join(projectDir, "ui"));
  } else {
    console.log(`\n${YELLOW}!${RESET} npm not found — skipping UI dependencies.`);
  }

  return results;
}

/**
 * A relative path is friendlier, but only while it stays short. Once it
 * climbs out of the current directory it is worse than the absolute one.
 */
function displayPath(target) {
  const relative = path.relative(process.cwd(), target);
  if (!relative) return ".";
  return relative.startsWith("..") ? target : relative;
}

function printNextSteps(names, projectDir, installed) {
  const rel = displayPath(projectDir);

  console.log(`\n${GREEN}✔${RESET} Created ${BOLD}${names.title}${RESET} in ${DIM}${rel}${RESET}\n`);
  console.log(`${BOLD}Next steps${RESET}\n`);

  let step = 1;
  console.log(`  ${step++}. cd ${rel}`);

  if (installed?.python !== true) {
    console.log(`  ${step++}. uv sync                 ${DIM}# Python deps${RESET}`);
  }
  if (installed?.node !== true) {
    console.log(`  ${step++}. npm install --prefix ui ${DIM}# UI deps${RESET}`);
  }

  console.log(`  ${step++}. npm run build --prefix ui ${DIM}# bundle the UI to one HTML file${RESET}`);
  console.log(`  ${step++}. uv run ${names.slug} --http  ${DIM}# serve on http://127.0.0.1:8000/mcp${RESET}`);

  console.log(`\n${BOLD}Then${RESET}\n`);
  console.log(`  Point an MCP Apps host at the server and ask it to run ${CYAN}${names.toolName}${RESET}.`);
  console.log(`  ${DIM}See README.md in the generated project for host setup and the dev loop.${RESET}\n`);
}

export async function run(argv) {
  const options = parseArgs(argv);

  if (options.help) {
    console.log(HELP);
    return;
  }

  console.log(`\n${BOLD}create-mcp-view${RESET} ${DIM}— FastMCP + React MCP App${RESET}\n`);

  let appName = options.name;

  if (appName === null) {
    if (!isInteractive()) {
      throw new Error("An app name is required when not running interactively.\nUsage: create-mcp-view <name>");
    }
    appName = await ask("App name?", {
      defaultValue: "my-mcp-app",
      validate: validateAppName,
    });
  } else {
    // A name given on the command line still has to be usable.
    const error = validateAppName(appName);
    if (error) throw new Error(error);
  }

  const names = deriveNames(appName);
  const projectDir = path.join(options.dir, toSlug(appName));

  await assertTargetUsable(projectDir);

  // Confirm what will actually be written before writing it.
  if (!options.yes && isInteractive()) {
    console.log(`\n  ${DIM}directory ${RESET}${displayPath(projectDir)}`);
    console.log(`  ${DIM}python   ${RESET}server/`);
    console.log(`  ${DIM}tool     ${RESET}${names.toolName}`);
    console.log(`  ${DIM}resource ${RESET}${names.resourceUri}\n`);

    if (!(await confirm("Create this app?", true))) {
      console.log("\nCancelled.");
      return;
    }
  }

  const files = await renderTree(TEMPLATE_DIR, projectDir, names);
  console.log(`\n${GREEN}✔${RESET} Wrote ${files.length} files.`);

  let installed = null;
  let shouldInstall = options.install;
  if (shouldInstall === null) {
    shouldInstall = options.yes ? true : isInteractive() ? await confirm("Install dependencies now?", true) : false;
  }
  if (shouldInstall) {
    installed = await installDependencies(projectDir);
  }

  printNextSteps(names, projectDir, installed);
}
