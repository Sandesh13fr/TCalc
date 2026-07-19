import { compactCompletedGoal } from "@wma/agent-rules";
import type { WorkspaceGoal } from "@wma/core";

export interface CompactOptions {
  goal: WorkspaceGoal;
  summary: string;
  changedFiles?: string[];
  decisions?: string[];
  nextSteps?: string[];
  sourceTokens?: number;
  format?: "markdown" | "json";
}

export function executeCompact(options: CompactOptions): string {
  const result = compactCompletedGoal({
    goal: options.goal,
    summary: options.summary,
    changedFiles: options.changedFiles,
    decisions: options.decisions,
    nextSteps: options.nextSteps,
    sourceTokens: options.sourceTokens,
  });
  return options.format === "json" ? JSON.stringify(result, null, 2) : result.content;
}
