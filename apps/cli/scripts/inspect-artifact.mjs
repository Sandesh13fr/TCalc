import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const required = [
  new URL("../dist/index.js", import.meta.url),
  new URL("../dist/utils/loadCatalog.js", import.meta.url),
  new URL("../dist/catalogs/models.json", import.meta.url),
  new URL("../dist/catalogs/providers.json", import.meta.url),
];

for (const url of required) {
  const path = fileURLToPath(url);
  if (!existsSync(path)) {
    throw new Error(`CLI artifact is missing required file: ${path}`);
  }
}

const models = JSON.parse(readFileSync(required[2], "utf8"));
if (!Array.isArray(models.models) || models.models.length === 0) {
  throw new Error("CLI artifact contains an empty or invalid model catalog");
}

const loader = readFileSync(required[1], "utf8");
if (!loader.includes("../catalogs")) {
  throw new Error("CLI artifact does not resolve its packaged catalog");
}

console.log(`CLI artifact verified: ${models.models.length} bundled models`);
