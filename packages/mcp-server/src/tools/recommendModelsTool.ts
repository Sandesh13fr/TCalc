import { z } from "zod";
import path from "node:path";
import type { WorkspaceGoal } from "@wma/core";
import { scanWorkspace } from "@wma/scanner";
import { loadModelCatalog, validateModelCatalog } from "@wma/model-catalog";
import { recommendModels } from "@wma/recommender";
import { validateRootPath } from "../utils/safeRootPath.js";
import { createCompactRecommendationSummary } from "../utils/compactResults.js";
import { setLatestScan, setLatestRecommendation, getLatestRecommendation } from "../state.js";

const RecommendModelsInputSchema = z.object({
  rootPath: z.string().optional(),
  goal: z.enum([
    "build-mvp",
    "add-feature",
    "debug",
    "refactor",
    "migration",
    "security-review",
    "test-generation",
    "documentation",
    "architecture-planning",
    "cleanup",
  ]).optional(),
  privacyMode: z.enum(["local-first", "cloud-ok"]).optional(),
  catalogPath: z.string().optional(),
  tokenBudget: z.number().int().positive().optional(),
});

export type RecommendModelsInput = z.infer<typeof RecommendModelsInputSchema>;

const DEFAULT_CATALOG_PATH = path.resolve(process.cwd(), "catalog.json");

export async function handleRecommendModels(input: Record<string, unknown>) {
  const parsed = RecommendModelsInputSchema.parse(input);

  const rootPath = validateRootPath(parsed.rootPath);
  const goal = parsed.goal ?? "build-mvp";
  const privacyMode = parsed.privacyMode ?? "local-first";
  const catalogPath = parsed.catalogPath ?? process.env.WMA_CATALOG_PATH ?? path.resolve(process.cwd(), "catalog.json");

  const scanResult = await scanWorkspace({ rootPath });
  setLatestScan(scanResult);

  const catalog = loadModelCatalog(catalogPath);
  const validationErrors = validateModelCatalog(catalog.models);

  if (catalog.models.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: "No models loaded from catalog",
            catalogPath,
            validationErrors,
          }, null, 2),
        },
      ],
    };
  }

  const recommendation = recommendModels({
    models: catalog.models,
    workspaceTokens: scanResult.includedTokens,
    goal,
    privacyMode,
    budget: parsed.tokenBudget,
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

export function getCachedRecommendation(): ReturnType<typeof createCompactRecommendationSummary> | null {
  const rec = getLatestRecommendation();
  if (!rec) return null;
  return createCompactRecommendationSummary(rec);
}