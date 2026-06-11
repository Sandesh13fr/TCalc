import type { CostEstimate } from "./pricing.js";
import type { WorkspaceFileInfo } from "./workspace.js";

export type WorkspaceGoal =
  | "build-mvp"
  | "add-feature"
  | "debug"
  | "refactor"
  | "migration"
  | "security-review"
  | "test-generation"
  | "documentation"
  | "architecture-planning"
  | "cleanup";

export type RecommendationTier = "cheapest-sufficient" | "balanced" | "high-confidence";

export interface ModelScore {
  contextFit: number;
  taskQualityFit: number;
  costEfficiency: number;
  latencyFit: number;
  privacyFit: number;
  totalScore: number;
}

export interface ModelRecommendation {
  modelId: string;
  displayName: string;
  tier: RecommendationTier;
  score: ModelScore;
  costEstimate: CostEstimate;
  reasons: string[];
  overflowRisk: number;
  expectedQuality: string;
  warnings: string[];
  optimizationSuggestions: string[];
}

export interface RecommendationResult {
  goal: WorkspaceGoal;
  workspaceTokens: number;
  cheapestSufficient: ModelRecommendation;
  balanced: ModelRecommendation;
  highConfidence: ModelRecommendation;
  rejected: string[];
  assumptions: string[];
  allScored: ModelRecommendation[];
}
