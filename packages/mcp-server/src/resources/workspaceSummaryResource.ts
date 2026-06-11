import { getLatestScan } from "../state.js";
import { createCompactWorkspaceSummary } from "../utils/compactResults.js";

export async function readWorkspaceSummary(): Promise<{
  contents: Array<{ uri: string; text: string }>;
}> {
  const scan = getLatestScan();

  if (!scan) {
    return {
      contents: [
        {
          uri: "workspace://summary",
          text: "No workspace scan has been run yet. Use the scan_workspace tool first.",
        },
      ],
    };
  }

  return {
    contents: [
      {
        uri: "workspace://summary",
        text: JSON.stringify(createCompactWorkspaceSummary(scan), null, 2),
      },
    ],
  };
}