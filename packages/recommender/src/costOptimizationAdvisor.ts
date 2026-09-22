import type { ModelInfo } from "@wma/core";
import { estimateCost } from "./estimateCost.js";
import type {
  CostOptimizationAdvice,
  CostOptimizationOptions,
  HybridDispatchStrategy,
  HybridTieredDispatchRule,
  ModelSwitchPlan,
  WorkloadProfile,
} from "./types/costAdvisor.js";

const DEFAULT_WORKLOAD: WorkloadProfile = {
  name: "Standard Full-Stack Dev Workflow",
  description: "Average code completion, refactoring, and agentic multi-turn debugging sessions.",
  dailyRunsPerDev: 15,
  avgInputTokens: 48_000,
  avgOutputTokens: 2_000,
  cacheHitRatio: 0.5,
};

function calculateSingleRunCost(model: ModelInfo, workload: WorkloadProfile): number {
  const cachedTokens = Math.round(workload.avgInputTokens * Math.max(0, Math.min(1, workload.cacheHitRatio ?? 0)));
  const estimate = estimateCost({
    model,
    inputTokens: workload.avgInputTokens,
    outputTokens: workload.avgOutputTokens,
    cachedInputTokens: cachedTokens,
  });
  return estimate.totalCost;
}

function evaluateContextFit(model: ModelInfo, requiredContext: number): number {
  if (model.contextWindow < requiredContext) {
    return Math.max(0.1, Number((model.contextWindow / requiredContext).toFixed(2)));
  }
  return 1.0;
}

function determineRecommendedRoles(model: ModelInfo): string[] {
  const roles: string[] = [];

  if (model.inputPricePerMillion === 0 && model.outputPricePerMillion === 0) {
    roles.push("Local / Offline Development", "Free CI Automated Linting & Triage");
  } else if (model.inputPricePerMillion <= 0.5) {
    roles.push("High-Frequency Quick Edits", "Pre-Commit Code Reviews", "Token-Dense Workspace Summaries");
  } else if (model.inputPricePerMillion <= 3.0) {
    roles.push("Daily General Agent Programming", "Test Case Generation", "Feature Implementation");
  } else {
    roles.push("Complex Architectural Refactoring", "High-Stakes Security Audits", "Deep Multi-File Reasoning");
  }

  if (model.contextWindow >= 1_000_000) {
    roles.push("Whole-Repository Context Ingestion");
  } else if (model.contextWindow >= 128_000) {
    roles.push("Multi-Module Context Analysis");
  }

  return roles;
}

function buildTradeoffSummary(baselineCost: number, targetCost: number, model: ModelInfo): string {
  const diff = targetCost - baselineCost;
  if (Math.abs(diff) < 0.01) {
    return `Cost-neutral alternative to ${model.displayName} with identical economic footprint.`;
  }
  if (diff < 0) {
    const percent = Math.round((Math.abs(diff) / baselineCost) * 100);
    return `Delivers ${percent}% cost reduction. Ideal for offloading standard repetitive development prompts.`;
  }
  const increasePercent = Math.round((diff / baselineCost) * 100);
  return `Invests ${increasePercent}% higher spend for superior frontier reasoning capability on complex edge-cases.`;
}

