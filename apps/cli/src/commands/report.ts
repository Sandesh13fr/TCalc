import { scanWorkspace } from "@wma/scanner";
import { recommendModels } from "@wma/recommender";
import { generateMarkdownReport, generateJsonReport } from "@wma/reports";
import { createRepoMap, formatRepoMapMarkdown } from "@wma/repo-map";
import { resolveCatalog } from "../utils/loadCatalog.js";
import { resolveTargetPath } from "../utils/paths.js";
import { loadWorkspaceConfig } from "../utils/loadWorkspaceConfig.js";
import { getActiveModelProfile, type PrivacySetting, type WorkspaceGoal } from "@wma/core";
import { applyModelProfile } from "@wma/model-catalog";

export interface ReportOptions {
  target?: string;
  goal?: WorkspaceGoal;
  privacy?: PrivacySetting;
  catalog?: string;
  format?: string;
  output?: string;
  includeRepoMap?: boolean;
  debug?: boolean;
}

export async function executeReport(options: ReportOptions): Promise<string> {
  const rootPath = resolveTargetPath(options.target);
  const config = await loadWorkspaceConfig(rootPath);

  const scanResult = await scanWorkspace({ rootPath, userExcludePatterns: config.exclude });
  const catalog = resolveCatalog(options.catalog, rootPath);
  const models = applyModelProfile(catalog.models, getActiveModelProfile(config.teamPolicy));

  const privacy = options.privacy ?? config.privacyMode;
  const goal = options.goal ?? config.defaultGoal;

  let recommendation = null;
  if (models.length > 0) {
    try {
      recommendation = recommendModels({
        models,
        workspaceTokens: scanResult.includedTokens,
        goal,
        privacyMode: privacy,
      });
    } catch {
      // proceed without recommendations
    }
  }

  const fmt = options.format ?? "markdown";

  let report: string;
  switch (fmt) {
    case "json":
      report = generateJsonReport(scanResult, recommendation);
      break;
    default:
      report = generateMarkdownReport(scanResult, recommendation);
      break;
  }

  if (options.includeRepoMap) {
    if (fmt === "json") {
      const repoMap = createRepoMap(scanResult, {
        tokenBudget: config.tokenBudget.defaultContextBudget,
        goal,
      });
      const parsed = JSON.parse(report) as Record<string, unknown>;
      parsed.repoMap = repoMap;
      report = JSON.stringify(parsed, null, 2);
    } else {
      const repoMap = createRepoMap(scanResult, {
        tokenBudget: config.tokenBudget.defaultContextBudget,
        goal,
      });
      const repoMapMd = formatRepoMapMarkdown(repoMap);
      report += "\n\n---\n\n" + repoMapMd;
    }
  }

  return report;
}
