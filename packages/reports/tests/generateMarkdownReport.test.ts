import { describe, it, expect } from "vitest";
import { generateMarkdownReport } from "../src/generateMarkdownReport.js";
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
    files: [
      {
        path: "/test/workspace/src/index.ts",
        relativePath: "src/index.ts",
        extension: ".ts",
        language: "TypeScript",
        bytes: 2000,
        estimatedTokens: 500,
        included: true,
        riskFlags: [],
      },
      {
        path: "/test/workspace/src/utils.ts",
        relativePath: "src/utils.ts",
        extension: ".ts",
        language: "TypeScript",
        bytes: 3000,
        estimatedTokens: 750,
        included: true,
        riskFlags: [],
      },
      {
        path: "/test/workspace/lib/helper.ts",
        relativePath: "lib/helper.ts",
        extension: ".ts",
        language: "TypeScript",
        bytes: 1000,
        estimatedTokens: 250,
        included: true,
        riskFlags: [],
      },
      {
        path: "/test/workspace/.env",
        relativePath: ".env",
        extension: ".env",
        language: "Unknown",
        bytes: 100,
        estimatedTokens: 0,
        included: false,
        excludedReason: "potential secret file",
        riskFlags: ["secret"],
      },
    ],
    folders: [
      {
        folderPath: "src",
        totalFiles: 2,
        totalBytes: 5000,
        totalTokens: 1250,
        includedFiles: 2,
        excludedFiles: 0,
      },
      {
        folderPath: "lib",
        totalFiles: 1,
        totalBytes: 1000,
        totalTokens: 250,
        includedFiles: 1,
        excludedFiles: 0,
      },
    ],
    languages: [
      {
        language: "TypeScript",
        fileCount: 3,
        totalBytes: 6000,
        totalTokens: 1500,
        percentage: 100,
      },
    ],
    warnings: [],
    riskFiles: [
      {
        path: "/test/workspace/.env",
        relativePath: ".env",
        extension: ".env",
        language: "Unknown",
        bytes: 100,
        estimatedTokens: 0,
        included: false,
        excludedReason: "potential secret file",
        riskFlags: ["secret"],
      },
    ],
  };
}

function createMockRecommendation(): RecommendationResult {
  return {
    goal: "debug",
    workspaceTokens: 10000,
    cheapestSufficient: {
      modelId: "cheap-model",
      displayName: "Cheap Model",
      tier: "cheapest-sufficient",
      score: {
        contextFit: 0.8,
        taskQualityFit: 0.6,
        costEfficiency: 0.9,
        latencyFit: 0.7,
        privacyFit: 1.0,
        totalScore: 0.75,
      },
      costEstimate: {
        inputTokens: 12000,
        cachedInputTokens: 3000,
        outputTokens: 4000,
        inputCost: 0.0018,
        cachedInputCost: 0.00045,
        outputCost: 0.0024,
        totalCost: 0.00465,
      },
      reasons: ["Adequate context window (16K tokens)", "Cost-efficient for this task"],
      overflowRisk: 0,
      expectedQuality: "high",
      warnings: [],
      optimizationSuggestions: ["Enable prompt caching if supported by your provider"],
    },
    balanced: {
      modelId: "mid-model",
      displayName: "Mid Model",
      tier: "balanced",
      score: {
        contextFit: 0.9,
        taskQualityFit: 0.8,
        costEfficiency: 0.6,
        latencyFit: 0.8,
        privacyFit: 0.7,
        totalScore: 0.8,
      },
      costEstimate: {
        inputTokens: 12000,
        cachedInputTokens: 3000,
        outputTokens: 4000,
        inputCost: 0.012,
        cachedInputCost: 0.006,
        outputCost: 0.016,
        totalCost: 0.034,
      },
      reasons: ["Adequate context window (128K tokens)", "Strong coding benchmarks (70/100)"],
      overflowRisk: 0,
      expectedQuality: "high",
      warnings: [],
      optimizationSuggestions: ["Enable prompt caching if supported by your provider"],
    },
    highConfidence: {
      modelId: "big-model",
      displayName: "Big Model",
      tier: "high-confidence",
      score: {
        contextFit: 1.0,
        taskQualityFit: 0.95,
        costEfficiency: 0.3,
        latencyFit: 0.5,
        privacyFit: 0.4,
        totalScore: 0.85,
      },
      costEstimate: {
        inputTokens: 12000,
        cachedInputTokens: 3000,
        outputTokens: 4000,
        inputCost: 0.18,
        cachedInputCost: 0.09,
        outputCost: 0.3,
        totalCost: 0.57,
      },
      reasons: ["Strong coding benchmarks (95/100)", "Tool/function calling support"],
      overflowRisk: 0,
      expectedQuality: "high",
      warnings: [],
      optimizationSuggestions: [
        "Use a repo map instead of full workspace to reduce context",
        "Enable prompt caching if supported by your provider",
      ],
    },
    rejected: [],
    assumptions: [
      'Output tokens estimated for "debug" goal: 4000',
      "20% safety margin added to context (14400 tokens required)",
    ],
    allScored: [],
  };
}

