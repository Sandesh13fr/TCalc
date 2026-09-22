export type DensityClassification = "dense" | "normal" | "sparse";

export interface TokenDensityMetrics {
  punctuationDensity: number;
  whitespaceRatio: number;
  nonAsciiRatio: number;
  avgWordLength: number;
  lineCount: number;
}

export interface TokenDensityProfile {
  charCount: number;
  rawEstimate: number;
  densityMultiplier: number;
  adjustedTokens: number;
  classification: DensityClassification;
  metrics: TokenDensityMetrics;
}

export interface DensityAdjustmentOptions {
  baseCharRatio?: number;
  language?: string;
  minMultiplier?: number;
  maxMultiplier?: number;
}
