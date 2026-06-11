#!/usr/bin/env node
import { existsSync, cpSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const extRoot = resolve(__dirname, "..");
const repoRoot = resolve(extRoot, "..", "..");

const catalogsSrc = resolve(repoRoot, "catalogs");
const catalogsDst = resolve(extRoot, "catalogs");

const ri = resolve(repoRoot, "LICENSE");
const ro = resolve(extRoot, "LICENSE");
if (existsSync(ri)) {
  cpSync(ri, ro, { force: true });
  console.log(`License copied: ${ri} -> ${ro}`);
}

const ci = resolve(repoRoot, "catalogs");
const co = resolve(extRoot, "catalogs");
if (existsSync(ci)) {
  mkdirSync(co, { recursive: true });
  cpSync(ci, co, { recursive: true, force: true });
  console.log(`Catalogs copied: ${ci} -> ${co}`);
} else {
  console.warn("No catalogs found at root, skipping copy");
}

const readmeSrc = resolve(repoRoot, "README.md");
const readmeDst = resolve(extRoot, "README.md");
if (existsSync(readmeSrc)) {
  cpSync(readmeSrc, readmeDst, { force: true });
  console.log(`README copied: ${readmeSrc} -> ${readmeDst}`);
}

const changelogSrc = resolve(repoRoot, "CHANGELOG.md");
const changelogDst = resolve(extRoot, "CHANGELOG.md");
if (existsSync(changelogSrc)) {
  cpSync(changelogSrc, changelogDst, { force: true });
  console.log(`CHANGELOG copied: ${changelogSrc} -> ${changelogDst}`);
} else {
  console.warn("No CHANGELOG.md at repo root, skipping copy");
}
