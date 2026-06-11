export interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  inputCost: number;
  outputCost: number;
  cachedInputCost: number;
  totalCost: number;
}
