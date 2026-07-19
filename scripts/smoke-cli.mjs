#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { tmpdir } from "node:os";
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
  run("recommend fixture", `${cli} recommend ${fixture} --catalog catalogs/models.json --format json`);
  run("repo-map fixture", `${cli} repo-map ${fixture} --budget 8000`);
  run("repo-map fixture (json)", `${cli} repo-map ${fixture} --budget 8000 --format json`);
  run("report fixture", `${cli} report ${fixture} --catalog catalogs/models.json`);
  run("report fixture (json + repo map)", `${cli} report ${fixture} --catalog catalogs/models.json --format json --include-repo-map`);
  run("catalog validate", `${cli} catalog validate catalogs/models.json`);
  run("catalog feed command registration", `${cli} catalog fetch --help`);
  run("goal compaction", `${cli} compact --goal debug --summary "Fixed parser" --changed-file src/parser.ts --format json`);
  run("MCP command registration", `${cli} mcp --help`);
  run("MCP config", `${cli} mcp-config --target generic --workspace ${fixture}`);

  const rulesDir = mkdtempSync(join(tmpdir(), "tcalc-rules-"));
  try {
    const quotedRulesDir = JSON.stringify(rulesDir);
    const preview = execSync(`${cli} rules ${quotedRulesDir} --target generic`, { cwd: repoRoot, encoding: "utf-8" });
    if (!preview.includes("Would write") || existsSync(join(rulesDir, "AGENTS.md"))) {
      throw new Error("rules command wrote without --yes");
    }
    const stdout = execSync(`${cli} rules ${quotedRulesDir} --target generic --stdout`, { cwd: repoRoot, encoding: "utf-8" });
    if (!stdout.includes("Agent Rules")) throw new Error("rules --stdout did not return generated rules");
    process.stdout.write("  rules overwrite safety... \u2713\n");

    const protectedOutput = join(rulesDir, "scan.json");
    writeFileSync(protectedOutput, "keep");
    try {
      execSync(`${cli} scan ${quotedRulesDir} --format json --output ${JSON.stringify(protectedOutput)}`, { cwd: repoRoot, stdio: "pipe" });
      throw new Error("scan command overwrote without --force");
    } catch {
      if (readFileSync(protectedOutput, "utf8") !== "keep") throw new Error("existing output was changed");
    }
    execSync(`${cli} scan ${quotedRulesDir} --format json --output ${JSON.stringify(protectedOutput)} --force`, { cwd: repoRoot, stdio: "pipe" });
    process.stdout.write("  output overwrite safety... \u2713\n");
  } finally {
    rmSync(rulesDir, { recursive: true, force: true });
  }

  console.log("");
  console.log("All CLI smoke tests passed.");
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
