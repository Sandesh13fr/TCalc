import { z } from "zod";
import type { WorkspaceGoal, AgentTarget, OptimizationMode } from "@wma/core";
import { scanWorkspace } from "@wma/scanner";
import { loadModelCatalog } from "@wma/model-catalog";
import { recommendModels } from "@wma/recommender";
import { generateAgentRules } from "@wma/agent-rules";
import { validateRootPath } from "../utils/safeRootPath.js";
import { setLatestScan, setLatestRecommendation } from "../state.js";

const GenerateAgentRulesInputSchema = z.object({
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
  target: z.enum(["generic", "cursor", "claude-code"]).optional(),
  mode: z.enum([
    "normal",
    "concise",
    "patch-only",
    "repo-map-first",
    "ask-before-reading-large-files",
  ]).optional(),
  privacyMode: z.enum(["local-first", "cloud-ok"]).optional(),
});

export type GenerateAgentRulesInput = z.infer<typeof GenerateAgentRulesInputSchema>;

interface AgentRulesOutput {
  target: string;
  mode: string;
  suggestedFileName: string;
  content: string;
}

export async function handleGenerateAgentRules(input: Record<string, unknown>) {
  const parsed = GenerateAgentRulesInputSchema.parse(input);

  const rootPath = validateRootPath(parsed.rootPath);
  const target = parsed.target ?? "generic";
  const mode = parsed.mode ?? "repo-map-first";
  const goal = parsed.goal ?? "build-mvp";
  const privacyMode = parsed.privacyMode ?? "local-first";

  const scanResult = await scanWorkspace({ rootPath });
  setLatestScan(scanResult);

  const catalog = loadModelCatalog(parsed.rootPath ?? process.cwd());

  const recommendation = catalog.models.length > 0
    ? recommendModels({
        models: catalog.models,
        workspaceTokens: scanResult.includedTokens,
        goal,
        privacyMode,
      })
    : null;

  if (recommendation) {
    setLatestRecommendation(recommendation);
  }

  const modelRecommendations = recommendation
    ? [recommendation.cheapestSufficient.modelId, recommendation.balanced.modelId, recommendation.highConfidence.modelId]
    : [];

  const rules = generateAgentRules({
    target: target as AgentTarget,
    mode: mode as OptimizationMode,
    workspaceTokens: scanResult.includedTokens,
    modelRecommendations,
  });

  const output: AgentRulesOutput = {
    target: rules.target,
    mode: rules.mode,
    suggestedFileName: rules.fileName,
    content: rules.content,
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(output, null, 2),
      },
    ],
  };
}