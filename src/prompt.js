/**
 * Minimal interactive prompts on node:readline, so the scaffolder stays
 * dependency-free and `npx create-mcp-ui-app` starts instantly.
 */
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const CYAN = "[36m";
const DIM = "[2m";
const RED = "[31m";
const RESET = "[0m";

export function isInteractive() {
  return stdin.isTTY && stdout.isTTY;
}

/**
 * Asks until `validate` passes. `validate` returns an error string or null.
 */
export async function ask(question, { defaultValue = "", validate } = {}) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    for (;;) {
      const suffix = defaultValue ? ` ${DIM}(${defaultValue})${RESET}` : "";
      const answer = (await rl.question(`${CYAN}?${RESET} ${question}${suffix} `)).trim();
      const value = answer || defaultValue;

      const error = validate ? validate(value) : null;
      if (!error) return value;
      stdout.write(`  ${RED}${error}${RESET}\n`);
    }
  } finally {
    rl.close();
  }
}

export async function confirm(question, defaultValue = true) {
  const hint = defaultValue ? "Y/n" : "y/N";
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = (await rl.question(`${CYAN}?${RESET} ${question} ${DIM}(${hint})${RESET} `))
      .trim()
      .toLowerCase();
    if (!answer) return defaultValue;
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}
