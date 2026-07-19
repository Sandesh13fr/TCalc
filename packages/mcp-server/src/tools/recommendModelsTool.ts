import { z } from "zod";
import { PRIVACY_SETTINGS, WORKSPACE_GOALS, getActiveModelProfile, loadTeamPolicy } from "@wma/core";
import { scanWorkspace } from "@wma/scanner";
import { applyModelProfile, loadModelCatalog, validateModelCatalog } from "@wma/model-catalog";
import { recommendModels } from "@wma/recommender";
import { resolveCatalogPath, validateRootPath } from "../utils/safeRootPath.js";
import { createCompactRecommendationSummary } from "../utils/compactResults.js";
import { setLatestScan, setLatestRecommendation, getLatestRecommendation } from "../state.js";

const RecommendModelsInputSchema = z.object({
  rootPath: z.string().optional(),
  goal: z.enum(WORKSPACE_GOALS).optional(),
  privacyMode: z.enum(PRIVACY_SETTINGS).optional(),
  catalogPath: z.string().optional(),
  tokenBudget: z.number().int().positive().optional(),
}).strict();

export type RecommendModelsInput = z.infer<typeof RecommendModelsInputSchema>;

export async function handleRecommendModels(input: Record<string, unknown>) {
  const parsed = RecommendModelsInputSchema.parse(input);

  const rootPath = validateRootPath(parsed.rootPath);
  const policy = await loadTeamPolicy(rootPath);
  const goal = policy?.defaultGoal ?? parsed.goal ?? "build-mvp";
  const privacyMode = policy?.privacyMode ?? parsed.privacyMode ?? "local-first";
  let catalogPath: string;
  try {
    catalogPath = resolveCatalogPath(parsed.catalogPath);
  } catch (error) {
    return catalogError(error);
  }

  const scanResult = await scanWorkspace({ rootPath, userExcludePatterns: policy?.exclude });
  setLatestScan(scanResult);

  const catalog = loadModelCatalog(catalogPath);
  const validationErrors = validateModelCatalog(catalog.models);
  const models = applyModelProfile(catalog.models, getActiveModelProfile(policy));

  if (models.length === 0 || validationErrors.length > 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: validationErrors[0] ?? "No models loaded from catalog",
            catalogPath,
            validationErrors,
          }, null, 2),
        },
      ],
    };
  }

  const recommendation = recommendModels({
    models,
    workspaceTokens: scanResult.includedTokens,
    goal,
    privacyMode,
    budget: policy?.maxTokenBudget ? Math.min(parsed.tokenBudget ?? policy.maxTokenBudget, policy.maxTokenBudget) : parsed.tokenBudget,
  });

  setLatestRecommendation(recommendation);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(createCompactRecommendationSummary(recommendation), null, 2),
      },
    ],
  };
}

function catalogError(error: unknown) {
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2),
    }],
  };
}

export function getCachedRecommendation(): ReturnType<typeof createCompactRecommendationSummary> | null {
  const rec = getLatestRecommendation();
  if (!rec) return null;
  return createCompactRecommendationSummary(rec);
}
