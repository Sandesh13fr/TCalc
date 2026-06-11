import { describe, it, expect } from "vitest";
import { generateJsonReport } from "../src/generateJsonReport.js";
import type { WorkspaceScanResult, RecommendationResult } from "@wma/core";

function createMockScanResult(): WorkspaceScanResult {
  return {
    rootPath: "/test/workspace",
    scannedAt: "2025-06-09T12:00:00.000Z",
    totalFiles: 10,
    includedFiles: 8,
    excludedFiles: 2,
    totalBytes: 50000,
    includedBytes: 45000,
    totalEstimatedTokens: 12500,
    includedTokens: 10000,
    files: [],
    folders: [],
    languages: [],
    warnings: [],
    riskFiles: [],
  };
}

function createMockRecommendation(): RecommendationResult {
  return {
    goal: "debug",
    workspaceTokens: 10000,
    cheapestSufficient: {
      modelId: "cheap",
      displayName: "Cheap Model",
      tier: "cheapest-sufficient",
      score: { contextFit: 0.8, taskQualityFit: 0.6, costEfficiency: 0.9, latencyFit: 0.7, privacyFit: 1.0, totalScore: 0.75 },
      costEstimate: { inputTokens: 12000, cachedInputTokens: 3000, outputTokens: 4000, inputCost: 0.0018, cachedInputCost: 0.00045, outputCost: 0.0024, totalCost: 0.00465 },
      reasons: ["Cost-efficient"],
      overflowRisk: 0,
      expectedQuality: "high",
      warnings: [],
      optimizationSuggestions: ["Enable prompt caching"],
    },
    balanced: {
      modelId: "mid",
      displayName: "Mid Model",
      tier: "balanced",
      score: { contextFit: 0.9, taskQualityFit: 0.8, costEfficiency: 0.6, latencyFit: 0.8, privacyFit: 0.7, totalScore: 0.8 },
      costEstimate: { inputTokens: 12000, cachedInputTokens: 3000, outputTokens: 4000, inputCost: 0.012, cachedInputCost: 0.006, outputCost: 0.016, totalCost: 0.034 },
      reasons: ["Good fit"],
      overflowRisk: 0,
      expectedQuality: "high",
      warnings: [],
      optimizationSuggestions: ["Enable prompt caching"],
    },
    highConfidence: {
      modelId: "big",
      displayName: "Big Model",
      tier: "high-confidence",
      score: { contextFit: 1.0, taskQualityFit: 0.95, costEfficiency: 0.3, latencyFit: 0.5, privacyFit: 0.4, totalScore: 0.85 },
      costEstimate: { inputTokens: 12000, cachedInputTokens: 3000, outputTokens: 4000, inputCost: 0.18, cachedInputCost: 0.09, outputCost: 0.3, totalCost: 0.57 },
      reasons: ["Strong benchmarks"],
      overflowRisk: 0,
      expectedQuality: "high",
      warnings: [],
      optimizationSuggestions: ["Enable prompt caching"],
    },
    rejected: [],
    assumptions: ["Test assumption"],
    allScored: [],
  };
}

describe("generateJsonReport", () => {
  it("should generate valid JSON", () => {
    const json = generateJsonReport(createMockScanResult(), createMockRecommendation());
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty("title");
    expect(parsed).toHaveProperty("summary");
  });

  it("should include scan data", () => {
    const json = generateJsonReport(createMockScanResult(), createMockRecommendation());
    const parsed = JSON.parse(json);
    expect(parsed.summary.totalFiles).toBe(10);
    expect(parsed.summary.includedTokens).toBe(10000);
  });

  it("should include recommendations", () => {
    const json = generateJsonReport(createMockScanResult(), createMockRecommendation());
    const parsed = JSON.parse(json);
    expect(parsed.recommendations.cheapestSufficient.modelId).toBe("cheap");
    expect(parsed.recommendations.balanced.modelId).toBe("mid");
    expect(parsed.recommendations.highConfidence.modelId).toBe("big");
  });

  it("should handle null recommendation safely", () => {
    const json = generateJsonReport(createMockScanResult(), null);
    const parsed = JSON.parse(json);
    expect(parsed.summary.totalFiles).toBe(10);
    expect(parsed.recommendations).toBeDefined();
  });
});
