import { z } from "zod";
import { existsSync } from "node:fs";
import { loadModelCatalog, validateCatalogFreshness, validateModelCatalog } from "@wma/model-catalog";
import { setLatestCatalog, getLatestCatalog } from "../state.js";
import { resolveCatalogPath } from "../utils/safeRootPath.js";

const ValidateModelCatalogInputSchema = z.object({
  catalogPath: z.string().optional(),
}).strict();

export type ValidateModelCatalogInput = z.infer<typeof ValidateModelCatalogInputSchema>;

export interface ValidateModelCatalogOutput {
  valid: boolean;
  modelCount: number;
  errors: string[];
}

export async function handleValidateModelCatalog(input: Record<string, unknown>): Promise<{ content: { type: "text"; text: string }[] }> {
  const parsed = ValidateModelCatalogInputSchema.parse(input);

  let catalogPath: string;
  try {
    catalogPath = resolveCatalogPath(parsed.catalogPath);
  } catch (error) {
    return invalidCatalog(error instanceof Error ? error.message : String(error));
  }
  const fileExists = existsSync(catalogPath);
  const catalog = loadModelCatalog(catalogPath);
  const errors = [...validateModelCatalog(catalog.models), ...validateCatalogFreshness(catalog)];

  if (!fileExists) {
    errors.push(`Catalog file not found at: ${catalogPath}`);
  } else if (catalog.models.length === 0) {
    errors.push("Catalog file contains no models");
  }

  setLatestCatalog(catalog);

  const output: ValidateModelCatalogOutput = {
    valid: errors.length === 0,
    modelCount: catalog.models.length,
    errors,
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(output, null, 2),
      },
    ],
  };
}

function invalidCatalog(error: string) {
  const output: ValidateModelCatalogOutput = { valid: false, modelCount: 0, errors: [error] };
  return { content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }] };
}
