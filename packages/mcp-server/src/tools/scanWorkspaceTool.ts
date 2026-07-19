import { z } from "zod";
import { PRIVACY_SETTINGS, WORKSPACE_GOALS, loadTeamPolicy } from "@wma/core";
import { scanWorkspace } from "@wma/scanner";
import { validateRootPath } from "../utils/safeRootPath.js";
import { createCompactWorkspaceSummary } from "../utils/compactResults.js";
import { setLatestScan, getLatestScan } from "../state.js";

const ScanWorkspaceInputSchema = z.object({
  rootPath: z.string().optional(),
  goal: z.enum(WORKSPACE_GOALS).optional(),
  privacyMode: z.enum(PRIVACY_SETTINGS).optional(),
}).strict();

export type ScanWorkspaceInput = z.infer<typeof ScanWorkspaceInputSchema>;

export async function handleScanWorkspace(input: Record<string, unknown>) {
  const parsed = ScanWorkspaceInputSchema.parse(input);

  const rootPath = validateRootPath(parsed.rootPath);
  const policy = await loadTeamPolicy(rootPath);

  const scanResult = await scanWorkspace({
    rootPath,
    userExcludePatterns: policy?.exclude,
  });

  setLatestScan(scanResult);

  const summary = {
    ...createCompactWorkspaceSummary(scanResult),
    goal: parsed.goal ?? null,
    privacyMode: parsed.privacyMode ?? null,
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(summary, null, 2),
      },
    ],
  };
}

export function getCachedScan(): ReturnType<typeof createCompactWorkspaceSummary> | null {
  const scan = getLatestScan();
  if (!scan) return null;
  return createCompactWorkspaceSummary(scan);
}
