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
