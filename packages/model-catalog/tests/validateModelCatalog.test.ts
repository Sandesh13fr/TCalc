import { describe, expect, it } from "vitest";
import type { ModelCatalog, ModelInfo } from "@wma/core";
import { validateCatalogFreshness, validateModelCatalog } from "../src/loadModelCatalog.js";

function model(overrides: Partial<ModelInfo> = {}): ModelInfo {
  return {
    id: "provider/model",
    displayName: "Model",
    provider: "provider",
    contextWindow: 128_000,
    maxOutputTokens: 16_000,
    inputPricePerMillion: 1,
    cachedInputPricePerMillion: null,
    outputPricePerMillion: 2,
    supportsTools: true,
    supportsImages: false,
    supportsLocal: false,
    privacyMode: "cloud",
    codingScore: 80,
    latencyScore: 70,
    updatedAt: "2026-07-01",
    ...overrides,
  };
}

describe("validateModelCatalog", () => {
  it("accepts complete model records", () => {
    expect(validateModelCatalog([model()])).toEqual([]);
  });

  it("rejects duplicate IDs and malformed runtime values", () => {
    const invalid = { ...model(), contextWindow: Number.NaN, supportsTools: "yes", privacyMode: "private" };
    const errors = validateModelCatalog([invalid, model()]);

    expect(errors).toContain('Duplicate model id "provider/model"');
    expect(errors.some((error) => error.includes("contextWindow"))).toBe(true);
    expect(errors.some((error) => error.includes("supportsTools"))).toBe(true);
    expect(errors.some((error) => error.includes("privacyMode"))).toBe(true);
  });

  it("rejects output limits larger than the context window", () => {
    expect(validateModelCatalog([model({ contextWindow: 1000, maxOutputTokens: 2000 })]))
      .toContain('Model "provider/model" maxOutputTokens exceeds contextWindow');
  });

  it("rejects impossible calendar dates", () => {
    expect(validateModelCatalog([model({ updatedAt: "2026-02-31" })])[0]).toContain("invalid updatedAt");
  });
});

describe("validateCatalogFreshness", () => {
  it("flags catalogs that have not been reviewed within the limit", () => {
    const catalog: ModelCatalog = { version: "1.0", updatedAt: "2026-01-01", models: [] };
    expect(validateCatalogFreshness(catalog, 90, new Date("2026-07-19T00:00:00Z"))[0])
      .toContain("review model metadata");
  });

  it("accepts a recently reviewed catalog", () => {
    const catalog: ModelCatalog = { version: "1.0", updatedAt: "2026-07-01", models: [] };
    expect(validateCatalogFreshness(catalog, 90, new Date("2026-07-19T00:00:00Z"))).toEqual([]);
  });
});
