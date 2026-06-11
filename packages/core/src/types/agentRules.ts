/**
 * Agent rules types for rule generation.
 */

/** Target coding agent. */
export type AgentTarget =
  | "cursor"
  | "claude-code"
  | "codex"
  | "cline"
  | "roo"
  | "continue"
  | "aider"
  | "generic";

/** Optimization mode for agent rules. */
export type OptimizationMode =
  | "normal"
  | "concise"
  | "caveman"
  | "patch-only"
  | "test-first"
  | "plan-then-edit"
  | "repo-map-first"
  | "ask-before-large-files"
  | "no-full-file-dumps"
  | "use-summaries";

/** Generated agent rules output. */
export interface AgentRulesOutput {
  /** Target agent. */
  target: AgentTarget;
  /** Optimization mode applied. */
  mode: OptimizationMode;
  /** Generated file name (e.g. ".cursorrules"). */
  fileName: string;
  /** Generated rules content. */
  content: string;
  /** Files to avoid or limit. */
  avoidFiles: string[];
  /** Token budget guidance. */
  tokenBudget: number;
}
