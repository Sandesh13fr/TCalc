import { describe, it, expect } from "vitest";
import type { ModelInfo } from "@wma/core";
import { analyzeCostOptimization } from "../src/costOptimizationAdvisor.js";

const sonnetModel: ModelInfo = {
  id: "claude-3-5-sonnet",
  displayName: "Claude 3.5 Sonnet",
  provider: "Anthropic",
  contextWindow: 200_000,
  maxOutputTokens: 8192,
  inputPricePerMillion: 3.0,
  cachedInputPricePerMillion: 0.3,
  outputPricePerMillion: 15.0,
  supportsTools: true,
  supportsImages: true,
  supportsLocal: false,
  privacyMode: "cloud",
  codingScore: 92,
  latencyScore: 75,
  updatedAt: "2025-01-01",
};

const haikuModel: ModelInfo = {
  id: "claude-3-5-haiku",
  displayName: "Claude 3.5 Haiku",
  provider: "Anthropic",
  contextWindow: 200_000,
  maxOutputTokens: 8192,
  inputPricePerMillion: 0.8,
  cachedInputPricePerMillion: 0.08,
  outputPricePerMillion: 4.0,
  supportsTools: true,
  supportsImages: false,
  supportsLocal: false,
  privacyMode: "cloud",
  codingScore: 78,
  latencyScore: 95,
  updatedAt: "2025-01-01",
};

const gpt4oMini: ModelInfo = {
  id: "gpt-4o-mini",
  displayName: "GPT-4o mini",
  provider: "OpenAI",
  contextWindow: 128_000,
  maxOutputTokens: 16384,
  inputPricePerMillion: 0.15,
  cachedInputPricePerMillion: 0.075,
  outputPricePerMillion: 0.6,
  supportsTools: true,
  supportsImages: true,
  supportsLocal: false,
  privacyMode: "cloud",
  codingScore: 75,
  latencyScore: 92,
  updatedAt: "2025-01-01",
};

const localLlama: ModelInfo = {
  id: "llama-3-3-70b-local",
  displayName: "Llama 3.3 70B (Ollama)",
  provider: "Ollama",
  contextWindow: 128_000,
  maxOutputTokens: 8192,
  inputPricePerMillion: 0,
  cachedInputPricePerMillion: 0,
  outputPricePerMillion: 0,
  supportsTools: true,
  supportsImages: false,
  supportsLocal: true,
  privacyMode: "local",
  codingScore: 79,
  latencyScore: 60,
  updatedAt: "2025-01-01",
};

const tinyModel: ModelInfo = {
  id: "tiny-legacy-model",
  displayName: "Tiny Legacy Model",
  provider: "Legacy",
  contextWindow: 8000, // Too small for standard workload
  maxOutputTokens: 2048,
  inputPricePerMillion: 0.1,
  cachedInputPricePerMillion: null,
  outputPricePerMillion: 0.2,
  supportsTools: false,
  supportsImages: false,
  supportsLocal: false,
  privacyMode: "cloud",
  codingScore: 40,
  latencyScore: 90,
  updatedAt: "2025-01-01",
};

