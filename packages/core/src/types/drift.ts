export type DriftStatus = "added" | "removed" | "modified" | "unchanged";

export interface FileDriftDelta {
  relativePath: string;
  status: DriftStatus;
  baselineTokens: number;
  currentTokens: number;
  tokenDelta: number;
  percentChange: number;
  riskFlagsAdded: string[];
  riskFlagsRemoved: string[];
}

export interface DirectoryDriftDelta {
  directory: string;
  baselineTokens: number;
  currentTokens: number;
  tokenDelta: number;
  percentChange: number;
  fileCountDelta: number;
}

export interface DriftPolicyConfig {
  maxTokenIncrease?: number;
  maxDriftPercentage?: number;
  alertOnNewRiskFlags?: boolean;
  maxFileCountIncrease?: number;
}

export interface TokenDriftReport {
  baselineTotalTokens: number;
  currentTotalTokens: number;
  netTokenDelta: number;
  netPercentChange: number;
  filesAdded: number;
  filesRemoved: number;
  filesModified: number;
  filesUnchanged: number;
  topGrowingFiles: FileDriftDelta[];
  topShrinkingFiles: FileDriftDelta[];
  directoryDrifts: DirectoryDriftDelta[];
  violations: string[];
  passed: boolean;
  generatedAt: string;
}
