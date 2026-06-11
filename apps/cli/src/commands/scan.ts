import { scanWorkspace } from "@wma/scanner";
import { formatScanTable, formatScanJson } from "../utils/output.js";
import { resolveTargetPath } from "../utils/paths.js";
import { loadWorkspaceConfig } from "../utils/loadWorkspaceConfig.js";

export interface ScanOptions {
  target?: string;
  goal?: string;
  privacy?: string;
  format?: string;
  output?: string;
  debug?: boolean;
}

export async function executeScan(options: ScanOptions): Promise<string> {
  const rootPath = resolveTargetPath(options.target);

  const scanResult = await scanWorkspace({ rootPath });

  const fmt = options.format ?? "table";
  let output: string;

  switch (fmt) {
    case "json":
      output = formatScanJson(scanResult);
      break;
    case "markdown":
      output = formatScanMarkdown(scanResult);
      break;
    default:
      output = formatScanTable(scanResult);
      break;
  }

  return output;
}

function formatScanMarkdown(scan: import("@wma/core").WorkspaceScanResult): string {
  const lines: string[] = [];
  lines.push("# Workspace Scan Report");
  lines.push("");
  lines.push(`**Workspace Root:** \`${scan.rootPath}\``);
  lines.push(`**Scanned At:** ${scan.scannedAt}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("| --- | ---:|");
  lines.push(`| Total Files | ${scan.totalFiles} |`);
  lines.push(`| Included Files | ${scan.includedFiles} |`);
  lines.push(`| Excluded Files | ${scan.excludedFiles} |`);
  lines.push(`| Total Estimated Tokens | ${scan.totalEstimatedTokens.toLocaleString()} |`);
  lines.push(`| Included Tokens | ${scan.includedTokens.toLocaleString()} |`);
  lines.push("");

  const sortedFiles = [...scan.files]
    .filter((f) => f.included)
    .sort((a, b) => b.estimatedTokens - a.estimatedTokens)
    .slice(0, 10);

  if (sortedFiles.length > 0) {
    lines.push("## Top 10 Token-Heavy Files");
    lines.push("");
    lines.push("| Path | Tokens | % |");
    lines.push("| --- | ---:| ---:|");
    for (const f of sortedFiles) {
      const pc = ((f.estimatedTokens / scan.includedTokens) * 100).toFixed(1);
      lines.push(`| \`${f.relativePath}\` | ${f.estimatedTokens.toLocaleString()} | ${pc}% |`);
    }
    lines.push("");
  }

  if (scan.languages.length > 0) {
    lines.push("## Languages");
    lines.push("");
    lines.push("| Language | Files | Tokens | % |");
    lines.push("| --- | ---:| ---:| ---:|");
    const sortedLangs = [...scan.languages].sort((a, b) => b.totalTokens - a.totalTokens);
    for (const l of sortedLangs) {
      const pc = (l.percentage * 100).toFixed(1);
      lines.push(`| ${l.language} | ${l.fileCount} | ${l.totalTokens.toLocaleString()} | ${pc}% |`);
    }
    lines.push("");
  }

  if (scan.warnings.length > 0) {
    lines.push("## Warnings");
    lines.push("");
    for (const w of scan.warnings) {
      lines.push(`- ${w}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
