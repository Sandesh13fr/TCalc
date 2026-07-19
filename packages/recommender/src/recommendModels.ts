import type { ModelInfo, ModelScore, ModelRecommendation, RecommendationResult, CostEstimate, PrivacySetting, WorkspaceGoal } from "@wma/core";
import { estimateCost } from "./estimateCost.js";

export interface RecommendModelsOptions {
  models: ModelInfo[];
  workspaceTokens: number;
  goal: WorkspaceGoal;
  outputTokens?: number;
  budget?: number;
  privacyMode?: PrivacySetting;
}

const DEFAULT_OUTPUT_TOKENS: Record<WorkspaceGoal, number> = {
  "build-mvp": 8000,
  "add-feature": 4000,
  "debug": 4000,
  "refactor": 8000,
  "migration": 12000,
  "security-review": 10000,
  "test-generation": 4000,
  "documentation": 2000,
  "architecture-planning": 10000,
  "cleanup": 4000,
};

const GOAL_DIFFICULTY: Record<WorkspaceGoal, number> = {
  "build-mvp": 3,
  "add-feature": 2,
  "debug": 1,
  "refactor": 3,
  "migration": 3,
  "security-review": 4,
  "test-generation": 2,
  "documentation": 1,
  "architecture-planning": 3,
  "cleanup": 1,
};

export function recommendModels(options: RecommendModelsOptions): RecommendationResult {
  const { models, workspaceTokens, goal, outputTokens: optOutputTokens, privacyMode = "local-first", budget } = options;

  const contextTokens = budget === undefined ? workspaceTokens : Math.min(workspaceTokens, budget);
  const contextNeeded = Math.round(contextTokens * 1.2);
  const outputTokens = optOutputTokens ?? DEFAULT_OUTPUT_TOKENS[goal];

  const assumptions: string[] = [
    `Output tokens estimated for "${goal}" goal: ${outputTokens}`,
    `20% safety margin added to context (${contextNeeded} tokens required)`,
    budget !== undefined
      ? `Context limited to user-specified budget of ${budget} tokens`
      : `Using full workspace tokens (${workspaceTokens}) as context`,
  ];

  const rejected: string[] = [];
  const fitting: Array<{ model: ModelInfo; score: ModelScore; cost: CostEstimate }> = [];
  const overflowing: Array<{ model: ModelInfo; score: ModelScore; cost: CostEstimate }> = [];

  for (const model of models) {
    if (privacyMode === "local-first" && model.privacyMode === "cloud") {
      continue;
    }

    const fitsContext = model.contextWindow >= contextNeeded;

    if (!fitsContext) {
      rejected.push(model.id);
    }

    const cost = estimateCost({
      model,
      inputTokens: contextNeeded,
      outputTokens,
      cachedInputTokens: Math.round(contextTokens * 0.3),
    });

    const contextFit = calculateContextFit(model, contextNeeded);
    const taskQualityFit = calculateTaskFit(model, GOAL_DIFFICULTY[goal]);
    const costEfficiency = calculateCostEfficiency(cost);
    const latencyFit = model.latencyScore !== null ? model.latencyScore / 100 : 0.5;
    const privacyFit = model.privacyMode === "local" ? 1.0 : model.privacyMode === "hybrid" ? 0.7 : 0.4;

    const totalScore =
      taskQualityFit * 0.35 +
      costEfficiency * 0.35 +
      contextFit * 0.15 +
      latencyFit * 0.05 +
      privacyFit * 0.10;

    const entry = {
      model,
      score: { contextFit, taskQualityFit, costEfficiency, latencyFit, privacyFit, totalScore },
      cost,
    };

    if (fitsContext) {
      fitting.push(entry);
    } else {
      overflowing.push(entry);
    }
  }

  const candidates = fitting.length > 0 ? fitting : overflowing;

  if (candidates.length === 0) {
    throw new RangeError(`No models are eligible for privacy mode "${privacyMode}"`);
  }

  if (fitting.length === 0) {
    assumptions.push("No model fits the required context; recommend using repo-map-first strategy to reduce context");
  }

  let cheapestSufficient = pickCheapestSufficient(candidates);
  let balanced = pickBalanced(candidates);
  let highConfidence = pickHighConfidence(candidates);

  const usedIds = new Set<string>();
  const duplicationReason = "Same model selected for multiple tiers due to limited fitting candidates";

  const dedup = (preferred: typeof candidates[0], remaining: typeof candidates): typeof candidates[0] => {
    if (!preferred) return preferred;
    if (!usedIds.has(preferred.model.id)) {
      usedIds.add(preferred.model.id);
      return preferred;
    }
    const next = remaining.find(c => !usedIds.has(c.model.id));
    if (next) {
      usedIds.add(next.model.id);
      return next;
    }
    return preferred;
  };

  usedIds.add(cheapestSufficient.model.id);
  balanced = dedup(balanced, candidates);
  highConfidence = dedup(highConfidence, candidates);

  const toRecommendation = (item: typeof candidates[0], tier: "cheapest-sufficient" | "balanced" | "high-confidence", extraReasons: string[] = []): ModelRecommendation => ({
    modelId: item.model.id,
    displayName: item.model.displayName,
    tier,
    score: item.score,
    costEstimate: item.cost,
    reasons: [...generateReasons(item.model, item.score, goal), ...extraReasons],
    overflowRisk: calculateOverflowRisk(item.model, contextNeeded),
    expectedQuality: item.score.totalScore >= 0.7 ? "high" : item.score.totalScore >= 0.5 ? "medium" : "low",
    warnings: generateWarnings(item.model, goal, contextNeeded),
    optimizationSuggestions: generateOptimizations(item.model, workspaceTokens, contextNeeded),
  });

  const balancedRecommendation = toRecommendation(
    balanced,
    "balanced",
    balanced === cheapestSufficient || (balanced === highConfidence && highConfidence === cheapestSufficient) ? [duplicationReason] : [],
  );
  const highConfidenceRecommendation = toRecommendation(
    highConfidence,
    "high-confidence",
    highConfidence === cheapestSufficient || highConfidence === balanced ? [duplicationReason] : [],
  );

  const allScored = fitting.concat(overflowing).map((s) =>
    toRecommendation(s, "balanced"),
  );

  return {
    goal,
    workspaceTokens,
    cheapestSufficient: toRecommendation(cheapestSufficient, "cheapest-sufficient"),
    balanced: balancedRecommendation,
    highConfidence: highConfidenceRecommendation,
    rejected,
    assumptions,
    allScored,
  };
}

