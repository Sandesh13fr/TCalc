import { scanWorkspace } from "@wma/scanner";
import { createRepoMap, formatRepoMapMarkdown } from "@wma/repo-map";
import { formatRepoMapJson } from "../utils/output.js";
import { resolveTargetPath } from "../utils/paths.js";
import { loadWorkspaceConfig } from "../utils/loadWorkspaceConfig.js";

export interface RepoMapOptions {
  target?: string;
  goal?: string;
  budget?: number;
  output?: string;
  format?: string;
  debug?: boolean;
  noSymbols?: boolean;
  maxSymbols?: number;
  maxParseBytes?: number;
}

export async function executeRepoMap(options: RepoMapOptions): Promise<string> {
  const rootPath = resolveTargetPath(options.target);
  const config = await loadWorkspaceConfig(rootPath);

  const scanResult = await scanWorkspace({ rootPath, userExcludePatterns: config.exclude });

  let budget = options.budget ?? config.tokenBudget.defaultContextBudget;
  if (config.teamPolicy?.maxTokenBudget !== undefined) {
    budget = Math.min(budget, config.teamPolicy.maxTokenBudget);
  }

  const repoMap = createRepoMap(scanResult, {
    tokenBudget: budget,
    goal: (options.goal ?? config.defaultGoal) as any,
    enableSymbolExtraction: !options.noSymbols,
    maxSymbols: options.maxSymbols,
    maxParseFileBytes: options.maxParseBytes,
  });

  const fmt = options.format ?? "markdown";
  switch (fmt) {
    case "json":
      return formatRepoMapJson(repoMap);
    default:
      return formatRepoMapMarkdown(repoMap);
  }
}
