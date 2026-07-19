import { scanWorkspace } from "@wma/scanner";
import { recommendModels } from "@wma/recommender";
import { applyModelProfile } from "@wma/model-catalog";
import { formatRecommendationTable, formatRecommendationJson } from "../utils/output.js";
import { resolveCatalog } from "../utils/loadCatalog.js";
import { resolveTargetPath } from "../utils/paths.js";
import { loadWorkspaceConfig } from "../utils/loadWorkspaceConfig.js";
import { getActiveModelProfile, type PrivacySetting, type WorkspaceGoal } from "@wma/core";

export interface RecommendOptions {
  target?: string;
  goal?: WorkspaceGoal;
  privacy?: PrivacySetting;
  catalog?: string;
  format?: string;
  output?: string;
  tokenBudget?: number;
  debug?: boolean;
}

export async function executeRecommend(options: RecommendOptions): Promise<string> {
  const rootPath = resolveTargetPath(options.target);
  const config = await loadWorkspaceConfig(rootPath);

  const scanResult = await scanWorkspace({ rootPath, userExcludePatterns: config.exclude });
  const catalog = resolveCatalog(options.catalog, rootPath);
  const models = applyModelProfile(catalog.models, getActiveModelProfile(config.teamPolicy));

  if (models.length === 0) {
    return "No models found in catalog. Recommendations unavailable.";
  }

  const privacy = options.privacy ?? config.privacyMode;
  const goal = options.goal ?? config.defaultGoal;

  const result = recommendModels({
    models,
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
