import { z } from "zod";
import type { WorkspaceGoal } from "@wma/core";
import { scanWorkspace } from "@wma/scanner";
import { validateRootPath } from "../utils/safeRootPath.js";
import { createCompactWorkspaceSummary } from "../utils/compactResults.js";
import { setLatestScan, getLatestScan } from "../state.js";

const ScanWorkspaceInputSchema = z.object({
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
  privacyMode: z.enum(["local-first", "cloud-ok"]).optional(),
  maxFiles: z.number().int().positive().optional(),
  tokenBudget: z.number().int().positive().optional(),
});

export type ScanWorkspaceInput = z.infer<typeof ScanWorkspaceInputSchema>;

export async function handleScanWorkspace(input: Record<string, unknown>) {
  const parsed = ScanWorkspaceInputSchema.parse(input);

  const rootPath = validateRootPath(parsed.rootPath);

  const scanResult = await scanWorkspace({
    rootPath,
  });

  setLatestScan(scanResult);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(createCompactWorkspaceSummary(scanResult), null, 2),
      },
    ],
  };
}

export function getCachedScan(): ReturnType<typeof createCompactWorkspaceSummary> | null {
  const scan = getLatestScan();
  if (!scan) return null;
  return createCompactWorkspaceSummary(scan);
}