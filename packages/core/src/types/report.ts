/**
 * Report types.
 */

import type { ModelRecommendation, WorkspaceGoal } from "./recommendation.js";
import type { LanguageBreakdown } from "./workspace.js";

/** Markdown/JSON report output. */
export interface WorkspaceReport {
  /** Report title. */
  title: string;
  /** When the report was generated. */
  generatedAt: string;
  /** Workspace root path. */
  workspacePath: string;
  /** Selected goal. */
  goal: WorkspaceGoal;
  /** Summary statistics. */
  summary: {
    totalFiles: number;
    includedFiles: number;
    excludedFiles: number;
    totalTokens: number;
    includedTokens: number;
  };
  /** Top token consumers (files). */
  topTokenConsumers: Array<{
    relativePath: string;
    tokens: number;
    percentage: number;
  }>;
  /** Language breakdown. */
  languages: LanguageBreakdown[];
  /** Model recommendations. */
  recommendations: {
    cheapest: ModelRecommendation;
    balanced: ModelRecommendation;
    highConfidence: ModelRecommendation;
  };
  /** Optimization checklist items. */
  optimizationChecklist: string[];
}
