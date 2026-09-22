import type { ModelInfo } from "@wma/core";

export interface WorkloadProfile {
  name: string;
  description?: string;
  dailyRunsPerDev: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  cacheHitRatio?: number;
}

export interface ModelSwitchPlan {
  targetModelId: string;
  targetModelName: string;
  targetProvider: string;
  monthlyCostPerDev: number;
  totalMonthlySpend: number;
  monthlySavings: number;
  savingsPercent: number;
  costMultiplier: number;
  contextFitScore: number;
  recommendedRoles: string[];
  tradeoffSummary: string;
}

export interface HybridTieredDispatchRule {
  tier: "fast_triage" | "balanced_editing" | "complex_reasoning";
  trafficPercentage: number;
  modelId: string;
  modelName: string;
  provider: string;
  allocatedMonthlyCost: number;
  rationale: string;
}

export interface HybridDispatchStrategy {
  rules: HybridTieredDispatchRule[];
  blendedMonthlyCost: number;
  monthlySavings: number;
  savingsPercent: number;
  summary: string;
}

export interface CostOptimizationOptions {
  baselineModel: ModelInfo;
  candidateModels: ModelInfo[];
  developerCount?: number;
  workingDaysPerMonth?: number;
  workload?: WorkloadProfile;
  minContextWindowRequired?: number;
}

export interface CostOptimizationAdvice {
  baselineModel: ModelInfo;
  developerCount: number;
  workingDaysPerMonth: number;
  workload: WorkloadProfile;
  baselineMonthlySpend: number;
  alternativePlans: ModelSwitchPlan[];
  cheapestViablePlan?: ModelSwitchPlan;
  recommendedPlan?: ModelSwitchPlan;
  hybridStrategy: HybridDispatchStrategy;
  timestamp: string;
}
