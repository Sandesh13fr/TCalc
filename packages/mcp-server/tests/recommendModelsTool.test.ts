import { describe, it, expect, beforeAll } from "vitest";
import { handleRecommendModels } from "../src/tools/recommendModelsTool.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, "../../../fixtures/small-node-app");
const catalogPath = path.resolve(__dirname, "../../../catalogs/models.json");

describe("recommendModelsTool", () => {
  it("should return three recommendation tiers when catalog available", async () => {
    const result = await handleRecommendModels({
      rootPath: fixturePath,
      goal: "build-mvp",
      catalogPath,
    });

    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.goal).toBe("build-mvp");
    expect(parsed.workspaceTokens).toBeGreaterThan(0);
    expect(parsed.cheapestSufficient).toBeDefined();
    expect(parsed.balanced).toBeDefined();
    expect(parsed.highConfidence).toBeDefined();
    expect(parsed.rejected).toBeInstanceOf(Array);
    expect(parsed.assumptions).toBeInstanceOf(Array);
    for (const tier of [
      parsed.cheapestSufficient,
      parsed.balanced,
      parsed.highConfidence,
    ]) {
      expect(tier.overflowRisk).toBe(0);
      expect(tier.warnings).toBeInstanceOf(Array);
      expect(tier.optimizationSuggestions).toBeInstanceOf(Array);
    }

    expect(parsed).not.toHaveProperty("allScored");
    expect(JSON.stringify(parsed).length).toBeLessThan(10_000);
  });

  it("preserves overflow warnings when no model fits", async () => {
    const tempDir = mkdtempSync(
      path.join(process.cwd(), ".tcalc-overflow-catalog-"),
    );

    try {
      const catalog = JSON.parse(readFileSync(catalogPath, "utf-8"));

      catalog.models = catalog.models.map((model: Record<string, unknown>) => ({
        ...model,
        contextWindow: 8,
        maxOutputTokens: 4,
      }));

      const customCatalogPath = path.join(tempDir, "models.json");
      writeFileSync(customCatalogPath, JSON.stringify(catalog));

      const result = await handleRecommendModels({
        rootPath: fixturePath,
        goal: "build-mvp",
        privacyMode: "cloud-ok",
        catalogPath: customCatalogPath,
      });

      const parsed = JSON.parse(result.content[0].text);
      const tiers = [
        parsed.cheapestSufficient,
        parsed.balanced,
        parsed.highConfidence,
      ];

      for (const tier of tiers) {
        expect(tier.overflowRisk).toBeGreaterThan(0);
        expect(tier.warnings).toContain(
          "Context window insufficient — overflow likely; consider repo-map-first strategy",
        );
        expect(tier.optimizationSuggestions).toContain(
          "Use a repo map instead of full workspace to reduce context",
        );
      }

      expect(parsed).not.toHaveProperty("allScored");
      expect(JSON.stringify(parsed).length).toBeLessThan(10_000);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should handle missing catalog gracefully", async () => {
    const result = await handleRecommendModels({
      rootPath: fixturePath,
      catalogPath: "/nonexistent/path/catalog.json",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBeDefined();
  });

  it("should default to build-mvp goal", async () => {
    const result = await handleRecommendModels({
      rootPath: fixturePath,
      catalogPath,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.goal).toBe("build-mvp");
  });

  it("should support different goals", async () => {
    const result = await handleRecommendModels({
      rootPath: fixturePath,
      goal: "debug",
      catalogPath,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.goal).toBe("debug");
  });

  it("should filter by privacy mode", async () => {
    const result = await handleRecommendModels({
      rootPath: fixturePath,
      privacyMode: "local-first",
      catalogPath,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toBeDefined();
  });

  it("rejects invalid custom catalog records", async () => {
    const root = mkdtempSync(path.join(process.cwd(), ".tcalc-invalid-catalog-"));
    try {
      writeFileSync(path.join(root, "index.ts"), "export const value = 1;");
      const invalidCatalog = path.join(root, "models.json");
      writeFileSync(invalidCatalog, JSON.stringify({ version: "1.0", updatedAt: "2026-07-01", models: [{ id: "broken" }] }));
      const result = await handleRecommendModels({ rootPath: root, catalogPath: invalidCatalog });
      expect(JSON.parse(result.content[0].text).error).toMatch(/displayName/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
