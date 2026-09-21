/**
 * Minimal interactive prompts on node:readline, so the scaffolder stays
 * dependency-free and `npm create mcp-view` starts instantly.
 */
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const CYAN = "\u001b[36m";
const DIM = "\u001b[2m";
const RED = "\u001b[31m";
const RESET = "\u001b[0m";

/** Conventional exit code for a run ended by SIGINT (128 + 2). */
const SIGINT_EXIT_CODE = 130;

export function isInteractive() {
  return stdin.isTTY && stdout.isTTY;
}

/**
 * Runs `body` with a readline interface, closing it on every path.
 *
 * readline intercepts Ctrl-C: while an interface is open with no "SIGINT"
 * listener, Node emits "pause" instead of letting the default signal
 * handler terminate the process, so the pending `question()` never settles.
 * What happens next is not deterministic — the run may die with a generic
 * error, or sit holding the terminal. Handling the signal here makes
 * cancellation predictable: say so, restore the terminal, and exit with the
 * code that means "interrupted".
 */
async function withInterface(body) {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  rl.on("SIGINT", () => {
    stdout.write("\nCancelled.\n");
    rl.close();
    process.exit(SIGINT_EXIT_CODE);
  });

  try {
    return await body(rl);
  } finally {
    rl.close();
  }
}

/**
 * Asks until `validate` passes. `validate` returns an error string or null.
 */
export async function ask(question, { defaultValue = "", validate } = {}) {
  return withInterface(async (rl) => {
    for (;;) {
      const suffix = defaultValue ? ` ${DIM}(${defaultValue})${RESET}` : "";
      const answer = (await rl.question(`${CYAN}?${RESET} ${question}${suffix} `)).trim();
      const value = answer || defaultValue;

      const error = validate ? validate(value) : null;
      if (!error) return value;
      stdout.write(`  ${RED}${error}${RESET}\n`);
    }
  });
}

/**
 * Asks until the answer is recognisably yes or no.
 *
 * Anything unrecognised is re-asked rather than folded into the default:
 * treating "nope" or a stray keystroke as consent is the wrong way to read
 * silence on a prompt that then writes to disk.
 */
export async function confirm(question, defaultValue = true) {
  const hint = defaultValue ? "Y/n" : "y/N";

  return withInterface(async (rl) => {
    for (;;) {
      const answer = (await rl.question(`${CYAN}?${RESET} ${question} ${DIM}(${hint})${RESET} `))
        .trim()
        .toLowerCase();

      if (!answer) return defaultValue;
      if (answer === "y" || answer === "yes") return true;
      if (answer === "n" || answer === "no") return false;

      stdout.write(`  ${RED}Please answer y or n.${RESET}\n`);
    }
  });
}
