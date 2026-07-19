import { z } from "zod";
import { PRIVACY_SETTINGS, WORKSPACE_GOALS, getActiveModelProfile, loadTeamPolicy } from "@wma/core";
import { scanWorkspace } from "@wma/scanner";
import { applyModelProfile, loadModelCatalog, validateModelCatalog } from "@wma/model-catalog";
import { recommendModels } from "@wma/recommender";
import { generateMarkdownReport, generateJsonReport } from "@wma/reports";
import { createRepoMap, formatRepoMapMarkdown } from "@wma/repo-map";
import { resolveCatalogPath, validateRootPath } from "../utils/safeRootPath.js";
import { setLatestScan, setLatestRecommendation, setLatestRepoMap, setLatestCatalog } from "../state.js";

const GenerateReportInputSchema = z.object({
  rootPath: z.string().optional(),
  goal: z.enum(WORKSPACE_GOALS).optional(),
  privacyMode: z.enum(PRIVACY_SETTINGS).optional(),
  catalogPath: z.string().optional(),
  includeRepoMap: z.boolean().optional(),
  format: z.enum(["markdown", "json"]).optional(),
}).strict();

export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;

export async function handleGenerateReport(input: Record<string, unknown>) {
  const parsed = GenerateReportInputSchema.parse(input);

  const rootPath = validateRootPath(parsed.rootPath);
  const policy = await loadTeamPolicy(rootPath);
  const goal = policy?.defaultGoal ?? parsed.goal ?? "build-mvp";
  const privacyMode = policy?.privacyMode ?? parsed.privacyMode ?? "local-first";
  const format = parsed.format ?? "markdown";
  const includeRepoMap = parsed.includeRepoMap ?? false;
  const catalogPath = resolveCatalogPath(parsed.catalogPath);

  const scanResult = await scanWorkspace({ rootPath, userExcludePatterns: policy?.exclude });
  setLatestScan(scanResult);

  const catalog = loadModelCatalog(catalogPath);
  const validationErrors = validateModelCatalog(catalog.models);
  if (validationErrors.length > 0) throw new Error(`Invalid model catalog: ${validationErrors[0]}`);
  const models = applyModelProfile(catalog.models, getActiveModelProfile(policy));
  setLatestCatalog(catalog);

  let recommendation = null;
  if (models.length > 0) {
    recommendation = recommendModels({
      models,
      workspaceTokens: scanResult.includedTokens,
      goal,
      privacyMode,
      budget: policy?.maxTokenBudget,
    });
    setLatestRecommendation(recommendation);
  }

  let report = format === "markdown"
    ? generateMarkdownReport(scanResult, recommendation)
    : generateJsonReport(scanResult, recommendation);

  if (includeRepoMap) {
    const repoMap = createRepoMap(scanResult, { tokenBudget: policy?.maxTokenBudget ?? 64000, goal });
    setLatestRepoMap(repoMap);
    if (format === "json") {
      const parsedReport = JSON.parse(report) as Record<string, unknown>;
      parsedReport.repoMap = repoMap;
      report = JSON.stringify(parsedReport, null, 2);
    } else {
      report += `\n\n---\n\n${formatRepoMapMarkdown(repoMap)}`;
    }
  }

  return {
    content: [
      {
        type: "text" as const,
        text: report,
      },
    ],
  };
}
