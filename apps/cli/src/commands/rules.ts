import { scanWorkspace } from "@wma/scanner";
import { generateAgentRules } from "@wma/agent-rules";
import type { AgentTarget, OptimizationMode } from "@wma/core";
import { resolveTargetPath } from "../utils/paths.js";

export interface RulesOptions {
  target?: string;
  agentTarget: AgentTarget;
  mode: OptimizationMode;
  output?: string;
  yes?: boolean;
  debug?: boolean;
}

export async function executeRules(options: RulesOptions): Promise<{ content: string; fileName: string; outputPath?: string }> {
  const rootPath = resolveTargetPath(options.target);
  const scanResult = await scanWorkspace({ rootPath });

  const result = generateAgentRules({
    target: options.agentTarget,
    mode: options.mode,
    workspaceTokens: scanResult.includedTokens,
  });

  return {
    content: result.content,
    fileName: result.fileName,
  };
}
