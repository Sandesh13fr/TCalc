import { estimateTokens, type TokenEstimate } from "./heuristicTokenizer.js";

export interface ProviderTokenizer {
  id: string;
  provider: string;
  estimate(text: string, model?: string): number;
}

export function estimateProviderTokens(
  text: string,
  tokenizer?: ProviderTokenizer,
  model?: string,
  fallback: (value: string) => number = estimateTokens,
): TokenEstimate {
  if (tokenizer) {
    try {
      const tokens = tokenizer.estimate(text, model);
      if (Number.isSafeInteger(tokens) && tokens >= 0) {
        return { tokens, confidence: "tokenizer-estimated", details: `${tokenizer.provider}:${tokenizer.id}` };
      }
    } catch {
      // Offline fallback below.
    }
  }

  return {
    tokens: fallback(text),
    confidence: "heuristic",
    details: tokenizer ? `${tokenizer.provider}:${tokenizer.id} unavailable; used offline heuristic` : "offline heuristic",
  };
}
