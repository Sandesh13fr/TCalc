import { escapeMarkdownText, markdownCode, type WorkspaceGoal } from "@wma/core";
import { estimateTokens } from "@wma/tokenizers";

export interface GoalCompactionInput {
  goal: WorkspaceGoal;
  summary: string;
  changedFiles?: string[];
  decisions?: string[];
  nextSteps?: string[];
  sourceTokens?: number;
}

export interface GoalCompactionOutput {
  content: string;
  estimatedTokens: number;
  savedTokens: number | null;
}

export function compactCompletedGoal(input: GoalCompactionInput): GoalCompactionOutput {
  const lines = [
    "# Completed Goal Context",
    "",
    `- **Goal:** ${markdownCode(input.goal)}`,
    `- **Outcome:** ${escapeMarkdownText(input.summary)}`,
  ];
  appendList(lines, "Changed Files", input.changedFiles, markdownCode);
  appendList(lines, "Decisions", input.decisions, escapeMarkdownText);
  appendList(lines, "Next Steps", input.nextSteps, escapeMarkdownText);
  const content = lines.join("\n");
  const estimatedTokens = estimateTokens(content);
  return {
    content,
    estimatedTokens,
    savedTokens: input.sourceTokens === undefined ? null : Math.max(0, input.sourceTokens - estimatedTokens),
  };
}

function appendList(lines: string[], heading: string, values: string[] | undefined, format: (value: string) => string): void {
  if (!values?.length) return;
  lines.push("", `## ${heading}`, "");
  for (const value of values) lines.push(`- ${format(value)}`);
}
