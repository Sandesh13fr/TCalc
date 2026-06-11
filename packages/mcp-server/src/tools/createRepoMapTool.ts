import { z } from "zod";
import type { WorkspaceGoal } from "@wma/core";
import { scanWorkspace } from "@wma/scanner";
import { createRepoMap } from "@wma/repo-map";
import { formatRepoMapMarkdown } from "@wma/repo-map";
import { validateRootPath } from "../utils/safeRootPath.js";
import { setLatestScan, setLatestRepoMap, getLatestRepoMap } from "../state.js";

const CreateRepoMapInputSchema = z.object({
  rootPath: z.string().optional(),
  goal: z.enum([
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
  ]).optional(),
  tokenBudget: z.number().int().positive().optional(),
  enableSymbolExtraction: z.boolean().optional(),
  maxSymbols: z.number().int().positive().optional(),
  format: z.enum(["markdown", "json"]).optional(),
});

export type CreateRepoMapInput = z.infer<typeof CreateRepoMapInputSchema>;

export async function handleCreateRepoMap(input: Record<string, unknown>) {
  const parsed = CreateRepoMapInputSchema.parse(input);

  const rootPath = validateRootPath(parsed.rootPath);
  const format = parsed.format ?? "markdown";
  const tokenBudget = parsed.tokenBudget ?? 64000;

  const scanResult = await scanWorkspace({ rootPath });
  setLatestScan(scanResult);

  const repoMap = createRepoMap(scanResult, {
    tokenBudget,
    goal: parsed.goal,
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