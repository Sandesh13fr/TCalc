import type { PrivacySetting, WorkspaceGoal } from "@wma/core";

const GOAL_LABELS: Record<WorkspaceGoal, string> = {
  "build-mvp": "building an MVP",
  "add-feature": "adding a feature",
  "debug": "debugging",
  "refactor": "refactoring",
  "migration": "migration",
  "security-review": "security review",
  "test-generation": "test generation",
  "documentation": "documentation",
  "architecture-planning": "architecture planning",
  "cleanup": "cleanup",
};

export interface OptimizeCodingAgentArgs {
  goal: WorkspaceGoal;
  tokenBudget?: number;
  privacyMode?: PrivacySetting;
}

export function getOptimizeCodingAgentPrompt(args: OptimizeCodingAgentArgs): {
  messages: Array<{ role: "user"; text: string }>;
} {
  const { goal, tokenBudget, privacyMode } = args;
  if (tokenBudget !== undefined && (!Number.isSafeInteger(tokenBudget) || tokenBudget <= 0)) {
    throw new TypeError("Token budget must be a positive integer");
  }
  const goalLabel = GOAL_LABELS[goal] ?? "working on this workspace";

  const lines: string[] = [];
  lines.push(`You are working on ${goalLabel} for this workspace.`);
  lines.push("");
  lines.push("Follow these optimization steps:");
  lines.push("");
  lines.push("1. **Scan the workspace first** — Use the scan_workspace tool to understand the codebase size and structure.");
  lines.push("");
  lines.push("2. **Create a repo map** — Use create_repo_map to identify important files and entry points without reading full file contents.");
  lines.push("");
  lines.push("3. **Avoid risky/generated/large files** — Focus on source code files. Ask before reading large or sensitive files.");
  lines.push("");
  lines.push("4. **Prefer targeted reads** — Use the repo map to identify specific files to read rather than scanning entire directories.");
  lines.push("");
  lines.push("5. **Use patch-only output for code changes** — When making edits, use search/replace or unified diff format to minimize token usage.");
  lines.push("");
  lines.push("6. **Ask before reading large files** — Files over 50K tokens should be summarized first or confirmed with the user.");
  lines.push("");
  lines.push("7. **Recommend model tier before long work** — For extended tasks, use recommend_models to check if your context fits within model limits.");
  lines.push("");

  if (tokenBudget) {
    lines.push(`**Token Budget:** Target ~${tokenBudget.toLocaleString()} tokens for your context.`);
    lines.push("");
  }

  if (privacyMode === "local-first") {
    lines.push("**Privacy Mode:** Only use locally-running models. Do not send code to cloud APIs.");
    lines.push("");
  }

  return {
    messages: [
      {
        role: "user" as const,
        text: lines.join("\n"),
      },
    ],
  };
}
