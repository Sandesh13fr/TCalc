#!/usr/bin/env node
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outDir = resolve(repoRoot, "dist-ci");

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const cli = "node apps/cli/dist/index.js";
const target = ".";

function run(label, cmd) {
  console.log(`\n[workspace-report] ${label}`);
  console.log(`  $ ${cmd}`);
  execSync(cmd, { cwd: repoRoot, encoding: "utf-8", stdio: "inherit", timeout: 120000 });
}

const reportPath = resolve(outDir, "workspace-model-report.md");
const repoMapPath = resolve(outDir, "repo-map.md");
const recsPath = resolve(outDir, "model-recommendations.json");

run("scan + report", `${cli} report ${target} --include-repo-map --output "${reportPath}" --force`);
run("repo-map (budget 16000)", `${cli} repo-map ${target} --budget 16000 --output "${repoMapPath}" --force`);
run("recommend (json)", `${cli} recommend ${target} --format json --output "${recsPath}" --force`);

console.log("\n[workspace-report] done");
console.log(`  - ${reportPath}`);
console.log(`  - ${repoMapPath}`);
console.log(`  - ${recsPath}`);
