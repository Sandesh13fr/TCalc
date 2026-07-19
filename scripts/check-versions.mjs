#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = readJson("package.json").version;
const manifests = [
  "apps/cli/package.json",
  "apps/vscode-extension/package.json",
  "packages/agent-rules/package.json",
  "packages/core/package.json",
  "packages/mcp-server/package.json",
  "packages/model-catalog/package.json",
  "packages/recommender/package.json",
  "packages/repo-map/package.json",
  "packages/reports/package.json",
  "packages/scanner/package.json",
  "packages/tokenizers/package.json",
];

const errors = manifests
  .filter((file) => readJson(file).version !== version)
  .map((file) => `${file} does not match ${version}`);

checkText("apps/cli/src/index.ts", `.version("${version}")`);
checkText("apps/vscode-extension/src/commands/quickStartCommand.ts", `TCalc v${version}`);
checkText("packages/mcp-server/src/server.ts", `version: "${version}"`);
checkText("apps/jetbrains-plugin/gradle.properties", `pluginVersion = ${version}`);

const tagIndex = process.argv.indexOf("--tag");
if (tagIndex >= 0) {
  const tag = process.argv[tagIndex + 1];
  if (tag && tag !== version && tag !== `v${version}`) errors.push(`release tag ${tag} does not match v${version}`);
}

if (errors.length) {
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`All package, runtime, plugin, and tag versions match ${version}.`);

function readJson(file) {
  return JSON.parse(readFileSync(resolve(root, file), "utf8"));
}

function checkText(file, expected) {
  if (!readFileSync(resolve(root, file), "utf8").includes(expected)) errors.push(`${file} is not ${version}`);
}
