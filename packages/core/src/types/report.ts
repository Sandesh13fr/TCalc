/**
 * Report types.
 */

import type { ModelRecommendation } from "./recommendation.js";
import type { WorkspaceGoal } from "./options.js";

export const REPORT_SCHEMA_VERSION = "1.0.0" as const;

/** Markdown/JSON report output. */
export interface WorkspaceReport {
  /** Version of this serialized report contract. */
  schemaVersion: typeof REPORT_SCHEMA_VERSION;
  /** Report title. */
  title: string;
  /** When the report was generated. */
  generatedAt: string;
  /** Workspace root path. */
  workspacePath: string;
  /** Selected goal. */
  goal: WorkspaceGoal | null;
  /** Summary statistics. */
  summary: {
    totalFiles: number;
    includedFiles: number;
    excludedFiles: number;
    totalEstimatedTokens: number;
    includedTokens: number;
  };
  /** Top token consumers (files). */
  topTokenConsumers: Array<{
    path: string;
    tokens: number;
    percentage: number;
  }>;
  /** Top token-consuming folders. */
  topFolders: Array<{
    path: string;
    tokens: number;
    percentage: number;
  }>;
  /** Language breakdown. */
  languages: Array<{
    language: string;
    fileCount: number;
    tokens: number;
    percentage: number;
  }>;
  /** Model recommendations. */
  recommendations: {
    cheapestSufficient: ModelRecommendation;
    balanced: ModelRecommendation;
    highConfidence: ModelRecommendation;
  } | null;
  warnings: string[];
  assumptions: string[];
  /** Optimization checklist items. */
  optimizationChecklist: string[];
}
