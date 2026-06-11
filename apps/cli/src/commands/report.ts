import { scanWorkspace } from "@wma/scanner";
import { recommendModels } from "@wma/recommender";
import { generateMarkdownReport, generateJsonReport } from "@wma/reports";
import { createRepoMap, formatRepoMapMarkdown } from "@wma/repo-map";
import { resolveCatalog } from "../utils/loadCatalog.js";
import { resolveTargetPath } from "../utils/paths.js";
import { loadWorkspaceConfig } from "../utils/loadWorkspaceConfig.js";

export interface ReportOptions {
  target?: string;
  goal?: string;
  privacy?: string;
  catalog?: string;
  format?: string;
  output?: string;
  includeRepoMap?: boolean;
  debug?: boolean;
}

export async function executeReport(options: ReportOptions): Promise<string> {
  const rootPath = resolveTargetPath(options.target);
  const config = await loadWorkspaceConfig(rootPath);

  const scanResult = await scanWorkspace({ rootPath });
  const catalog = resolveCatalog(options.catalog, rootPath);

  const privacy = (options.privacy ?? config.privacyMode) as "local-first" | "cloud-ok";
  const goal = (options.goal ?? config.defaultGoal) as any;

  let recommendation = null;
  if (catalog.models.length > 0) {
    try {
      recommendation = recommendModels({
        models: catalog.models,
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
