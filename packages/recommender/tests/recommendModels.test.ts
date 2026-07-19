import { describe, it, expect } from "vitest";
import { recommendModels } from "../src/recommendModels.js";
import type { ModelInfo } from "@wma/core";

const tinyModel: ModelInfo = {
  id: "tiny",
  displayName: "Tiny Model",
  provider: "test",
  contextWindow: 4000,
  maxOutputTokens: 1024,
  inputPricePerMillion: 0.05,
  cachedInputPricePerMillion: 0.025,
  outputPricePerMillion: 0.1,
  supportsTools: false,
  supportsImages: false,
  supportsLocal: true,
  privacyMode: "local",
  codingScore: 25,
  latencyScore: 95,
  updatedAt: "2025-01-01",
};

const cheapModel: ModelInfo = {
  id: "cheap",
  displayName: "Cheap Model",
  provider: "test",
  contextWindow: 16000,
  maxOutputTokens: 4096,
  inputPricePerMillion: 0.15,
  cachedInputPricePerMillion: 0.075,
  outputPricePerMillion: 0.6,
  supportsTools: false,
  supportsImages: false,
  supportsLocal: true,
  privacyMode: "local",
  codingScore: 40,
  latencyScore: 90,
  updatedAt: "2025-01-01",
};

const midModel: ModelInfo = {
  id: "mid",
  displayName: "Mid Model",
  provider: "test",
  contextWindow: 128000,
  maxOutputTokens: 4096,
  inputPricePerMillion: 1.0,
  cachedInputPricePerMillion: 0.5,
  outputPricePerMillion: 4.0,
  supportsTools: true,
  supportsImages: false,
  supportsLocal: false,
  privacyMode: "hybrid",
  codingScore: 70,
  latencyScore: 70,
  updatedAt: "2025-01-01",
};

const bigModel: ModelInfo = {
  id: "big",
  displayName: "Big Model",
  provider: "test",
  contextWindow: 200000,
  maxOutputTokens: 8192,
  inputPricePerMillion: 15,
  cachedInputPricePerMillion: 7.5,
  outputPricePerMillion: 75,
  supportsTools: true,
  supportsImages: true,
  supportsLocal: false,
  privacyMode: "cloud",
  codingScore: 95,
  latencyScore: 40,
  updatedAt: "2025-01-01",
};

const weakModel: ModelInfo = {
  ...midModel,
  id: "weak",
  displayName: "Weak Model",
  codingScore: 45,
  reasoningScore: 40,
  inputPricePerMillion: 2,
  outputPricePerMillion: 8,
};

