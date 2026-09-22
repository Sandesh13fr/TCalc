import type { TokenDriftReport } from "@wma/core";

export function formatDriftMarkdown(report: TokenDriftReport): string {
  const statusBadge = report.passed ? "✅ PASSED" : "❌ POLICY VIOLATION";
  const sign = report.netTokenDelta > 0 ? "+" : "";

  const lines: string[] = [
    `# Workspace Token Drift Report`,
    ``,
    `**Status**: ${statusBadge} | **Generated**: ${report.generatedAt}`,
    ``,
    `## Summary`,
    ``,
    `| Metric | Baseline | Current | Delta | % Change |`,
    `|---|---|---|---|---|`,
    `| **Total Tokens** | ${report.baselineTotalTokens.toLocaleString()} | ${report.currentTotalTokens.toLocaleString()} | ${sign}${report.netTokenDelta.toLocaleString()} | ${sign}${report.netPercentChange}% |`,
    `| **Files Added** | — | — | +${report.filesAdded} | — |`,
    `| **Files Removed** | — | — | -${report.filesRemoved} | — |`,
    `| **Files Modified** | — | — | ${report.filesModified} | — |`,
    `| **Files Unchanged** | — | — | ${report.filesUnchanged} | — |`,
    ``,
  ];

  if (report.violations.length > 0) {
    lines.push(`## Policy Violations`);
    lines.push(``);
    for (const v of report.violations) {
      lines.push(`- ⚠️ ${v}`);
    }
    lines.push(``);
  }

  if (report.topGrowingFiles.length > 0) {
    lines.push(`## Top Growing Files`);
    lines.push(``);
    lines.push(`| File | Baseline Tokens | Current Tokens | Token Delta | % Change | Risk Flags |`);
    lines.push(`|---|---|---|---|---|---|`);
    for (const f of report.topGrowingFiles) {
      const rf = f.riskFlagsAdded.length > 0 ? `+(${f.riskFlagsAdded.join(", ")})` : "—";
      lines.push(
        `| \`${f.relativePath}\` | ${f.baselineTokens.toLocaleString()} | ${f.currentTokens.toLocaleString()} | +${f.tokenDelta.toLocaleString()} | +${f.percentChange}% | ${rf} |`,
      );
    }
    lines.push(``);
  }

  if (report.topShrinkingFiles.length > 0) {
    lines.push(`## Top Shrinking Files`);
    lines.push(``);
    lines.push(`| File | Baseline Tokens | Current Tokens | Token Delta | % Change |`);
    lines.push(`|---|---|---|---|---|`);
    for (const f of report.topShrinkingFiles) {
      lines.push(
        `| \`${f.relativePath}\` | ${f.baselineTokens.toLocaleString()} | ${f.currentTokens.toLocaleString()} | ${f.tokenDelta.toLocaleString()} | ${f.percentChange}% |`,
      );
    }
    lines.push(``);
  }

  if (report.directoryDrifts.length > 0) {
    lines.push(`## Directory Breakdown`);
    lines.push(``);
    lines.push(`| Directory | Baseline Tokens | Current Tokens | Token Delta | % Change | File Count Delta |`);
    lines.push(`|---|---|---|---|---|---|`);
    for (const d of report.directoryDrifts.slice(0, 15)) {
      const dSign = d.tokenDelta > 0 ? "+" : "";
      const fcSign = d.fileCountDelta > 0 ? "+" : "";
      lines.push(
        `| \`${d.directory}\` | ${d.baselineTokens.toLocaleString()} | ${d.currentTokens.toLocaleString()} | ${dSign}${d.tokenDelta.toLocaleString()} | ${dSign}${d.percentChange}% | ${fcSign}${d.fileCountDelta} |`,
      );
    }
    lines.push(``);
  }

  return lines.join("\n");
}
