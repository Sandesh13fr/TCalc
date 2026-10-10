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

  it("reports finite absolute added cost when the baseline model is free", () => {
    const advice = analyzeCostOptimization({
      baselineModel: localLlama,
      candidateModels: [haikuModel],
      developerCount: 5,
      workingDaysPerMonth: 22,
    });

    const plan = advice.alternativePlans.find((p) => p.targetModelId === "claude-3-5-haiku");
    expect(plan).toBeDefined();
    expect(plan!.totalMonthlySpend).toBeGreaterThan(0);
    expect(plan!.tradeoffSummary).not.toContain("Infinity");
    expect(plan!.tradeoffSummary).toContain("Adds $");
    expect(plan!.tradeoffSummary).toContain("/mo over the zero-cost baseline");
  });

  it("treats a zero-to-zero comparison as cost-neutral instead of a percentage", () => {
    const secondFreeModel: ModelInfo = {
      ...localLlama,
      id: "llama-3-3-8b-local",
      displayName: "Llama 3.3 8B (Ollama)",
    };
    const advice = analyzeCostOptimization({
      baselineModel: localLlama,
      candidateModels: [secondFreeModel],
      developerCount: 5,
      workingDaysPerMonth: 22,
    });

    const plan = advice.alternativePlans[0];
    expect(plan).toBeDefined();
    expect(plan!.totalMonthlySpend).toBe(0);
    expect(plan!.tradeoffSummary).toContain("Cost-neutral");
    expect(plan!.tradeoffSummary).not.toContain("Infinity");
  });
  describe("positive-savings-only recommendations (#105)", () => {
    function expectAllNumbersFinite(value: unknown, path = "advice"): void {
      if (typeof value === "number") {
        expect(Number.isFinite(value), `${path} must be finite`).toBe(true);
      } else if (Array.isArray(value)) {
        value.forEach((item, i) => expectAllNumbersFinite(item, `${path}[${i}]`));
      } else if (value !== null && typeof value === "object") {
        for (const [key, child] of Object.entries(value)) {
          expectAllNumbersFinite(child, `${path}.${key}`);
        }
      }
    }

    function expectNoInvalidNumberText(advice: ReturnType<typeof analyzeCostOptimization>): void {
      const texts = [
        advice.hybridStrategy.summary,
        ...advice.alternativePlans.map((p) => p.tradeoffSummary),
      ];
      for (const text of texts) {
        expect(text).not.toMatch(/Infinity|NaN/);
      }
    }

    it("keeps every candidate in alternativePlans but recommends none when all cost more than the baseline", () => {
      const advice = analyzeCostOptimization({
        baselineModel: gpt4oMini,
        candidateModels: [sonnetModel, haikuModel],
        developerCount: 5,
        workingDaysPerMonth: 22,
      });

      expect(advice.alternativePlans.map((p) => p.targetModelId).sort()).toEqual([
        "claude-3-5-haiku",
        "claude-3-5-sonnet",
      ]);
      for (const plan of advice.alternativePlans) {
        expect(plan.monthlySavings).toBeLessThan(0);
        expect(plan.costMultiplier).toBeGreaterThan(1);
        expect(plan.tradeoffSummary).toContain("higher spend");
      }

      expect(advice.recommendedPlan).toBeUndefined();

      // Baseline fallback for the hybrid strategy: all traffic stays on the baseline.
      expect(advice.hybridStrategy.rules).toHaveLength(1);
      expect(advice.hybridStrategy.rules[0]).toMatchObject({
        tier: "balanced_editing",
        trafficPercentage: 100,
        modelId: gpt4oMini.id,
        allocatedMonthlyCost: advice.baselineMonthlySpend,
      });
      expect(advice.hybridStrategy.blendedMonthlyCost).toBe(advice.baselineMonthlySpend);
      expect(advice.hybridStrategy.monthlySavings).toBe(0);
      expect(advice.hybridStrategy.savingsPercent).toBe(0);
      expect(advice.hybridStrategy.summary).not.toContain("Tiered dispatching delivers");
      expect(advice.hybridStrategy.summary).toContain(gpt4oMini.displayName);
      expectAllNumbersFinite(advice);
    });

    it("does not recommend a candidate that costs exactly the same as the baseline", () => {
      const sameCostClone: ModelInfo = { ...sonnetModel, id: "sonnet-clone", displayName: "Sonnet Clone" };
      const advice = analyzeCostOptimization({
        baselineModel: sonnetModel,
        candidateModels: [sameCostClone],
      });

      expect(advice.alternativePlans).toHaveLength(1);
      expect(advice.alternativePlans[0].monthlySavings).toBe(0);
      expect(advice.recommendedPlan).toBeUndefined();
      expect(advice.hybridStrategy.rules).toHaveLength(1);
      expect(advice.hybridStrategy.rules[0].modelId).toBe(sonnetModel.id);
    });

    it("handles a truly free baseline without dividing by zero or claiming savings", () => {
      const advice = analyzeCostOptimization({
        baselineModel: localLlama,
        candidateModels: [haikuModel, gpt4oMini],
        developerCount: 5,
        workingDaysPerMonth: 22,
      });

      expect(advice.baselineMonthlySpend).toBe(0);
      expect(advice.alternativePlans).toHaveLength(2);
      for (const plan of advice.alternativePlans) {
        expect(plan.tradeoffSummary).toMatch(/^Adds \$\d+\.\d{2}\/mo over the zero-cost baseline/);
        expect(plan.tradeoffSummary).toContain("percentage uplift undefined");
        expect(plan.tradeoffSummary).not.toMatch(/Infinity|NaN|%\s+(cost reduction|higher spend)/);
        expect(plan.savingsPercent).toBe(0);
        expect(plan.costMultiplier).toBe(1);
        expect(plan.monthlySavings).toBeLessThan(0);
      }

      expect(advice.recommendedPlan).toBeUndefined();
      expect(advice.hybridStrategy.rules).toHaveLength(1);
      expect(advice.hybridStrategy.rules[0].modelId).toBe(localLlama.id);
      expect(advice.hybridStrategy.blendedMonthlyCost).toBe(0);
      expect(advice.hybridStrategy.savingsPercent).toBe(0);
      expectNoInvalidNumberText(advice);
      expectAllNumbersFinite(advice);
    });

    it("describes a sub-cent addition over a free baseline in absolute terms", () => {
      const microPriced: ModelInfo = {
        ...haikuModel,
        id: "micro-priced",
        displayName: "Micro Priced",
        inputPricePerMillion: 0.0001,
        cachedInputPricePerMillion: 0.0001,
        outputPricePerMillion: 0.0001,
      };
      const advice = analyzeCostOptimization({
        baselineModel: localLlama,
        candidateModels: [microPriced],
        developerCount: 1,
        workingDaysPerMonth: 1,
        workload: { name: "Tiny", dailyRunsPerDev: 1, avgInputTokens: 1000, avgOutputTokens: 100, cacheHitRatio: 0 },
      });

      const plan = advice.alternativePlans[0];
      expect(plan.totalMonthlySpend).toBe(0);
      expect(plan.tradeoffSummary).toContain("Adds less than $0.01/mo over the zero-cost baseline");
      expect(advice.recommendedPlan).toBeUndefined();
    });

    it("stays valid with zero runs: no NaN or infinities, candidates kept, baseline fallback", () => {
      for (const zeroRuns of [
        { developerCount: 0, workingDaysPerMonth: 22 },
        { developerCount: 5, workingDaysPerMonth: 0 },
      ]) {
        const advice = analyzeCostOptimization({
          baselineModel: sonnetModel,
          candidateModels: [haikuModel, gpt4oMini],
          ...zeroRuns,
        });

        expect(advice.baselineMonthlySpend).toBe(0);
        expect(advice.alternativePlans).toHaveLength(2);
        for (const plan of advice.alternativePlans) {
          expect(plan.totalMonthlySpend).toBe(0);
          expect(plan.monthlySavings).toBe(0);
          expect(plan.tradeoffSummary).toContain("No runs are projected");
          // A paid model with no usage is not described as a free baseline.
          expect(plan.tradeoffSummary).not.toContain("zero-cost baseline");
        }
        expect(advice.recommendedPlan).toBeUndefined();
        expect(advice.hybridStrategy.rules).toHaveLength(1);
        expect(advice.hybridStrategy.rules[0].modelId).toBe(sonnetModel.id);
        expect(advice.hybridStrategy.blendedMonthlyCost).toBe(0);
        expect(advice.hybridStrategy.monthlySavings).toBe(0);
        expectNoInvalidNumberText(advice);
        expectAllNumbersFinite(advice);
      }
    });

    describe("sub-cent paid baseline", () => {
      // 10 runs/month at 1,100 tokens: baseline costs ~$0.00011/mo, which rounds to $0.00.
      const subCentWorkload = {
        name: "Sub-cent",
        dailyRunsPerDev: 10,
        avgInputTokens: 1000,
        avgOutputTokens: 100,
        cacheHitRatio: 0,
      };
      const subCentBaseline: ModelInfo = {
        ...haikuModel,
        id: "sub-cent-baseline",
        displayName: "Sub-Cent Baseline",
        inputPricePerMillion: 0.01,
        cachedInputPricePerMillion: 0.01,
        outputPricePerMillion: 0.01,
      };
      const run = (candidateModels: ModelInfo[]) =>
        analyzeCostOptimization({
          baselineModel: subCentBaseline,
          candidateModels,
          developerCount: 1,
          workingDaysPerMonth: 1,
          workload: subCentWorkload,
        });

      it("is not treated as free when a pricier candidate rounds to a visible cent amount", () => {
        const pricier: ModelInfo = {
          ...haikuModel,
          id: "pricier",
          displayName: "Pricier",
          inputPricePerMillion: 10,
          cachedInputPricePerMillion: 10,
          outputPricePerMillion: 10,
        };
        const advice = run([pricier]);

        expect(advice.baselineMonthlySpend).toBe(0); // displayed value rounds to $0.00
        const plan = advice.alternativePlans[0];
        expect(plan.tradeoffSummary).not.toContain("zero-cost");
        expect(plan.tradeoffSummary).not.toContain("undefined");
        expect(plan.tradeoffSummary).toMatch(/^Invests \d+% higher spend/);
        expect(plan.costMultiplier).toBeGreaterThan(1);
        expect(advice.recommendedPlan).toBeUndefined();
        expect(advice.hybridStrategy.rules[0].modelId).toBe(subCentBaseline.id);
        expectAllNumbersFinite(advice);
      });

      it("still recognises real unrounded savings against the paid baseline", () => {
        const cheaper: ModelInfo = {
          ...haikuModel,
          id: "cheaper",
          displayName: "Cheaper",
          inputPricePerMillion: 0.0025,
          cachedInputPricePerMillion: 0.0025,
          outputPricePerMillion: 0.0025,
        };
        const advice = run([cheaper]);

        expect(advice.baselineMonthlySpend).toBe(0);
        const plan = advice.alternativePlans[0];
        expect(plan.totalMonthlySpend).toBe(0); // rounded display only
        expect(plan.savingsPercent).toBe(75);
        expect(plan.costMultiplier).toBe(0.25);
        expect(plan.tradeoffSummary).toContain("Delivers 75% cost reduction");
        expect(plan.tradeoffSummary).not.toContain("zero-cost");
        expect(advice.recommendedPlan?.targetModelId).toBe("cheaper");
        expectAllNumbersFinite(advice);
      });
    });

    it("assigns no hybrid offload traffic and uses the baseline when only pricier candidates exist", () => {
      const advice = analyzeCostOptimization({
        baselineModel: haikuModel,
        candidateModels: [sonnetModel],
      });

      expect(advice.alternativePlans).toHaveLength(1);
      expect(advice.alternativePlans[0].monthlySavings).toBeLessThan(0);

      const { rules } = advice.hybridStrategy;
      expect(rules).toHaveLength(1);
      expect(rules[0].modelId).toBe(haikuModel.id);
      expect(rules[0].trafficPercentage).toBe(100);
      expect(rules.some((r) => r.modelId === sonnetModel.id)).toBe(false);
      expect(rules.some((r) => r.tier === "fast_triage")).toBe(false);
      expect(advice.hybridStrategy.blendedMonthlyCost).toBe(advice.baselineMonthlySpend);
      expect(advice.hybridStrategy.monthlySavings).toBe(0);
      expect(advice.recommendedPlan).toBeUndefined();
    });

    it("leaves pricier candidates out of the hybrid tiers when a cheaper one exists", () => {
      // Baseline is Haiku: Sonnet is pricier, GPT-4o mini is cheaper.
      const advice = analyzeCostOptimization({
        baselineModel: haikuModel,
        candidateModels: [sonnetModel, gpt4oMini],
      });

      expect(advice.alternativePlans.map((p) => p.targetModelId).sort()).toEqual([
        "claude-3-5-sonnet",
        "gpt-4o-mini",
      ]);
      expect(advice.hybridStrategy.rules.map((r) => r.modelId)).not.toContain(sonnetModel.id);

      const triage = advice.hybridStrategy.rules.find((r) => r.tier === "fast_triage");
      const editing = advice.hybridStrategy.rules.find((r) => r.tier === "balanced_editing");
      const reasoning = advice.hybridStrategy.rules.find((r) => r.tier === "complex_reasoning");
      expect(triage?.modelId).toBe("gpt-4o-mini");
      expect(editing?.modelId).toBe("gpt-4o-mini");
      expect(reasoning?.modelId).toBe(haikuModel.id);
      expect(advice.hybridStrategy.blendedMonthlyCost).toBeLessThan(advice.baselineMonthlySpend);
      expect(advice.hybridStrategy.monthlySavings).toBeGreaterThan(0);
      expect(advice.recommendedPlan?.targetModelId).toBe("gpt-4o-mini");
    });

    it("keeps recommending a cheaper alternative (positive-savings control)", () => {
      const advice = analyzeCostOptimization({
        baselineModel: sonnetModel,
        candidateModels: [haikuModel, gpt4oMini, localLlama],
      });

      expect(advice.recommendedPlan).toBeDefined();
      expect(advice.recommendedPlan!.monthlySavings).toBeGreaterThan(0);
      expect(advice.alternativePlans).toContain(advice.recommendedPlan);
      expect(advice.recommendedPlan!.savingsPercent).toBeGreaterThanOrEqual(20);
      expect(advice.hybridStrategy.rules).toHaveLength(3);
      expect(advice.hybridStrategy.monthlySavings).toBeGreaterThan(0);
      expect(advice.hybridStrategy.summary).toContain("Tiered dispatching delivers");
      expectAllNumbersFinite(advice);
    });
  });
});