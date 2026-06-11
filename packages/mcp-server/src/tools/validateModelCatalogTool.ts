import { z } from "zod";
import { existsSync } from "node:fs";
import { loadModelCatalog, validateModelCatalog } from "@wma/model-catalog";
import { setLatestCatalog, getLatestCatalog } from "../state.js";

const ValidateModelCatalogInputSchema = z.object({
  catalogPath: z.string().optional(),
});

export type ValidateModelCatalogInput = z.infer<typeof ValidateModelCatalogInputSchema>;

export interface ValidateModelCatalogOutput {
  valid: boolean;
  modelCount: number;
  errors: string[];
}

export async function handleValidateModelCatalog(input: Record<string, unknown>): Promise<{ content: { type: "text"; text: string }[] }> {
  const parsed = ValidateModelCatalogInputSchema.parse(input);

  const catalogPath = parsed.catalogPath ?? process.cwd();
  const fileExists = existsSync(catalogPath);
  const catalog = loadModelCatalog(catalogPath);
  const errors = validateModelCatalog(catalog.models);

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