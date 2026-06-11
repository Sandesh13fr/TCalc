import type { CostEstimate, ModelInfo } from "@wma/core";

export interface EstimateCostOptions {
  model: ModelInfo;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
}

export function estimateCost(options: EstimateCostOptions): CostEstimate {
  const { model, inputTokens, outputTokens, cachedInputTokens = 0 } = options;

  const inputCost = (inputTokens / 1_000_000) * model.inputPricePerMillion;
  const cachedInputCost = (cachedInputTokens / 1_000_000) * (model.cachedInputPricePerMillion ?? model.inputPricePerMillion);
  const outputCost = (outputTokens / 1_000_000) * model.outputPricePerMillion;
  const totalCost = inputCost + cachedInputCost + outputCost;

  return {
    inputTokens,
    cachedInputTokens,
    outputTokens,
    inputCost,
    cachedInputCost,
    outputCost,
    totalCost,
  };
}

export function estimateSessionCost(
  model: ModelInfo,
  workspaceTokens: number,
  turns?: number,
): {
  singlePrompt: CostEstimate;
  singleAgentRun: CostEstimate;
  milestoneCost: CostEstimate;
} {
  const turnsPerRun = turns ?? 10;
  const milestoneTurns = 50;

  const singlePrompt = estimateCost({
    model,
    inputTokens: workspaceTokens,
    outputTokens: model.maxOutputTokens,
  });

  const perTurnCost = estimateCost({
    model,
    inputTokens: Math.round(workspaceTokens * 0.8),
    outputTokens: Math.round(model.maxOutputTokens * 0.5),
    cachedInputTokens: Math.round(workspaceTokens * 0.7),
  });

  const singleAgentRun: CostEstimate = {
    inputTokens: perTurnCost.inputTokens * turnsPerRun,
    cachedInputTokens: perTurnCost.cachedInputTokens * turnsPerRun,
    outputTokens: perTurnCost.outputTokens * turnsPerRun,
    inputCost: perTurnCost.inputCost * turnsPerRun,
    cachedInputCost: perTurnCost.cachedInputCost * turnsPerRun,
    outputCost: perTurnCost.outputCost * turnsPerRun,
    totalCost: perTurnCost.totalCost * turnsPerRun,
  };

  const milestoneCost: CostEstimate = {
    inputTokens: perTurnCost.inputTokens * milestoneTurns,
    cachedInputTokens: perTurnCost.cachedInputTokens * milestoneTurns,
    outputTokens: perTurnCost.outputTokens * milestoneTurns,
    inputCost: perTurnCost.inputCost * milestoneTurns,
    cachedInputCost: perTurnCost.cachedInputCost * milestoneTurns,
    outputCost: perTurnCost.outputCost * milestoneTurns,
    totalCost: perTurnCost.totalCost * milestoneTurns,
  };

  return { singlePrompt, singleAgentRun, milestoneCost };
}
