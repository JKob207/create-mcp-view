#!/usr/bin/env node
import { run } from "../src/index.js";

run(process.argv.slice(2)).catch((err) => {
  console.error(`\n\u001b[31merror\u001b[0m ${err?.message ?? err}`);
  process.exit(1);
});
