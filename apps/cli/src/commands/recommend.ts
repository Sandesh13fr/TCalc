import { scanWorkspace } from "@wma/scanner";
import { recommendModels } from "@wma/recommender";
import { formatRecommendationTable, formatRecommendationJson } from "../utils/output.js";
import { resolveCatalog } from "../utils/loadCatalog.js";
import { resolveTargetPath } from "../utils/paths.js";
import { loadWorkspaceConfig } from "../utils/loadWorkspaceConfig.js";

export interface RecommendOptions {
  target?: string;
  goal?: string;
  privacy?: string;
  catalog?: string;
  format?: string;
  output?: string;
  tokenBudget?: number;
  debug?: boolean;
}

export async function executeRecommend(options: RecommendOptions): Promise<string> {
  const rootPath = resolveTargetPath(options.target);
  const config = await loadWorkspaceConfig(rootPath);

  const scanResult = await scanWorkspace({ rootPath });
  const catalog = resolveCatalog(options.catalog, rootPath);

  if (catalog.models.length === 0) {
    return "No models found in catalog. Recommendations unavailable.";
  }

  const privacy = (options.privacy ?? config.privacyMode) as "local-first" | "cloud-ok";
  const goal = (options.goal ?? config.defaultGoal) as any;

  const result = recommendModels({
    models: catalog.models,
    workspaceTokens: scanResult.includedTokens,
    goal,
    privacyMode: privacy,
    budget: options.tokenBudget,
  });

  const fmt = options.format ?? "table";
  switch (fmt) {
    case "json":
      return formatRecommendationJson(result);
    default:
      return formatRecommendationTable(result);
  }
}
