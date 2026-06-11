import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadModelCatalog } from "../src/loadModelCatalog.js";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("loadModelCatalog", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "wma-catalog-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should return empty catalog for missing path", () => {
    const result = loadModelCatalog(join(tmpDir, "nonexistent"));
    expect(result.models).toEqual([]);
  });

  it("should load catalog from a directory with models.json", () => {
    const catalogData = { version: "2.0", updatedAt: "2025-01-01", models: [{ id: "test", displayName: "Test", provider: "test", contextWindow: 1000, maxOutputTokens: 500, inputPricePerMillion: 1, cachedInputPricePerMillion: 0.5, outputPricePerMillion: 2, supportsTools: false, supportsImages: false, supportsLocal: true, privacyMode: "local", codingScore: 50, latencyScore: 80, updatedAt: "2025-01-01" }] };
    writeFileSync(join(tmpDir, "models.json"), JSON.stringify(catalogData));
    const result = loadModelCatalog(tmpDir);
    expect(result.models).toHaveLength(1);
    expect(result.models[0].id).toBe("test");
  });

  it("should load catalog from a direct file path", () => {
    const catalogData = { version: "1.0", updatedAt: "2025-01-01", models: [] };
    const filePath = join(tmpDir, "custom.json");
    writeFileSync(filePath, JSON.stringify(catalogData));
    const result = loadModelCatalog(filePath);
    expect(result.models).toEqual([]);
  });

  it("should handle catalog as an array directly", () => {
    const models = [{ id: "a", displayName: "A", provider: "test", contextWindow: 1000, maxOutputTokens: 500, inputPricePerMillion: 1, cachedInputPricePerMillion: 0.5, outputPricePerMillion: 2, supportsTools: false, supportsImages: false, supportsLocal: true, privacyMode: "local", codingScore: 50, latencyScore: 80, updatedAt: "2025-01-01" }];
    const filePath = join(tmpDir, "array.json");
    writeFileSync(filePath, JSON.stringify(models));
    const result = loadModelCatalog(filePath);
    expect(result.models).toHaveLength(1);
    expect(result.models[0].id).toBe("a");
  });

  it("should return empty catalog for invalid JSON", () => {
    const filePath = join(tmpDir, "bad.json");
    writeFileSync(filePath, "not valid json");
    const result = loadModelCatalog(filePath);
    expect(result.models).toEqual([]);
  });
});