describe("analyzeCostOptimization", () => {
  it("computes baseline monthly spend for developer team accurately", () => {
    const advice = analyzeCostOptimization({
      baselineModel: sonnetModel,
      candidateModels: [haikuModel, gpt4oMini],
      developerCount: 4,
      workingDaysPerMonth: 20,
      workload: {
        name: "Custom Agent Load",
        dailyRunsPerDev: 10,
        avgInputTokens: 50_000,
        avgOutputTokens: 2_000,
        cacheHitRatio: 0.5,
      },
    });

    expect(advice.developerCount).toBe(4);
    expect(advice.workingDaysPerMonth).toBe(20);
    // 4 devs * 20 days * 10 runs = 800 runs
    // input non-cached = 25,000 => (25000/1M)*3 = $0.075
    // input cached = 25,000 => (25000/1M)*0.3 = $0.0075
    // output = 2,000 => (2000/1M)*15 = $0.03
    // per run = 0.075 + 0.0075 + 0.03 = 0.1125
    // 800 runs * 0.1125 = 90.00
    expect(advice.baselineMonthlySpend).toBe(90);
  });

  it("evaluates candidate plans and detects savings against baseline", () => {
    const advice = analyzeCostOptimization({
      baselineModel: sonnetModel,
      candidateModels: [haikuModel, gpt4oMini, localLlama],
      developerCount: 5,
      workingDaysPerMonth: 22,
    });

    expect(advice.alternativePlans.length).toBe(3);

    const miniPlan = advice.alternativePlans.find((p) => p.targetModelId === "gpt-4o-mini");
    expect(miniPlan).toBeDefined();
    expect(miniPlan!.monthlySavings).toBeGreaterThan(0);
    expect(miniPlan!.savingsPercent).toBeGreaterThan(80);
    expect(miniPlan!.costMultiplier).toBeLessThan(0.2);

    const localPlan = advice.alternativePlans.find((p) => p.targetModelId === "llama-3-3-70b-local");
    expect(localPlan).toBeDefined();
    expect(localPlan!.totalMonthlySpend).toBe(0);
    expect(localPlan!.savingsPercent).toBe(100);
    expect(localPlan!.recommendedRoles).toContain("Local / Offline Development");
  });

  it("filters out candidate models whose context window is insufficient", () => {
    const advice = analyzeCostOptimization({
      baselineModel: sonnetModel,
      candidateModels: [haikuModel, tinyModel],
      workload: {
        name: "Large Prompt Workflow",
        dailyRunsPerDev: 10,
        avgInputTokens: 50_000,
        avgOutputTokens: 2_000,
      },
      minContextWindowRequired: 52_000,
    });

    // tinyModel has 8000 context window, 8000 < 52000 * 0.75 (39000), so excluded
    expect(advice.alternativePlans.some((p) => p.targetModelId === "tiny-legacy-model")).toBe(false);
    expect(advice.alternativePlans.some((p) => p.targetModelId === "claude-3-5-haiku")).toBe(true);
  });

  it("identifies cheapestViablePlan and recommendedPlan", () => {
    const advice = analyzeCostOptimization({
      baselineModel: sonnetModel,
      candidateModels: [haikuModel, gpt4oMini],
    });

    expect(advice.cheapestViablePlan).toBeDefined();
    expect(advice.cheapestViablePlan?.targetModelId).toBe("gpt-4o-mini");
    expect(advice.recommendedPlan).toBeDefined();
  });

  it("constructs a 3-tier hybrid dispatch strategy with blended cost calculation", () => {
    const advice = analyzeCostOptimization({
      baselineModel: sonnetModel,
      candidateModels: [haikuModel, gpt4oMini],
    });

    expect(advice.hybridStrategy.rules.length).toBe(3);
    const triageTier = advice.hybridStrategy.rules.find((r) => r.tier === "fast_triage");
    const editTier = advice.hybridStrategy.rules.find((r) => r.tier === "balanced_editing");
    const reasoningTier = advice.hybridStrategy.rules.find((r) => r.tier === "complex_reasoning");

    expect(triageTier).toBeDefined();
    expect(triageTier?.trafficPercentage).toBe(60);
    expect(editTier?.trafficPercentage).toBe(30);
    expect(reasoningTier?.trafficPercentage).toBe(10);
    expect(reasoningTier?.modelId).toBe(sonnetModel.id);

    expect(advice.hybridStrategy.blendedMonthlyCost).toBeLessThan(advice.baselineMonthlySpend);
    expect(advice.hybridStrategy.monthlySavings).toBeGreaterThan(0);
    expect(advice.hybridStrategy.summary).toContain("Tiered dispatching delivers");
  });

  it("handles fallback gracefully when no candidate models are provided", () => {
    const advice = analyzeCostOptimization({
      baselineModel: sonnetModel,
      candidateModels: [],
    });

    expect(advice.alternativePlans).toHaveLength(0);
    expect(advice.cheapestViablePlan).toBeUndefined();
    expect(advice.hybridStrategy.blendedMonthlyCost).toBe(advice.baselineMonthlySpend);
    expect(advice.hybridStrategy.rules[0].tier).toBe("balanced_editing");
    expect(advice.hybridStrategy.rules[0].trafficPercentage).toBe(100);
  });
});
