import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { ModelInfo, ModelCatalog } from "@wma/core";

export function loadModelCatalog(
  catalogDirOrFile: string,
  options: { warnIfMissing?: boolean } = {},
): ModelCatalog {
  try {
    const resolved = path.resolve(catalogDirOrFile);

    const modelsPath = existsSync(resolved) && !resolved.endsWith(".json")
      ? path.join(resolved, "models.json")
      : resolved;

    if (!existsSync(modelsPath)) {
      if (options.warnIfMissing !== false) console.warn(`Catalog file not found: ${modelsPath}`);
      return { version: "1.0", updatedAt: new Date().toISOString().split("T")[0], models: [] };
    }

    const raw = readFileSync(modelsPath, "utf-8");
    const parsed = JSON.parse(raw);

    return parseModelCatalog(parsed);
  } catch (error) {
    console.error(`Failed to load model catalog:`, error);
    return { version: "1.0", updatedAt: new Date().toISOString().split("T")[0], models: [] };
  }
}

export function parseModelCatalog(value: unknown): ModelCatalog {
  const today = new Date().toISOString().split("T")[0];
  if (Array.isArray(value)) return { version: "1.0", updatedAt: today, models: value as ModelInfo[] };
  if (!isRecord(value)) return { version: "1.0", updatedAt: today, models: [] };
  return {
    version: typeof value.version === "string" ? value.version : "1.0",
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : today,
    models: Array.isArray(value.models) ? value.models as ModelInfo[] : [],
  };
}

export function validateModelCatalog(models: readonly unknown[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  models.forEach((value, index) => {
    if (!isRecord(value)) {
      errors.push(`Model entry ${index + 1} must be an object`);
      return;
    }

    const id = nonEmptyString(value.id) ? value.id : `entry ${index + 1}`;
    if (!nonEmptyString(value.id)) errors.push(`Model ${id} is missing a non-empty id`);
    else if (ids.has(value.id)) errors.push(`Duplicate model id "${value.id}"`);
    else ids.add(value.id);

    requireString(value, "displayName", id, errors);
    requireString(value, "provider", id, errors);
    requirePositiveInteger(value, "contextWindow", id, errors);
    requirePositiveInteger(value, "maxOutputTokens", id, errors);
    requireNonNegativeNumber(value, "inputPricePerMillion", id, errors);
    if (value.cachedInputPricePerMillion !== null) {
      requireNonNegativeNumber(value, "cachedInputPricePerMillion", id, errors);
    }
    requireNonNegativeNumber(value, "outputPricePerMillion", id, errors);
    requireBoolean(value, "supportsTools", id, errors);
    requireBoolean(value, "supportsImages", id, errors);
    requireBoolean(value, "supportsLocal", id, errors);

    if (!(["cloud", "local", "hybrid"] as unknown[]).includes(value.privacyMode)) {
      errors.push(`Model "${id}" has invalid privacyMode`);
    }
    validateOptionalScore(value, "codingScore", id, errors);
    if (value.reasoningScore !== undefined) validateOptionalScore(value, "reasoningScore", id, errors);
    validateOptionalScore(value, "latencyScore", id, errors);
    if (!validDateString(value.updatedAt)) errors.push(`Model "${id}" has an invalid updatedAt date`);

    if (finiteNumber(value.maxOutputTokens) && finiteNumber(value.contextWindow) && value.maxOutputTokens > value.contextWindow) {
      errors.push(`Model "${id}" maxOutputTokens exceeds contextWindow`);
    }
  });

  return errors;
}

export function validateCatalogFreshness(catalog: ModelCatalog, maxAgeDays = 90, now = new Date()): string[] {
  if (!validDateString(catalog.updatedAt)) return ["Catalog has an invalid updatedAt date"];
  const updated = new Date(`${catalog.updatedAt}T00:00:00Z`);
  const ageDays = Math.floor((now.getTime() - updated.getTime()) / 86_400_000);
  if (ageDays < 0) return ["Catalog updatedAt date is in the future"];
  if (ageDays > maxAgeDays) return [`Catalog is ${ageDays} days old; review model metadata (maximum ${maxAgeDays} days)`];
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function requireString(model: Record<string, unknown>, field: string, id: string, errors: string[]): void {
  if (!nonEmptyString(model[field])) errors.push(`Model "${id}" is missing a non-empty ${field}`);
}

function requirePositiveInteger(model: Record<string, unknown>, field: string, id: string, errors: string[]): void {
  const value = model[field];
  if (!finiteNumber(value) || !Number.isSafeInteger(value) || value <= 0) errors.push(`Model "${id}" has invalid ${field}`);
}

function requireNonNegativeNumber(model: Record<string, unknown>, field: string, id: string, errors: string[]): void {
  const value = model[field];
  if (!finiteNumber(value) || value < 0) errors.push(`Model "${id}" has invalid ${field}`);
}

function requireBoolean(model: Record<string, unknown>, field: string, id: string, errors: string[]): void {
  if (typeof model[field] !== "boolean") errors.push(`Model "${id}" has invalid ${field}`);
}

function validateOptionalScore(model: Record<string, unknown>, field: string, id: string, errors: string[]): void {
  const value = model[field];
  if (value !== null && (!finiteNumber(value) || value < 0 || value > 100)) errors.push(`Model "${id}" has invalid ${field}`);
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
