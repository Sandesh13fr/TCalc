import { readFile } from "node:fs/promises";
import { DEFAULT_CONFIG, isPrivacySetting, isWorkspaceGoal, loadTeamPolicy, type WmaConfig } from "@wma/core";
import { findWorkspaceConfigPath } from "./paths.js";

export async function loadWorkspaceConfig(rootPath: string): Promise<WmaConfig> {
  const configPath = findWorkspaceConfigPath(rootPath);
  const teamPolicy = await loadTeamPolicy(rootPath);
  try {
    const content = await readFile(configPath, "utf-8");
    const parsed = JSON.parse(content) as Partial<WmaConfig>;
    const config: WmaConfig = {
      ...DEFAULT_CONFIG,
      ...parsed,
      defaultGoal: isWorkspaceGoal(parsed.defaultGoal) ? parsed.defaultGoal : DEFAULT_CONFIG.defaultGoal,
      privacyMode: isPrivacySetting(parsed.privacyMode) ? parsed.privacyMode : DEFAULT_CONFIG.privacyMode,
    };
    return applyTeamPolicy(config, teamPolicy);
  } catch {
    return applyTeamPolicy(DEFAULT_CONFIG, teamPolicy);
  }
}

function applyTeamPolicy(config: WmaConfig, teamPolicy: Awaited<ReturnType<typeof loadTeamPolicy>>): WmaConfig {
  if (!teamPolicy) return config;
  return {
    ...config,
    defaultGoal: teamPolicy.defaultGoal ?? config.defaultGoal,
    privacyMode: teamPolicy.privacyMode ?? config.privacyMode,
    exclude: [...new Set([...config.exclude, ...(teamPolicy.exclude ?? [])])],
    tokenBudget: {
      ...config.tokenBudget,
      defaultContextBudget: teamPolicy.maxTokenBudget
        ? Math.min(config.tokenBudget.defaultContextBudget, teamPolicy.maxTokenBudget)
        : config.tokenBudget.defaultContextBudget,
    },
    teamPolicy,
  };
}
