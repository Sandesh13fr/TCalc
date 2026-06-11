#!/usr/bin/env node
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function run(label, cmd) {
  process.stdout.write(`  ${label}... `);
  try {
    execSync(cmd, { cwd: repoRoot, encoding: "utf-8", timeout: 30000 });
    process.stdout.write("\u2713\n");
  } catch (err) {
    process.stdout.write("\u2717\n");
    const msg = err.stderr ? err.stderr.slice(0, 200) : err.message;
    console.error(`    Failed: ${msg}`);
    process.exit(1);
  }
}

function main() {
  const cli = "node apps/cli/dist/index.js";
  const fixture = "fixtures/small-node-app";

  console.log("CLI smoke tests:");
  console.log("");

  run("help", `${cli} --help`);
  run("scan fixture (table)", `${cli} scan ${fixture} --format table`);
  run("scan fixture (json)", `${cli} scan ${fixture} --format json`);
  run("repo-map fixture", `${cli} repo-map ${fixture} --budget 8000`);
  run("report fixture", `${cli} report ${fixture}`);

  console.log("");
  console.log("All CLI smoke tests passed.");
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
