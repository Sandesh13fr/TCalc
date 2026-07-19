/** Runtime option values shared by every TCalc surface. */
export const WORKSPACE_GOALS = [
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
] as const;

export type WorkspaceGoal = (typeof WORKSPACE_GOALS)[number];

export const AGENT_TARGETS = [
  "generic",
  "cursor",
  "claude-code",
  "codex",
  "cline",
  "roo",
  "continue",
  "aider",
] as const;

export type AgentTarget = (typeof AGENT_TARGETS)[number];

export const OPTIMIZATION_MODES = [
  "normal",
  "concise",
  "caveman",
  "patch-only",
  "test-first",
  "plan-then-edit",
  "repo-map-first",
  "ask-before-large-files",
  "no-full-file-dumps",
  "use-summaries",
] as const;

export type OptimizationMode = (typeof OPTIMIZATION_MODES)[number];

export const PRIVACY_SETTINGS = ["local-first", "cloud-ok"] as const;

export type PrivacySetting = (typeof PRIVACY_SETTINGS)[number];

export const isWorkspaceGoal = (value: unknown): value is WorkspaceGoal => includes(WORKSPACE_GOALS, value);
export const isAgentTarget = (value: unknown): value is AgentTarget => includes(AGENT_TARGETS, value);
export const isOptimizationMode = (value: unknown): value is OptimizationMode => includes(OPTIMIZATION_MODES, value);
export const isPrivacySetting = (value: unknown): value is PrivacySetting => includes(PRIVACY_SETTINGS, value);

function includes<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && values.includes(value as T[number]);
}
