export type CompactionStage = 0 | 1 | 2 | 3;

export interface CompactedCodeResult {
  stage: CompactionStage;
  originalChars: number;
  compactedChars: number;
  originalTokens: number;
  compactedTokens: number;
  reductionPercentage: number;
  code: string;
}

export interface CompactorOptions {
  targetStage?: CompactionStage;
  maxTargetTokens?: number;
  language?: string;
  charToTokenRatio?: number;
}
