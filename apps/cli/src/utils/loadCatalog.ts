import { loadModelCatalog, validateModelCatalog } from "@wma/model-catalog";
import type { ModelCatalog } from "@wma/core";
import { existsSync } from "node:fs";
import { findCatalogInWorkspace } from "./paths.js";
import { CliError } from "./errors.js";

export function resolveCatalog(catalogPath?: string, rootPath?: string): ModelCatalog {
  if (catalogPath) {
    if (!existsSync(catalogPath)) throw new CliError(`Catalog path does not exist: ${catalogPath}`);
    try {
      // Strict: missing models.json under an explicit dir, corrupt JSON, or
      // permission errors must surface as CliError, not an empty catalog.
      return validateLoadedCatalog(loadModelCatalog(catalogPath, { strict: true }), catalogPath);
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new CliError(`Failed to load model catalog at ${catalogPath}: ${errorMessage(error)}`);
    }
  }
  if (rootPath) {
    const candidates = findCatalogInWorkspace(rootPath);
    for (const cp of candidates) {
      // A corrupt or unreadable workspace candidate must not kill the CLI:
      // skip it and fall through to the next candidate / bundled catalog.
      // Missing candidates return empty (non-strict) and are skipped via length check.
      try {
        const cat = loadModelCatalog(cp);
        if (cat.models.length > 0) return validateLoadedCatalog(cat, cp);
      } catch {
        continue;
      }
    }
  }
  // fallback: try default bundled catalogs directory (strict — a missing or
  // broken bundled catalog is a load failure, not an empty result).
  try {
    return validateLoadedCatalog(loadModelCatalog("catalogs", { strict: true }), "catalogs/models.json");
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(`Failed to load model catalog at catalogs/models.json: ${errorMessage(error)}`);
  }
}

function validateLoadedCatalog(catalog: ModelCatalog, source: string): ModelCatalog {
  const errors = validateModelCatalog(catalog.models);
  if (errors.length > 0) throw new CliError(`Invalid model catalog at ${source}: ${errors[0]}`);
  return catalog;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
