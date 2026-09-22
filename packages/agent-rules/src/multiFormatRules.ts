import type { OptimizationMode, AgentRulesOutput } from "@wma/core";
import { generateAgentRules } from "./generateRules.js";
import { generateWindsurfRules } from "./generateWindsurfRules.js";
import { generateCopilotInstructions } from "./generateCopilotInstructions.js";
import { generateGeminiRules } from "./generateGeminiRules.js";

export type ExtendedAgentFormat =
  | "cursor"
  | "claude-code"
  | "generic"
  | "windsurf"
  | "copilot"
  | "gemini"
  | "all";

export interface MultiFormatRulesOptions {
  mode?: OptimizationMode;
  workspaceTokens?: number;
  modelRecommendations?: string[];
  testCommand?: string;
  buildCommand?: string;
  projectDescription?: string;
  codingConventions?: string[];
  systemRole?: string;
}

export function generateMultiFormatRules(
  format: ExtendedAgentFormat,
  options: MultiFormatRulesOptions = {},
): AgentRulesOutput | Record<string, AgentRulesOutput> {
  const mode = options.mode ?? "balanced";

  switch (format) {
    case "cursor":
      return generateAgentRules({
        target: "cursor",
        mode,
        workspaceTokens: options.workspaceTokens,
        modelRecommendations: options.modelRecommendations,
      });
    case "claude-code":
      return generateAgentRules({
        target: "claude-code",
        mode,
        workspaceTokens: options.workspaceTokens,
        modelRecommendations: options.modelRecommendations,
      });
    case "generic":
      return generateAgentRules({
        target: "generic",
        mode,
        workspaceTokens: options.workspaceTokens,
        modelRecommendations: options.modelRecommendations,
      });
    case "windsurf":
      return generateWindsurfRules({
        mode,
        workspaceTokens: options.workspaceTokens,
        modelRecommendations: options.modelRecommendations,
        testCommand: options.testCommand,
        buildCommand: options.buildCommand,
      });
    case "copilot":
      return generateCopilotInstructions({
        mode,
        workspaceTokens: options.workspaceTokens,
        projectDescription: options.projectDescription,
        codingConventions: options.codingConventions,
      });
    case "gemini":
      return generateGeminiRules({
        mode,
        workspaceTokens: options.workspaceTokens,
        systemRole: options.systemRole,
      });
    case "all":
      return {
        cursor: generateAgentRules({ target: "cursor", mode, workspaceTokens: options.workspaceTokens }),
        claude: generateAgentRules({ target: "claude-code", mode, workspaceTokens: options.workspaceTokens }),
        generic: generateAgentRules({ target: "generic", mode, workspaceTokens: options.workspaceTokens }),
        windsurf: generateWindsurfRules(options),
        copilot: generateCopilotInstructions(options),
        gemini: generateGeminiRules(options),
      };
  }
}
