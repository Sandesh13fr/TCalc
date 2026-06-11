import { loadModelCatalog } from "@wma/model-catalog";
import type { ModelCatalog } from "@wma/core";
import { findCatalogInWorkspace } from "./paths.js";

export function resolveCatalog(catalogPath?: string, rootPath?: string): ModelCatalog {
  if (catalogPath) {
    return loadModelCatalog(catalogPath);
  }
  if (rootPath) {
    const candidates = findCatalogInWorkspace(rootPath);
    for (const cp of candidates) {
      const cat = loadModelCatalog(cp);
      if (cat.models.length > 0) return cat;
    }
  }
  // fallback: try default bundled catalogs directory
  return loadModelCatalog("catalogs");
}
