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

  const scanResult = await scanWorkspace({ rootPath });

  const repoMap = createRepoMap(scanResult, {
    tokenBudget: options.budget ?? config.tokenBudget.defaultContextBudget,
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
