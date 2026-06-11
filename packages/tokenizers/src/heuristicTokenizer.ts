export type TokenConfidence = "exact" | "provider-estimated" | "tokenizer-estimated" | "heuristic";

export interface TokenEstimate {
  tokens: number;
  confidence: TokenConfidence;
  details?: string;
}

export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  const charEstimate = Math.ceil(text.length / 4);
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  const wordEstimate = Math.ceil(words * 1.3);
  return Math.max(1, charEstimate, wordEstimate);
}

export function estimateFileTokens(content: string): number {
  return estimateTokens(content);
}

export function estimateTokensFromBytes(bytes: number): number {
  return Math.max(1, Math.ceil(bytes / 4));
}

export class HeuristicTokenizer {
  estimate(text: string): TokenEstimate {
    if (!text || text.length === 0) {
      return { tokens: 0, confidence: "heuristic" };
    }

    const charEstimate = Math.ceil(text.length / 4);
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    const wordEstimate = Math.ceil(words * 1.3);
    const tokenEstimate = Math.max(charEstimate, wordEstimate);

    return {
      tokens: tokenEstimate,
      confidence: "heuristic",
    };
  }

  estimateFile(filename: string, content: string): TokenEstimate {
    const base = this.estimate(content);

    const ext = filename.split(".").pop()?.toLowerCase();
    const adjustments: Record<string, number> = {
      json: 0.9,
      yaml: 0.85,
      yml: 0.85,
      md: 1.1,
      svg: 1.3,
      lock: 1.5,
    };

    const factor = adjustments[ext ?? ""] ?? 1.0;
    const adjusted = Math.round(base.tokens * factor);

    return {
      tokens: adjusted,
      confidence: "heuristic",
      details: factor !== 1.0 ? `adjusted by ${factor}x for ${ext}` : undefined,
    };
  }
}
