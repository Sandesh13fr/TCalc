import { describe, it, expect, beforeAll } from "vitest";
import { handleRecommendModels } from "../src/tools/recommendModelsTool.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
});