import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { ModelInfo, ModelCatalog } from "@wma/core";

export function loadModelCatalog(catalogDirOrFile: string): ModelCatalog {
  try {
    const resolved = path.resolve(catalogDirOrFile);

    const modelsPath = existsSync(resolved) && !resolved.endsWith(".json")
      ? path.join(resolved, "models.json")
      : resolved;

    if (!existsSync(modelsPath)) {
      console.warn(`Catalog file not found: ${modelsPath}`);
      return { version: "1.0", updatedAt: new Date().toISOString().split("T")[0], models: [] };
    }

    const raw = readFileSync(modelsPath, "utf-8");
    const parsed = JSON.parse(raw);

    let models: ModelInfo[];
    if (Array.isArray(parsed)) {
      models = parsed as ModelInfo[];
    } else if (parsed.models && Array.isArray(parsed.models)) {
      models = parsed.models as ModelInfo[];
    } else {
      models = [];
    }

    return {
      version: parsed.version ?? "1.0",
      updatedAt: parsed.updatedAt ?? new Date().toISOString().split("T")[0],
      models,
    };
  } catch (error) {
    console.error(`Failed to load model catalog:`, error);
    return { version: "1.0", updatedAt: new Date().toISOString().split("T")[0], models: [] };
  }
}

export function validateModelCatalog(models: ModelInfo[]): string[] {
  const warnings: string[] = [];

  for (const model of models) {
    if (!model.id) {
      warnings.push("Model entry is missing an id");
      continue;
    }

    if (!model.displayName) {
      warnings.push(`Model "${model.id}" is missing a displayName`);
    }

    if (!model.provider) {
      warnings.push(`Model "${model.id}" is missing a provider`);
    }

    if (model.contextWindow < 0) {
      warnings.push(`Model "${model.id}" has a negative contextWindow`);
    }

    if (model.maxOutputTokens < 0) {
      warnings.push(`Model "${model.id}" has a negative maxOutputTokens`);
    }

    if (model.inputPricePerMillion < 0) {
      warnings.push(`Model "${model.id}" has a negative inputPricePerMillion`);
    }

    if (model.cachedInputPricePerMillion !== null && model.cachedInputPricePerMillion < 0) {
      warnings.push(`Model "${model.id}" has a negative cachedInputPricePerMillion`);
    }

    if (model.outputPricePerMillion < 0) {
      warnings.push(`Model "${model.id}" has a negative outputPricePerMillion`);
    }

    if (!model.updatedAt) {
      warnings.push(`Model "${model.id}" is missing an updatedAt date`);
    }
  }

  return warnings;
}

export function filterModelsByContext(models: ModelInfo[], requiredTokens: number): ModelInfo[] {
  return models.filter(m => m.contextWindow >= requiredTokens);
}

export function normalizePricing(model: ModelInfo): ModelInfo {
  if (model.cachedInputPricePerMillion !== null) {
    return { ...model };
  }

  return {
    ...model,
    cachedInputPricePerMillion: model.inputPricePerMillion,
  };
}

export function getModelById(catalog: ModelCatalog, modelId: string): ModelInfo | undefined {
  return catalog.models.find(m => m.id === modelId);
}

export function getModelsByProvider(catalog: ModelCatalog, provider: string): ModelInfo[] {
  return catalog.models.filter(m => m.provider === provider);
}