export function analyzeCostOptimization(options: CostOptimizationOptions): CostOptimizationAdvice {
  const {
    baselineModel,
    candidateModels,
    developerCount = 5,
    workingDaysPerMonth = 22,
    workload = DEFAULT_WORKLOAD,
    minContextWindowRequired = workload.avgInputTokens + workload.avgOutputTokens,
  } = options;

  const totalRunsPerDev = workload.dailyRunsPerDev * workingDaysPerMonth;
  const totalTeamRuns = totalRunsPerDev * developerCount;

  const baselineRunCost = calculateSingleRunCost(baselineModel, workload);
  const baselineMonthlySpend = Number((baselineRunCost * totalTeamRuns).toFixed(2));

  const validCandidates = candidateModels.filter(
    (c) => c.id !== baselineModel.id && c.contextWindow >= Math.round(minContextWindowRequired * 0.75),
  );

  const alternativePlans: ModelSwitchPlan[] = validCandidates.map((candidate) => {
    const candidateRunCost = calculateSingleRunCost(candidate, workload);
    const candidateMonthlySpend = Number((candidateRunCost * totalTeamRuns).toFixed(2));
    const monthlyCostPerDev = Number((candidateRunCost * totalRunsPerDev).toFixed(2));
    const monthlySavings = Number((baselineMonthlySpend - candidateMonthlySpend).toFixed(2));
    const savingsPercent =
      baselineMonthlySpend > 0
        ? Number(((monthlySavings / baselineMonthlySpend) * 100).toFixed(1))
        : 0;
    const costMultiplier =
      baselineMonthlySpend > 0 ? Number((candidateMonthlySpend / baselineMonthlySpend).toFixed(2)) : 1;
    const contextFitScore = evaluateContextFit(candidate, minContextWindowRequired);

    return {
      targetModelId: candidate.id,
      targetModelName: candidate.displayName,
      targetProvider: candidate.provider,
      monthlyCostPerDev,
      totalMonthlySpend: candidateMonthlySpend,
      monthlySavings,
      savingsPercent,
      costMultiplier,
      contextFitScore,
      recommendedRoles: determineRecommendedRoles(candidate),
      tradeoffSummary: buildTradeoffSummary(baselineMonthlySpend, candidateMonthlySpend, candidate),
    };
  });

  // Sort by highest monthly savings
  alternativePlans.sort((a, b) => b.monthlySavings - a.monthlySavings);

  const cheapestViablePlan =
    alternativePlans.length > 0
      ? [...alternativePlans].sort((a, b) => a.totalMonthlySpend - b.totalMonthlySpend)[0]
      : undefined;

  // Recommended plan balances savings (savingsPercent > 20%) while maintaining high contextFitScore >= 0.9
  const recommendedPlan =
    alternativePlans.find((p) => p.savingsPercent >= 20 && p.contextFitScore >= 0.9) ??
    cheapestViablePlan;

  // Compute Hybrid Tiered Strategy (60% fast/triage, 30% balanced editing, 10% complex frontier)
  const fastCandidate =
    alternativePlans.find((p) => p.savingsPercent > 40) ?? cheapestViablePlan;
  const balancedCandidate =
    alternativePlans.find((p) => p.savingsPercent >= 10 && p.savingsPercent <= 40) ?? alternativePlans[0];
  const frontierModel = baselineModel;

  const hybridRules: HybridTieredDispatchRule[] = [];
  let blendedMonthlyCost = 0;

  if (fastCandidate && balancedCandidate) {
    const triageRuns = Math.round(totalTeamRuns * 0.6);
    const editingRuns = Math.round(totalTeamRuns * 0.3);
    const reasoningRuns = totalTeamRuns - triageRuns - editingRuns;

    const triageCost = (fastCandidate.totalMonthlySpend / totalTeamRuns) * triageRuns;
    const editingCost = (balancedCandidate.totalMonthlySpend / totalTeamRuns) * editingRuns;
    const reasoningCost = (baselineMonthlySpend / totalTeamRuns) * reasoningRuns;

    blendedMonthlyCost = Number((triageCost + editingCost + reasoningCost).toFixed(2));

    hybridRules.push({
      tier: "fast_triage",
      trafficPercentage: 60,
      modelId: fastCandidate.targetModelId,
      modelName: fastCandidate.targetModelName,
      provider: fastCandidate.targetProvider,
      allocatedMonthlyCost: Number(triageCost.toFixed(2)),
      rationale: "Route file exploration, lint fixes, commit messages, and token scans to high-throughput tier.",
    });

    hybridRules.push({
      tier: "balanced_editing",
      trafficPercentage: 30,
      modelId: balancedCandidate.targetModelId,
      modelName: balancedCandidate.targetModelName,
      provider: balancedCandidate.targetProvider,
      allocatedMonthlyCost: Number(editingCost.toFixed(2)),
      rationale: "Route standard feature implementation, unit test generation, and pull request changesets.",
    });

    hybridRules.push({
      tier: "complex_reasoning",
      trafficPercentage: 10,
      modelId: frontierModel.id,
      modelName: frontierModel.displayName,
      provider: frontierModel.provider,
      allocatedMonthlyCost: Number(reasoningCost.toFixed(2)),
      rationale: "Reserve top-tier model for large architectural redesigns, debugging elusive race conditions.",
    });
  } else {
    blendedMonthlyCost = baselineMonthlySpend;
    hybridRules.push({
      tier: "balanced_editing",
      trafficPercentage: 100,
      modelId: baselineModel.id,
      modelName: baselineModel.displayName,
      provider: baselineModel.provider,
      allocatedMonthlyCost: baselineMonthlySpend,
      rationale: "All traffic routed to baseline model (no suitable multi-tier alternatives provided).",
    });
  }

  const hybridSavings = Number((baselineMonthlySpend - blendedMonthlyCost).toFixed(2));
  const hybridSavingsPercent =
    baselineMonthlySpend > 0
      ? Number(((hybridSavings / baselineMonthlySpend) * 100).toFixed(1))
      : 0;

  const hybridStrategy: HybridDispatchStrategy = {
    rules: hybridRules,
    blendedMonthlyCost,
    monthlySavings: hybridSavings,
    savingsPercent: hybridSavingsPercent,
    summary: `Tiered dispatching delivers ~$${hybridSavings.toFixed(2)}/mo (${hybridSavingsPercent}%) savings while preserving top-tier model precision for high-complexity prompts.`,
  };

  return {
    baselineModel,
    developerCount,
    workingDaysPerMonth,
    workload,
    baselineMonthlySpend,
    alternativePlans,
    cheapestViablePlan,
    recommendedPlan,
    hybridStrategy,
    timestamp: new Date().toISOString(),
  };
}
