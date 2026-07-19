import { InvalidArgumentError } from "commander";
import {
  AGENT_TARGETS,
  OPTIMIZATION_MODES,
  PRIVACY_SETTINGS,
  WORKSPACE_GOALS,
  type AgentTarget,
  type OptimizationMode,
  type WorkspaceGoal,
} from "@wma/core";
import type { McpTarget } from "../commands/mcpConfig.js";

const mcpTargets = ["cursor", "continue", "claude-desktop", "generic"] as const;

export const parseGoal = choice("goal", WORKSPACE_GOALS) as (value: string) => WorkspaceGoal;
export const parseAgentTarget = choice("target", AGENT_TARGETS) as (value: string) => AgentTarget;
export const parseOptimizationMode = choice("mode", OPTIMIZATION_MODES) as (value: string) => OptimizationMode;
export const parsePrivacyMode = choice("privacy mode", PRIVACY_SETTINGS);
export const parseMcpTarget = choice("MCP target", mcpTargets) as (value: string) => McpTarget;
export const parseScanFormat = choice("format", ["table", "json", "markdown"] as const);
export const parseTableFormat = choice("format", ["table", "json"] as const);
export const parseReportFormat = choice("format", ["markdown", "json"] as const);

export function parsePositiveInteger(value: string): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) throw new InvalidArgumentError("Expected a positive integer.");
  return number;
}

function choice<const T extends readonly string[]>(label: string, values: T) {
  return (value: string): T[number] => {
    if (!values.includes(value as T[number])) {
      throw new InvalidArgumentError(`Invalid ${label}: ${value}. Expected one of: ${values.join(", ")}.`);
    }
    return value as T[number];
  };
}
