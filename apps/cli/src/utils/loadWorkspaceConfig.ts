import { readFile } from "node:fs/promises";
import { DEFAULT_CONFIG, isPrivacySetting, isWorkspaceGoal, isOptimizationMode, loadTeamPolicy, type WmaConfig } from "@wma/core";
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
    defaultGoal: parseDefaultGoal(value.defaultGoal, configPath),
    privacyMode: parsePrivacyMode(value.privacyMode, configPath),
    currency: parseCurrency(value.currency, configPath),
    exclude: parseStringArray(value.exclude, DEFAULT_CONFIG.exclude, "exclude", configPath),
    tokenBudget: parseTokenBudget(value.tokenBudget, configPath),
    agentRules: parseAgentRules(value.agentRules, configPath),
    models: parseModelPreferences(value.models, configPath),
  };

  return config;
}

function parseCurrency(value: unknown, configPath: string): string {
  if (value === undefined) return DEFAULT_CONFIG.currency;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new CliError(`Workspace config at ${configPath} has invalid currency; expected a non-empty string.`);
  }
  return value.trim();
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

  const defaultContextBudget = parsePositiveInteger(
    value.defaultContextBudget,
    DEFAULT_CONFIG.tokenBudget.defaultContextBudget,
    "tokenBudget.defaultContextBudget",
    configPath,
  );
  const maxFullWorkspaceScan = parsePositiveInteger(
    value.maxFullWorkspaceScan,
    DEFAULT_CONFIG.tokenBudget.maxFullWorkspaceScan,
    "tokenBudget.maxFullWorkspaceScan",
    configPath,
  );
  const warnAt = parsePositiveInteger(
    value.warnAt,
    DEFAULT_CONFIG.tokenBudget.warnAt,
    "tokenBudget.warnAt",
    configPath,
  );

  if (warnAt > maxFullWorkspaceScan) {
    throw new CliError(
      `Workspace config at ${configPath} tokenBudget has invalid ordering: warnAt (${warnAt}) cannot exceed maxFullWorkspaceScan (${maxFullWorkspaceScan}).`,
    );
  }

  if (defaultContextBudget > maxFullWorkspaceScan) {
    throw new CliError(
      `Workspace config at ${configPath} tokenBudget has invalid ordering: defaultContextBudget (${defaultContextBudget}) cannot exceed maxFullWorkspaceScan (${maxFullWorkspaceScan}).`,
    );
  }

  return {
    defaultContextBudget,
    maxFullWorkspaceScan,
    warnAt,
  };
}

function parseAgentRules(value: unknown, configPath: string): WmaConfig["agentRules"] {
  if (value === undefined) return DEFAULT_CONFIG.agentRules;
  if (!isRecord(value)) throw new CliError(`Workspace config at ${configPath} agentRules must be an object.`);

  let defaultMode = DEFAULT_CONFIG.agentRules.defaultMode;
  if (value.defaultMode !== undefined) {
    if (!isOptimizationMode(value.defaultMode)) {
      throw new CliError(`Workspace config at ${configPath} has invalid agentRules.defaultMode.`);
    }
    defaultMode = value.defaultMode;
  }

  return {
    defaultMode,
    allowCavemanMode: parseBoolean(
      value.allowCavemanMode,
      DEFAULT_CONFIG.agentRules.allowCavemanMode,
      "agentRules.allowCavemanMode",
      configPath,
    ),
    preferPatchOnly: parseBoolean(
      value.preferPatchOnly,
      DEFAULT_CONFIG.agentRules.preferPatchOnly,
      "agentRules.preferPatchOnly",
      configPath,
    ),
    askBeforeLargeFileRead: parseBoolean(
      value.askBeforeLargeFileRead,
      DEFAULT_CONFIG.agentRules.askBeforeLargeFileRead,
      "agentRules.askBeforeLargeFileRead",
      configPath,
    ),
  };
}

function parseModelPreferences(value: unknown, configPath: string): WmaConfig["models"] {
  if (value === undefined) return DEFAULT_CONFIG.models;
  if (!isRecord(value)) throw new CliError(`Workspace config at ${configPath} models must be an object.`);

  return {
    preferredProviders: parseStringArray(
      value.preferredProviders,
      DEFAULT_CONFIG.models.preferredProviders,
      "models.preferredProviders",
      configPath,
    ),
    allowLocalModels: parseBoolean(
      value.allowLocalModels,
      DEFAULT_CONFIG.models.allowLocalModels,
      "models.allowLocalModels",
      configPath,
    ),
    allowCloudModels: parseBoolean(
      value.allowCloudModels,
      DEFAULT_CONFIG.models.allowCloudModels,
      "models.allowCloudModels",
      configPath,
    ),
  };
}

function parseBoolean(value: unknown, fallback: boolean, field: string, configPath: string): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") {
    throw new CliError(`Workspace config at ${configPath} has invalid ${field}; expected a boolean.`);
  }
  return value;
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