function pickCheapestSufficient(
  candidates: Array<{ model: ModelInfo; score: ModelScore; cost: CostEstimate }>,
) {
  let best = candidates[0];
  for (const c of candidates) {
    if (c.cost.totalCost < best.cost.totalCost) {
      best = c;
    }
  }
  return best;
}

function pickHighConfidence(
  candidates: Array<{ model: ModelInfo; score: ModelScore; cost: CostEstimate }>,
) {
  let best = candidates[0];
  for (const c of candidates) {
    const cs = c.model.codingScore ?? 0;
    const bs = best.model.codingScore ?? 0;
    if (cs > bs) {
      best = c;
    }
  }
  return best;
}

function pickBalanced(
  candidates: Array<{ model: ModelInfo; score: ModelScore; cost: CostEstimate }>,
) {
  let best = candidates[0];
  for (const c of candidates) {
    if (c.score.totalScore > best.score.totalScore) {
      best = c;
    }
  }
  return best;
}

function calculateContextFit(model: ModelInfo, contextNeeded: number): number {
  if (model.contextWindow >= contextNeeded * 2) return 1.0;
  if (model.contextWindow >= contextNeeded) return 0.8;
  if (model.contextWindow >= contextNeeded * 0.75) return 0.5;
  return Math.max(0, model.contextWindow / contextNeeded);
}

function calculateTaskFit(model: ModelInfo, difficulty: number): number {
  let score = 0.5;
  if (model.codingScore !== null && difficulty >= 3) {
    score += (model.codingScore / 100) * 0.3;
  }
  if (model.supportsTools) score += 0.1;
  return Math.min(1, score);
}

function calculateCostEfficiency(cost: CostEstimate): number {
  if (cost.totalCost <= 0) return 1.0;
  return Math.max(0, 1 - cost.totalCost / 0.05);
}

function calculateOverflowRisk(model: ModelInfo, contextNeeded: number): number {
  if (model.contextWindow >= contextNeeded) return 0;
  return Math.min(1, 1 - model.contextWindow / contextNeeded);
}

function generateReasons(model: ModelInfo, score: ModelScore, goal: WorkspaceGoal): string[] {
  const reasons: string[] = [];
  if (score.contextFit >= 0.8) reasons.push(`Adequate context window (${(model.contextWindow / 1000).toFixed(0)}K tokens)`);
  if (score.costEfficiency >= 0.7) reasons.push("Cost-efficient for this task");
  if (model.codingScore !== null && model.codingScore >= 70) reasons.push(`Strong coding benchmarks (${model.codingScore}/100)`);
  if (model.privacyMode === "local") reasons.push("Runs entirely locally — no data leaves your machine");
  if (model.supportsTools) reasons.push("Tool/function calling support");
  reasons.push(`Good fit for "${goal.replace(/-/g, " ")}" goal`);
  return reasons;
}

function generateWarnings(model: ModelInfo, goal: WorkspaceGoal, contextNeeded: number): string[] {
  const warnings: string[] = [];
  if (model.contextWindow < contextNeeded) {
    warnings.push("Context window insufficient — overflow likely; consider repo-map-first strategy");
  }
  if (model.codingScore !== null && model.codingScore < 50) {
    warnings.push("Below-average coding benchmark scores");
  }
  return warnings;
}

function generateOptimizations(model: ModelInfo, workspaceTokens: number, contextNeeded: number): string[] {
  const suggestions: string[] = [];
  if (workspaceTokens > model.contextWindow * 0.5 || contextNeeded > model.contextWindow) {
    suggestions.push("Use a repo map instead of full workspace to reduce context");
  }
  if (workspaceTokens > 200_000) {
    suggestions.push("Exclude build artifacts, lockfiles, and generated files");
  }
  if (workspaceTokens > 500_000) {
    suggestions.push("Use the agent optimizer to generate concise agent rules");
  }
  suggestions.push("Enable prompt caching if supported by your provider");
  return suggestions;
}
