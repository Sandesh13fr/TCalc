import { z } from "zod";
import { WORKSPACE_GOALS, loadTeamPolicy, type WorkspaceGoal } from "@wma/core";
import { scanWorkspace } from "@wma/scanner";
import { createRepoMap, formatRepoMapMarkdown } from "@wma/repo-map";
import { validateRootPath } from "../utils/safeRootPath.js";
import { setLatestScan, setLatestRepoMap, getLatestRepoMap } from "../state.js";

const CreateRepoMapInputSchema = z.object({
  rootPath: z.string().optional(),
  goal: z.enum(WORKSPACE_GOALS).optional(),
  tokenBudget: z.number().int().positive().optional(),
  enableSymbolExtraction: z.boolean().optional(),
  maxSymbols: z.number().int().positive().optional(),
  format: z.enum(["markdown", "json"]).optional(),
}).strict();

export type CreateRepoMapInput = z.infer<typeof CreateRepoMapInputSchema>;

export async function handleCreateRepoMap(input: Record<string, unknown>) {
  const parsed = CreateRepoMapInputSchema.parse(input);

  const rootPath = validateRootPath(parsed.rootPath);
  const policy = await loadTeamPolicy(rootPath);
  const format = parsed.format ?? "markdown";
  const tokenBudget = policy?.maxTokenBudget ? Math.min(parsed.tokenBudget ?? policy.maxTokenBudget, policy.maxTokenBudget) : parsed.tokenBudget ?? 64000;

  const scanResult = await scanWorkspace({ rootPath, userExcludePatterns: policy?.exclude });
  setLatestScan(scanResult);

  const repoMap = createRepoMap(scanResult, {
    tokenBudget,
    goal: (policy?.defaultGoal ?? parsed.goal) as WorkspaceGoal | undefined,
    enableSymbolExtraction: parsed.enableSymbolExtraction ?? true,
    maxSymbols: parsed.maxSymbols ?? 500,
    maxParseFileBytes: 200000,
  });

  setLatestRepoMap(repoMap);

  if (format === "markdown") {
    const markdown = formatRepoMapMarkdown(repoMap);
    return {
      content: [
        {
          type: "text" as const,
          text: markdown,
        },
      ],
    };
  }

  // Return compact JSON without full source bodies
  const {
    symbols,
    imports,
    routes,
    ...compactMap
  } = repoMap;

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(compactMap, null, 2),
      },
    ],
  };
}

export function getCachedRepoMap(): string | null {
  const map = getLatestRepoMap();
  if (!map) return null;
  const { symbols, imports, routes, ...compactMap } = map;
  return JSON.stringify(compactMap, null, 2);
}
