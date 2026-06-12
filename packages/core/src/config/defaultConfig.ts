/**
 * Configuration types and loader.
 */

import type { WorkspaceGoal } from "../types/recommendation.js";

/** Token budget configuration. */
export interface TokenBudgetConfig {
  defaultContextBudget: number;
  maxFullWorkspaceScan: number;
  warnAt: number;
}

/** File size thresholds used by scanner. */
export interface FileSizeConfig {
  maxTextFileBytes: number;
  maxScanFileBytes: number;
  maxContentPreviewBytes: number;
}

/** Agent rules configuration. */
export interface AgentRulesConfig {
  defaultMode: string;
  allowCavemanMode: boolean;
  preferPatchOnly: boolean;
  askBeforeLargeFileRead: boolean;
}

/** Model preferences configuration. */
export interface ModelPreferencesConfig {
  preferredProviders: string[];
  allowLocalModels: boolean;
  allowCloudModels: boolean;
}

/** Full TCalc config. */
export interface WmaConfig {
  defaultGoal: WorkspaceGoal;
  privacyMode: "local-first" | "cloud-ok";
  currency: string;
  tokenBudget: TokenBudgetConfig;
  exclude: string[];
  agentRules: AgentRulesConfig;
  models: ModelPreferencesConfig;
}

export const DEFAULT_FILE_SIZE_CONFIG: FileSizeConfig = {
  maxTextFileBytes: 5_000_000,
  maxScanFileBytes: 10_000_000,
  maxContentPreviewBytes: 4096,
};

/** Default configuration values. */
export const DEFAULT_CONFIG: WmaConfig = {
  defaultGoal: "build-mvp",
  privacyMode: "local-first",
  currency: "USD",
  tokenBudget: {
    defaultContextBudget: 64_000,
    maxFullWorkspaceScan: 1_000_000,
    warnAt: 200_000,
  },
  exclude: [
    "node_modules/**",
    "dist/**",
    "build/**",
    ".next/**",
    "coverage/**",
    "package-lock.json",
    "pnpm-lock.yaml",
  ],
  agentRules: {
    defaultMode: "repo-map-first",
    allowCavemanMode: true,
    preferPatchOnly: false,
    askBeforeLargeFileRead: true,
  },
  models: {
    preferredProviders: ["openai", "anthropic", "google", "local"],
    allowLocalModels: true,
    allowCloudModels: true,
  },
};