describe("generateMarkdownReport", () => {
  it("should contain expected sections", () => {
    const report = generateMarkdownReport(createMockScanResult(), createMockRecommendation());
    expect(report).toContain("# Workspace Model Report");
    expect(report).toContain("## Summary");
    expect(report).toContain("## Recommendations");
    expect(report).toContain("## Assumptions");
    expect(report).toContain("## Estimated Costs");
    expect(report).toContain("## Optimization Checklist");
  });

  it("should include key data from scan result", () => {
    const report = generateMarkdownReport(createMockScanResult(), createMockRecommendation());
    expect(report).toContain("10");
    expect(report).toContain("8");
    expect(report).toContain("2");
    expect(report).toContain("12,500");
    expect(report).toContain("10,000");
  });

  it("should include all three model recommendations", () => {
    const report = generateMarkdownReport(createMockScanResult(), createMockRecommendation());
    expect(report).toContain("Cheap Model");
    expect(report).toContain("Mid Model");
    expect(report).toContain("Big Model");
  });

  it("should include model IDs in recommendations", () => {
    const report = generateMarkdownReport(createMockScanResult(), createMockRecommendation());
    expect(report).toContain("cheap-model");
    expect(report).toContain("mid-model");
    expect(report).toContain("big-model");
  });

  it("should include cost information in report", () => {
    const report = generateMarkdownReport(createMockScanResult(), createMockRecommendation());
    expect(report).toContain("$0.0046");
    expect(report).toContain("$0.0340");
    expect(report).toContain("$0.5700");
  });

  it("should include language breakdown", () => {
    const report = generateMarkdownReport(createMockScanResult(), createMockRecommendation());
    expect(report).toContain("Language Breakdown");
    expect(report).toContain("TypeScript");
  });

  it("should include risk flags section when risk files exist", () => {
    const report = generateMarkdownReport(createMockScanResult(), createMockRecommendation());
    expect(report).toContain("Risk Flags");
    expect(report).toContain(".env");
    expect(report).toContain("secret");
  });

  it("should include folder statistics", () => {
    const report = generateMarkdownReport(createMockScanResult(), createMockRecommendation());
    expect(report).toContain("Top 10 Folders");
    expect(report).toContain("src");
  });

  it("should include assumptions section content", () => {
    const report = generateMarkdownReport(createMockScanResult(), createMockRecommendation());
    expect(report).toContain("debug");
    expect(report).toContain("4000");
  });

  it("should include optimization checklist with unique items", () => {
    const report = generateMarkdownReport(createMockScanResult(), createMockRecommendation());
    expect(report).toContain("- [ ]");
    expect(report).toContain("Enable prompt caching");
  });

  it("should handle empty warnings gracefully", () => {
    const scanResult = createMockScanResult();
    scanResult.warnings = ["Test warning"];
    const report = generateMarkdownReport(scanResult, createMockRecommendation());
    expect(report).toContain("Warnings");
    expect(report).toContain("Test warning");
  });

  it("should handle empty risk files gracefully", () => {
    const scanResult = createMockScanResult();
    scanResult.riskFiles = [];
    const report = generateMarkdownReport(scanResult, createMockRecommendation());
    expect(report).not.toContain("Risk Flags");
  });

  it("should handle null recommendation safely", () => {
    const report = generateMarkdownReport(createMockScanResult(), null);
    expect(report).toContain("Recommendations unavailable");
    expect(report).toContain("No cost estimates available");
    expect(report).toContain("No optimizations suggested");
    expect(report).not.toContain("Cheapest Sufficient");
  });

  it("does not render NaN percentages for zero-token files", () => {
    const scan = createMockScanResult();
    scan.includedTokens = 0;
    scan.files[0].estimatedTokens = 0;
    scan.folders[0].totalTokens = 0;
    expect(generateMarkdownReport(scan, null)).not.toContain("NaN%");
  });

  it("escapes hostile paths and warning text", () => {
    const scanResult = createMockScanResult();
    scanResult.rootPath = "/tmp/a`b|c";
    scanResult.files[0].relativePath = "src/a`b|c.ts";
    scanResult.warnings = ["warning\n## injected"];
    const report = generateMarkdownReport(scanResult, createMockRecommendation());

    expect(report).toContain("a`b&#124;c");
    expect(report).toContain("warning \\#\\# injected");
    expect(report).not.toContain("\n## injected");
  });
});
