import { loadModelCatalog, validateModelCatalog } from "@wma/model-catalog";
import type { ModelCatalog } from "@wma/core";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { findCatalogInWorkspace } from "./paths.js";
import { CliError } from "./errors.js";

export function resolveCatalog(catalogPath?: string, rootPath?: string): ModelCatalog {
  if (catalogPath) {
    if (!existsSync(catalogPath)) throw new CliError(`Catalog path does not exist: ${catalogPath}`);
    return validateLoadedCatalog(loadModelCatalog(catalogPath), catalogPath);
  }
  if (rootPath) {
    const candidates = findCatalogInWorkspace(rootPath);
    for (const cp of candidates) {
      const cat = loadModelCatalog(cp);
      if (cat.models.length > 0) return validateLoadedCatalog(cat, cp);
    }
  }
  return validateLoadedCatalog(loadModelCatalog(getBundledCatalogPath()), "bundled catalogs/models.json");
}

function validateLoadedCatalog(catalog: ModelCatalog, source: string): ModelCatalog {
  const errors = validateModelCatalog(catalog.models);
  if (errors.length > 0) throw new CliError(`Invalid model catalog at ${source}: ${errors[0]}`);
  return catalog;
}

function getBundledCatalogPath(): string {
  const candidates = [
    new URL("../catalogs", import.meta.url),
    new URL("../../../../catalogs", import.meta.url),
  ];

  for (const candidate of candidates) {
    const path = fileURLToPath(candidate);
    if (existsSync(path)) return path;
  }

  throw new CliError("Bundled model catalog is missing from the CLI installation");
}
