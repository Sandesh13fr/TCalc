import { z } from "zod";
import { AGENT_TARGETS, OPTIMIZATION_MODES, PRIVACY_SETTINGS, WORKSPACE_GOALS, getActiveModelProfile, loadTeamPolicy } from "@wma/core";
import { scanWorkspace } from "@wma/scanner";
import { applyModelProfile, loadModelCatalog } from "@wma/model-catalog";
import { recommendModels } from "@wma/recommender";
import { generateAgentRules } from "@wma/agent-rules";
import { resolveCatalogPath, validateRootPath } from "../utils/safeRootPath.js";
import { setLatestScan, setLatestRecommendation } from "../state.js";

const GenerateAgentRulesInputSchema = z.object({
  rootPath: z.string().optional(),
  goal: z.enum(WORKSPACE_GOALS).optional(),
  target: z.enum(AGENT_TARGETS).optional(),
  mode: z.enum(OPTIMIZATION_MODES).optional(),
  privacyMode: z.enum(PRIVACY_SETTINGS).optional(),
}).strict();

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
  const policy = await loadTeamPolicy(rootPath);
  const goal = policy?.defaultGoal ?? parsed.goal ?? "build-mvp";
  const privacyMode = policy?.privacyMode ?? parsed.privacyMode ?? "local-first";

  const scanResult = await scanWorkspace({ rootPath, userExcludePatterns: policy?.exclude });
  setLatestScan(scanResult);

  const catalog = loadModelCatalog(resolveCatalogPath());
  const models = applyModelProfile(catalog.models, getActiveModelProfile(policy));

  const recommendation = models.length > 0
    ? recommendModels({
        models,
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
    target,
    mode,
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
