#!/usr/bin/env node
import { existsSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const extRoot = resolve(__dirname, "..");
const repoRoot = resolve(extRoot, "..", "..");
const pkg = JSON.parse(readFileSync(resolve(extRoot, "package.json"), "utf-8"));

const distDir = resolve(repoRoot, "dist-vsix");
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

const outFile = resolve(distDir, `${pkg.name}-${pkg.version}.vsix`);
rmSync(outFile, { force: true });

console.log(`Packaging ${pkg.name}@${pkg.version}`);
console.log(`  out: ${outFile}`);
console.log("");

const require = createRequire(import.meta.url);
const main = require(resolve(extRoot, "node_modules", "@vscode", "vsce", "out", "main.js"));

const argv = [
  process.argv[0],
  "vsce",
  "package",
  "--out",
  outFile,
  "--allow-missing-repository",
  "--no-dependencies",
];

main(argv);
