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

/**
 * A model is genuinely free when every price that can contribute to a run is zero.
 * This is decided from pricing, never from a rounded monthly spend, so a paid model whose
 * monthly total rounds to $0.00 is not mistaken for a free one.
 */
function isFreeModel(model: ModelInfo): boolean {
  return (
    model.inputPricePerMillion === 0 &&
    (model.cachedInputPricePerMillion ?? model.inputPricePerMillion) === 0 &&
    model.outputPricePerMillion === 0
  );
}

function formatMonthlyUsd(amount: number): string {
  return Number(amount.toFixed(2)) === 0 ? "less than $0.01" : `$${amount.toFixed(2)}`;
}

interface TradeoffContext {
  /** Unrounded baseline monthly cost. */
  baselineCost: number;
  /** Unrounded candidate monthly cost. */
  targetCost: number;
  baselineIsFree: boolean;
  hasRuns: boolean;
}

function buildTradeoffSummary(model: ModelInfo, context: TradeoffContext): string {
  const { baselineCost, targetCost, baselineIsFree, hasRuns } = context;
  const diff = targetCost - baselineCost;

  if (diff === 0) {
    if (!hasRuns) {
      return `No runs are projected for this workload, so switching to ${model.displayName} has no cost impact.`;
    }
    return `Cost-neutral alternative to ${model.displayName} with identical economic footprint.`;
  }
  // A percentage change is undefined when the baseline spends nothing, so report finite absolute added cost instead.
  if (baselineCost <= 0) {
    const baselineLabel = baselineIsFree ? "zero-cost baseline" : "baseline's zero projected spend";
    return `Adds ${formatMonthlyUsd(diff)}/mo over the ${baselineLabel} to adopt ${model.displayName} (percentage uplift undefined).`;
  }
  
  const percent = Math.round((Math.abs(diff) / baselineCost) * 100);

  if (percent === 0) {
    return diff < 0
      ? `Costs less than 1% less than the baseline for ${model.displayName}.`
      : `Costs less than 1% more than the baseline for ${model.displayName}.`;
  }

  if (diff < 0) {
    return `Delivers ${percent}% cost reduction. Ideal for offloading standard repetitive development prompts.`;
  }
  return `Invests ${percent}% higher spend for superior frontier reasoning capability on complex edge-cases.`;
}

/**
 * Internal view of a candidate that keeps the unrounded numbers. The public `ModelSwitchPlan`
 * carries cent-rounded values, which must not drive savings decisions.
 */
interface PlanEvaluation {
  plan: ModelSwitchPlan;
  runCost: number;
  monthlySpend: number;
  /** Positive when the candidate is cheaper than the baseline. */
  monthlySavings: number;
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
  const hasRuns = totalTeamRuns > 0;

  const baselineRunCost = calculateSingleRunCost(baselineModel, workload);
  const baselineMonthlyCost = baselineRunCost * totalTeamRuns;
  const baselineMonthlySpend = Number(baselineMonthlyCost.toFixed(2));
  const baselineIsFree = isFreeModel(baselineModel);

  const validCandidates = candidateModels.filter(
    (c) => c.id !== baselineModel.id && c.contextWindow >= Math.round(minContextWindowRequired * 0.75),
  );

  const evaluations: PlanEvaluation[] = validCandidates.map((candidate) => {
    const runCost = calculateSingleRunCost(candidate, workload);
    const monthlySpend = runCost * totalTeamRuns;
    const savings = baselineMonthlyCost - monthlySpend;
    const candidateMonthlySpend = Number(monthlySpend.toFixed(2));
    const monthlyCostPerDev = Number((runCost * totalRunsPerDev).toFixed(2));
    const monthlySavings = Number(savings.toFixed(2));
    const savingsPercent =
      baselineMonthlyCost > 0 ? Number(((savings / baselineMonthlyCost) * 100).toFixed(1)) : 0;
    const costMultiplier =
      baselineMonthlyCost > 0 ? Number((monthlySpend / baselineMonthlyCost).toFixed(2)) : 1;
    const contextFitScore = evaluateContextFit(candidate, minContextWindowRequired);

    return {
      runCost,
      monthlySpend,
      monthlySavings: savings,
      plan: {
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
        tradeoffSummary: buildTradeoffSummary(candidate, {
          baselineCost: baselineMonthlyCost,
          targetCost: monthlySpend,
          baselineIsFree,
          hasRuns,
        }),
      },
    };
  });

  // Sort by highest monthly savings (unrounded, so sub-cent differences still order correctly).
  evaluations.sort((a, b) => b.monthlySavings - a.monthlySavings);

