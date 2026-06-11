import { loadModelCatalog, validateModelCatalog } from "@wma/model-catalog";
import type { ModelCatalog } from "@wma/core";

export interface CatalogValidateOptions {
  path?: string;
  format?: string;
  debug?: boolean;
}

export async function executeCatalogValidate(options: CatalogValidateOptions): Promise<{ valid: boolean; message: string; exitCode: number }> {
  const catalogPath = options.path ?? "catalogs/models.json";
  const catalog: ModelCatalog = loadModelCatalog(catalogPath);

  if (catalog.models.length === 0) {
    return {
      valid: false,
      message: `No models found in catalog at "${catalogPath}".`,
      exitCode: 1,
    };
  }

  const errors = validateModelCatalog(catalog.models);
  if (errors.length > 0) {
    const msg = [`Catalog at "${catalogPath}" is INVALID.`, "", ...errors.map((e: string) => `  - ${e}`)].join("\n");
    return { valid: false, message: msg, exitCode: 1 };
  }

  return {
    valid: true,
    message: `Catalog at "${catalogPath}" is VALID (${catalog.models.length} models).`,
    exitCode: 0,
  };
}
