import { z } from "zod";
import path from "node:path";
import type { WorkspaceGoal } from "@wma/core";
import { scanWorkspace } from "@wma/scanner";
import { loadModelCatalog } from "@wma/model-catalog";
import { recommendModels } from "@wma/recommender";
import { generateMarkdownReport, generateJsonReport } from "@wma/reports";
import { createRepoMap } from "@wma/repo-map";
import { validateRootPath } from "../utils/safeRootPath.js";
import { setLatestScan, setLatestRecommendation, setLatestRepoMap, setLatestCatalog } from "../state.js";

const GenerateReportInputSchema = z.object({
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
  includeRepoMap: z.boolean().optional(),
  format: z.enum(["markdown", "json"]).optional(),
});

export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;

export async function handleGenerateReport(input: Record<string, unknown>) {
  const parsed = GenerateReportInputSchema.parse(input);

  const rootPath = validateRootPath(parsed.rootPath);
  const goal = parsed.goal ?? "build-mvp";
  const privacyMode = parsed.privacyMode ?? "local-first";
  const format = parsed.format ?? "markdown";
  const includeRepoMap = parsed.includeRepoMap ?? false;
  const catalogPath = parsed.catalogPath ?? path.resolve(process.cwd(), "catalog.json");

  const scanResult = await scanWorkspace({ rootPath });
  setLatestScan(scanResult);

  const catalog = loadModelCatalog(catalogPath);
  setLatestCatalog(catalog);

  let recommendation = null;
  if (catalog.models.length > 0) {
    recommendation = recommendModels({
      models: catalog.models,
      workspaceTokens: scanResult.includedTokens,
      goal,
      privacyMode,
    });
    setLatestRecommendation(recommendation);
  }

  let repoMapJson = "";
  if (includeRepoMap && recommendation) {
    repoMapJson = generateJsonReport(scanResult, recommendation);
  }

  const report = format === "markdown"
    ? generateMarkdownReport(scanResult, recommendation)
    : generateJsonReport(scanResult, recommendation);

  return {
    content: [
      {
        type: "text" as const,
        text: report + (includeRepoMap ? `\n\n---\n\n${repoMapJson}` : ""),
      },
    ],
  };
}