  // Every generated candidate stays visible, including ones that cost more than the baseline.
  const alternativePlans = evaluations.map((e) => e.plan);

  // Overall cheapest candidate. It may not save money; it is not the recommendation.
  const cheapestViablePlan =
    evaluations.length > 0
      ? [...evaluations].sort((a, b) => a.monthlySpend - b.monthlySpend)[0].plan
      : undefined;

  // Only candidates that strictly cost less than the baseline may be recommended or offloaded to.
  // Shared by the single-plan recommendation and the hybrid tiers (already sorted by savings).
  const savingEvaluations = evaluations.filter((e) => e.monthlySavings > 0);
  const savingPlans = savingEvaluations.map((e) => e.plan);
  const cheapestSavingEvaluation =
    savingEvaluations.length > 0
      ? [...savingEvaluations].sort((a, b) => a.monthlySpend - b.monthlySpend)[0]
      : undefined;
  const cheapestSavingPlan = cheapestSavingEvaluation?.plan;

  // Recommended plan balances savings (savingsPercent > 20%) while maintaining high contextFitScore >= 0.9.
  // With no saving candidate there is no recommendation and the baseline stays in place.
  const recommendedPlan =
    savingPlans.find((p) => p.savingsPercent >= 20 && p.contextFitScore >= 0.9) ?? cheapestSavingPlan;

  // Compute Hybrid Tiered Strategy (60% fast/triage, 30% balanced editing, 10% complex frontier)
  const fastEvaluation =
    savingEvaluations.find((e) => e.plan.savingsPercent > 40) ?? cheapestSavingEvaluation;
  const balancedEvaluation =
    savingEvaluations.find((e) => e.plan.savingsPercent >= 10 && e.plan.savingsPercent <= 40) ??
    savingEvaluations[0];
  const frontierModel = baselineModel;

  const hybridRules: HybridTieredDispatchRule[] = [];
  let blendedMonthlyCost = 0;
  let hybridSavings = 0;
  let hybridSummary: string;

  if (fastEvaluation && balancedEvaluation) {
    const fastCandidate = fastEvaluation.plan;
    const balancedCandidate = balancedEvaluation.plan;
    const triageRuns = Math.round(totalTeamRuns * 0.6);
    const editingRuns = Math.round(totalTeamRuns * 0.3);
    const reasoningRuns = totalTeamRuns - triageRuns - editingRuns;

    const triageCost = fastEvaluation.runCost * triageRuns;
    const editingCost = balancedEvaluation.runCost * editingRuns;
    const reasoningCost = baselineRunCost * reasoningRuns;
    const blendedCost = triageCost + editingCost + reasoningCost;

    blendedMonthlyCost = Number(blendedCost.toFixed(2));
    hybridSavings = Number((baselineMonthlyCost - blendedCost).toFixed(2));

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

    const hybridSavingsPercent =
      baselineMonthlyCost > 0 ? Number(((hybridSavings / baselineMonthlyCost) * 100).toFixed(1)) : 0;
    hybridSummary = `Tiered dispatching delivers ~$${hybridSavings.toFixed(2)}/mo (${hybridSavingsPercent}%) savings while preserving top-tier model precision for high-complexity prompts.`;
  } else {
    blendedMonthlyCost = baselineMonthlySpend;
    hybridRules.push({
      tier: "balanced_editing",
      trafficPercentage: 100,
      modelId: baselineModel.id,
      modelName: baselineModel.displayName,
      provider: baselineModel.provider,
      allocatedMonthlyCost: baselineMonthlySpend,
      rationale:
        evaluations.length === 0
          ? "All traffic routed to baseline model (no suitable multi-tier alternatives provided)."
          : "All traffic routed to baseline model (no candidate model costs less than the baseline).",
    });
    hybridSummary =
      evaluations.length === 0
        ? `No alternative models were available, so all traffic stays on ${baselineModel.displayName} and tiered dispatching adds no savings.`
        : `No candidate model costs less than ${baselineModel.displayName}, so all traffic stays on the baseline and tiered dispatching adds no savings.`;
  }

  const hybridSavingsPercent =
    baselineMonthlyCost > 0 ? Number(((hybridSavings / baselineMonthlyCost) * 100).toFixed(1)) : 0;

  const hybridStrategy: HybridDispatchStrategy = {
    rules: hybridRules,
    blendedMonthlyCost,
    monthlySavings: hybridSavings,
    savingsPercent: hybridSavingsPercent,
    summary: hybridSummary,
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