describe("recommendModels", () => {
  it("should select cheapest sufficient model based on total cost", () => {
    const result = recommendModels({
      models: [cheapModel, midModel, bigModel],
      workspaceTokens: 5000,
      goal: "debug",
    });
    expect(result.cheapestSufficient.modelId).toBe("cheap");
  });

  it("should select high-confidence model with highest coding score", () => {
    const result = recommendModels({
      models: [cheapModel, midModel, bigModel],
      workspaceTokens: 5000,
      goal: "build-mvp",
      privacyMode: "cloud-ok",
    });
    expect(result.highConfidence.modelId).toBe("big");
  });

  it("should select balanced model with highest total score", () => {
    const result = recommendModels({
      models: [cheapModel, midModel, bigModel],
      workspaceTokens: 5000,
      goal: "debug",
    });
    expect(result.balanced).toBeDefined();
  });

  it("should reject models with insufficient context window", () => {
    const result = recommendModels({
      models: [tinyModel, cheapModel],
      workspaceTokens: 5000,
      goal: "debug",
    });
    expect(result.rejected).toContain("tiny");
    expect(result.rejected).not.toContain("cheap");
  });

  it("should skip cloud models in local-first privacy mode", () => {
    const result = recommendModels({
      models: [cheapModel, bigModel],
      workspaceTokens: 5000,
      goal: "debug",
      privacyMode: "local-first",
    });
    const cheapInAll = result.allScored.find((m) => m.modelId === "cheap");
    const bigInAll = result.allScored.find((m) => m.modelId === "big");
    expect(cheapInAll).toBeDefined();
    expect(bigInAll).toBeUndefined();
  });

  it("reports when privacy filtering leaves no eligible models", () => {
    expect(() => recommendModels({
      models: [bigModel],
      workspaceTokens: 5000,
      goal: "debug",
      privacyMode: "local-first",
    })).toThrow('No models are eligible for privacy mode "local-first"');
  });

  it("should include cloud models when privacy mode is cloud-ok", () => {
    const result = recommendModels({
      models: [cheapModel, bigModel],
      workspaceTokens: 5000,
      goal: "debug",
      privacyMode: "cloud-ok",
    });
    const bigInAll = result.allScored.find((m) => m.modelId === "big");
    expect(bigInAll).toBeDefined();
  });

  it("should return recommendations for all three tiers", () => {
    const result = recommendModels({
      models: [cheapModel, midModel, bigModel],
      workspaceTokens: 5000,
      goal: "build-mvp",
    });
    expect(result.cheapestSufficient).toBeDefined();
    expect(result.balanced).toBeDefined();
    expect(result.highConfidence).toBeDefined();
  });

  it("should include assumptions in result", () => {
    const result = recommendModels({
      models: [cheapModel],
      workspaceTokens: 5000,
      goal: "debug",
    });
    expect(result.assumptions.length).toBeGreaterThan(0);
  });

  it("should include overflow models when no model fits context", () => {
    const result = recommendModels({
      models: [tinyModel],
      workspaceTokens: 10000,
      goal: "build-mvp",
    });
    expect(result.allScored.length).toBeGreaterThan(0);
    expect(result.rejected).toContain("tiny");
  });

  it("should respect user-specified output tokens", () => {
    const result = recommendModels({
      models: [cheapModel],
      workspaceTokens: 5000,
      goal: "debug",
      outputTokens: 2000,
    });
    expect(result.assumptions.some((a) => a.includes("2000"))).toBe(true);
  });

  it("should respect user-specified budget", () => {
    const result = recommendModels({
      models: [cheapModel],
      workspaceTokens: 5000,
      goal: "debug",
      budget: 3000,
    });
    expect(result.assumptions.some((a) => a.includes("3000"))).toBe(true);
  });

  it("does not inflate a workspace to fill a larger token budget", () => {
    const result = recommendModels({
      models: [cheapModel],
      workspaceTokens: 5000,
      goal: "debug",
      budget: 10000,
    });
    expect(result.cheapestSufficient.costEstimate.inputTokens).toBe(6000);
    expect(result.cheapestSufficient.costEstimate.cachedInputTokens).toBe(1500);
  });

  it("should provide expected quality in recommendations", () => {
    const result = recommendModels({
      models: [bigModel],
      workspaceTokens: 5000,
      goal: "build-mvp",
      privacyMode: "cloud-ok",
    });
    expect(["high", "medium", "low"]).toContain(result.balanced.expectedQuality);
  });

  it("should provide overflow risk in recommendations", () => {
    const result = recommendModels({
      models: [bigModel],
      workspaceTokens: 5000,
      goal: "debug",
      privacyMode: "cloud-ok",
    });
    expect(typeof result.balanced.overflowRisk).toBe("number");
  });

  it("should provide warnings for low coding score models", () => {
    const result = recommendModels({
      models: [tinyModel],
      workspaceTokens: 2000,
      goal: "build-mvp",
    });
    expect(result.balanced.warnings).toBeDefined();
  });

  it("should deduplicate tiers when same model wins multiple", () => {
    const result = recommendModels({
      models: [cheapModel, midModel],
      workspaceTokens: 5000,
      goal: "debug",
    });
    const tierIds = [
      result.cheapestSufficient.modelId,
      result.balanced.modelId,
      result.highConfidence.modelId,
    ];
    const uniqueIds = new Set(tierIds);
    expect(uniqueIds.size).toBeGreaterThanOrEqual(2);
  });

  it("should handle only one fitting model gracefully", () => {
    const result = recommendModels({
      models: [cheapModel],
      workspaceTokens: 5000,
      goal: "debug",
    });
    expect(result.cheapestSufficient).toBeDefined();
    expect(result.balanced).toBeDefined();
    expect(result.highConfidence).toBeDefined();
    const tierIds = new Set([
      result.cheapestSufficient.modelId,
      result.balanced.modelId,
      result.highConfidence.modelId,
    ]);
    expect(tierIds.size).toBe(1);
    expect(result.cheapestSufficient.modelId).toBe("cheap");
  });

  it("should deduplicate across all three tiers when enough models exist", () => {
    const result = recommendModels({
      models: [cheapModel, midModel],
      workspaceTokens: 5000,
      goal: "debug",
    });
    const tierIds = [
      result.cheapestSufficient.modelId,
      result.balanced.modelId,
      result.highConfidence.modelId,
    ];
    const uniqueIds = new Set(tierIds);
    expect(uniqueIds.size).toBeGreaterThanOrEqual(2);
  });

  it("uses each tier's ranking when selecting a distinct fallback", () => {
    const result = recommendModels({
      models: [cheapModel, weakModel, midModel, bigModel],
      workspaceTokens: 5000,
      goal: "build-mvp",
      privacyMode: "cloud-ok",
    });
    const tierIds = [
      result.cheapestSufficient.modelId,
      result.balanced.modelId,
      result.highConfidence.modelId,
    ];
    expect(new Set(tierIds).size).toBe(3);
    expect(tierIds).not.toContain("weak");
  });
});
