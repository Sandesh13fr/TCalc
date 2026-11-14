import {
  fetchCatalogFeed,
  loadModelCatalog,
  validateCatalogFreshness,
  validateModelCatalog,
} from "@wma/model-catalog";

import type { ModelCatalog } from "@wma/core";

export interface CatalogValidateOptions {
  path?: string;
  format?: string;
  debug?: boolean;
  maxAgeDays?: number;
  now?: Date;
}

interface CatalogValidateResult {
  valid: boolean;
  message: string;
  exitCode: number;
}

function createValidationResult(
  valid: boolean,
  catalogPath: string,
  modelCount: number,
  errors: string[],
  format?: string,
): CatalogValidateResult {
  const exitCode = valid ? 0 : 1;

  const message =
    format === "json"
      ? JSON.stringify(
          { valid, catalogPath, modelCount, errors },
          null,
          2,
        )
      : valid
        ? `Catalog at "${catalogPath}" is VALID (${modelCount} models).`
        : [
            `Catalog at "${catalogPath}" is INVALID.`,
            "",
            ...errors.map((error) => `  - ${error}`),
          ].join("\n");

  return { valid, message, exitCode };
}

export async function executeCatalogFetch(
  url: string,
): Promise<string> {
  return JSON.stringify(await fetchCatalogFeed(url), null, 2);
}

export async function executeCatalogValidate(
  options: CatalogValidateOptions,
): Promise<CatalogValidateResult> {
  const catalogPath = options.path ?? "catalogs/models.json";

  // Validate maxAgeDays before checking catalog freshness.
  if (
    options.maxAgeDays !== undefined &&
    (!Number.isFinite(options.maxAgeDays) ||
      options.maxAgeDays < 0)
  ) {
    return createValidationResult(
      false,
      catalogPath,
      0,
      ["maxAgeDays must be a non-negative finite number"],
      options.format,
    );
  }

  // Validate the supplied date.
  if (
    options.now !== undefined &&
    Number.isNaN(options.now.getTime())
  ) {
    return createValidationResult(
      false,
      catalogPath,
      0,
      ["Invalid date supplied in now option"],
      options.format,
    );
  }

  let catalog: ModelCatalog;

  try {
    catalog = loadModelCatalog(catalogPath);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return createValidationResult(
      false,
      catalogPath,
      0,
      [`Failed to load catalog: ${errorMessage}`],
      options.format,
    );
  }

  if (!catalog.models || catalog.models.length === 0) {
    return createValidationResult(
      false,
      catalogPath,
      0,
      ["No models found"],
      options.format,
    );
  }

  const errors = [
    ...validateModelCatalog(catalog.models),
    ...validateCatalogFreshness(
      catalog,
      options.maxAgeDays,
      options.now,
    ),
  ];

  const valid = errors.length === 0;

  if (options.debug) {
    console.debug("Catalog validation:", {
      catalogPath,
      modelCount: catalog.models.length,
      errors,
      valid,
    });
  }

  return createValidationResult(
    valid,
    catalogPath,
    catalog.models.length,
    errors,
    options.format,
  );
}
