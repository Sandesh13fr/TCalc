import { readFile } from "node:fs/promises";
import { DEFAULT_CONFIG, isPrivacySetting, isWorkspaceGoal, loadTeamPolicy, type WmaConfig } from "@wma/core";
import { findWorkspaceConfigPath } from "./paths.js";
import { CliError } from "./errors.js";

export async function loadWorkspaceConfig(rootPath: string): Promise<WmaConfig> {
  const configPath = findWorkspaceConfigPath(rootPath);
  const teamPolicy = await loadTeamPolicy(rootPath);
  let parsed: unknown;

  try {
    const content = await readFile(configPath, "utf-8");
    parsed = JSON.parse(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return applyTeamPolicy(DEFAULT_CONFIG, teamPolicy);
    }
    throw new CliError(`Failed to load workspace config at ${configPath}: ${errorMessage(error)}`);
  }

  return applyTeamPolicy(parseWorkspaceConfig(parsed, configPath), teamPolicy);
}

function parseWorkspaceConfig(value: unknown, configPath: string): WmaConfig {
  if (!isRecord(value)) {
    throw new CliError(`Workspace config at ${configPath} must be a JSON object.`);
  }

  const config: WmaConfig = {
    ...DEFAULT_CONFIG,
    ...value,
    defaultGoal: parseDefaultGoal(value.defaultGoal, configPath),
    privacyMode: parsePrivacyMode(value.privacyMode, configPath),
    exclude: parseStringArray(value.exclude, DEFAULT_CONFIG.exclude, "exclude", configPath),
    tokenBudget: parseTokenBudget(value.tokenBudget, configPath),
  };

  return config;
}

function parseDefaultGoal(value: unknown, configPath: string): WmaConfig["defaultGoal"] {
  if (value === undefined) return DEFAULT_CONFIG.defaultGoal;
  if (!isWorkspaceGoal(value)) throw new CliError(`Workspace config at ${configPath} has invalid defaultGoal.`);
  return value;
}

function parsePrivacyMode(value: unknown, configPath: string): WmaConfig["privacyMode"] {
  if (value === undefined) return DEFAULT_CONFIG.privacyMode;
  if (!isPrivacySetting(value)) throw new CliError(`Workspace config at ${configPath} has invalid privacyMode.`);
  return value;
}

function parseTokenBudget(value: unknown, configPath: string): WmaConfig["tokenBudget"] {
  if (value === undefined) return DEFAULT_CONFIG.tokenBudget;
  if (!isRecord(value)) throw new CliError(`Workspace config at ${configPath} tokenBudget must be an object.`);

  return {
    defaultContextBudget: parsePositiveInteger(value.defaultContextBudget, DEFAULT_CONFIG.tokenBudget.defaultContextBudget, "tokenBudget.defaultContextBudget", configPath),
    maxFullWorkspaceScan: parsePositiveInteger(value.maxFullWorkspaceScan, DEFAULT_CONFIG.tokenBudget.maxFullWorkspaceScan, "tokenBudget.maxFullWorkspaceScan", configPath),
    warnAt: parsePositiveInteger(value.warnAt, DEFAULT_CONFIG.tokenBudget.warnAt, "tokenBudget.warnAt", configPath),
  };
}

function parsePositiveInteger(value: unknown, fallback: number, field: string, configPath: string): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new CliError(`Workspace config at ${configPath} has invalid ${field}; expected a positive integer.`);
  }
  return value;
}

function parseStringArray(value: unknown, fallback: string[], field: string, configPath: string): string[] {
  if (value === undefined) return fallback;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new CliError(`Workspace config at ${configPath} has invalid ${field}; expected an array of non-empty strings.`);
  }
  return value;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
