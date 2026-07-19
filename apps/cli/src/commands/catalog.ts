import { fetchCatalogFeed, loadModelCatalog, validateCatalogFreshness, validateModelCatalog } from "@wma/model-catalog";
import type { ModelCatalog } from "@wma/core";

export interface CatalogValidateOptions {
  path?: string;
  format?: string;
  debug?: boolean;
}

export async function executeCatalogFetch(url: string): Promise<string> {
  return JSON.stringify(await fetchCatalogFeed(url), null, 2);
}

export async function executeCatalogValidate(options: CatalogValidateOptions): Promise<{ valid: boolean; message: string; exitCode: number }> {
  const catalogPath = options.path ?? "catalogs/models.json";
  const catalog: ModelCatalog = loadModelCatalog(catalogPath);

  if (catalog.models.length === 0) {
    const errors = ["No models found"];
    return {
      valid: false,
      message: options.format === "json"
        ? JSON.stringify({ valid: false, catalogPath, modelCount: 0, errors }, null, 2)
        : `No models found in catalog at "${catalogPath}".`,
      exitCode: 1,
    };
  }

  const errors = [...validateModelCatalog(catalog.models), ...validateCatalogFreshness(catalog)];
  if (errors.length > 0) {
    const msg = options.format === "json"
      ? JSON.stringify({ valid: false, catalogPath, modelCount: catalog.models.length, errors }, null, 2)
      : [`Catalog at "${catalogPath}" is INVALID.`, "", ...errors.map((e: string) => `  - ${e}`)].join("\n");
    return { valid: false, message: msg, exitCode: 1 };
  }

  return {
    valid: true,
    message: options.format === "json"
      ? JSON.stringify({ valid: true, catalogPath, modelCount: catalog.models.length, errors: [] }, null, 2)
      : `Catalog at "${catalogPath}" is VALID (${catalog.models.length} models).`,
    exitCode: 0,
  };
}
