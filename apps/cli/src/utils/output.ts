import type { WorkspaceScanResult, RecommendationResult, RepoMapResult } from "@wma/core";

function pct(n: number): string {
  return `${((Number.isFinite(n) ? n : 0) * 100).toFixed(1)}%`;
}

function fmtCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

export function formatScanTable(scan: WorkspaceScanResult): string {
  const lines: string[] = [];
  lines.push(`Workspace Root: ${scan.rootPath}`);
  lines.push(`Scanned At: ${scan.scannedAt}`);
  lines.push("");
  lines.push(`Total Files:     ${scan.totalFiles}`);
  lines.push(`Included Files:  ${scan.includedFiles}`);
  lines.push(`Excluded Files:  ${scan.excludedFiles}`);
  lines.push(`Total Tokens:    ${scan.totalEstimatedTokens.toLocaleString()}`);
  lines.push(`Included Tokens: ${scan.includedTokens.toLocaleString()}`);
  lines.push("");

  if (scan.warnings.length > 0) {
    lines.push("Warnings:");
    scan.warnings.forEach((w) => lines.push(`  - ${w}`));
    lines.push("");
  }

  const sortedFiles = [...scan.files]
    .filter((f) => f.included)
    .sort((a, b) => b.estimatedTokens - a.estimatedTokens)
    .slice(0, 10);

  if (sortedFiles.length > 0) {
    lines.push("Top 10 Token-Heavy Files:");
    lines.push("  Path                                    Tokens     %");
    lines.push("  " + "-".repeat(55));
    for (const f of sortedFiles) {
      const p = f.relativePath.padEnd(40).slice(0, 40);
      const t = f.estimatedTokens.toLocaleString().padStart(10);
      const pc = pct(f.estimatedTokens / scan.includedTokens).padStart(7);
      lines.push(`  ${p} ${t} ${pc}`);
    }
    lines.push("");
  }

  const sortedLangs = [...scan.languages].sort((a, b) => b.totalTokens - a.totalTokens);
  if (sortedLangs.length > 0) {
    lines.push("Languages:");
    lines.push("  Language         Files     Tokens     %");
    lines.push("  " + "-".repeat(50));
    for (const l of sortedLangs) {
      const lang = l.language.padEnd(18).slice(0, 18);
      const fc = String(l.fileCount).padStart(6);
      const t = l.totalTokens.toLocaleString().padStart(10);
      const pc = pct(l.percentage).padStart(7);
      lines.push(`  ${lang} ${fc} ${t} ${pc}`);
    }
    lines.push("");
  }

  if (scan.riskFiles.length > 0) {
    lines.push("Risk Files:");
    for (const f of scan.riskFiles) {
      lines.push(`  - ${f.relativePath} [${f.riskFlags.join(", ")}]`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function formatScanJson(scan: WorkspaceScanResult): string {
  return JSON.stringify(scan, null, 2);
}

export function formatRecommendationTable(rec: RecommendationResult): string {
  const lines: string[] = [];
  lines.push("Recommendations for goal: " + rec.goal);
  lines.push(`Workspace tokens: ${rec.workspaceTokens.toLocaleString()}`);
  lines.push("");

  const tiers: Array<{ label: string; tier: keyof RecommendationResult["cheapestSufficient"]; rec: any }> = [
    { label: "Cheapest Sufficient", tier: "cheapest-sufficient" as any, rec: rec.cheapestSufficient },
    { label: "Balanced", tier: "balanced" as any, rec: rec.balanced },
    { label: "High Confidence", tier: "high-confidence" as any, rec: rec.highConfidence },
  ];

  for (const { label, rec: r } of tiers) {
    lines.push(`--- ${label} ---`);
    lines.push(`Model: ${r.displayName} (${r.modelId})`);
    lines.push(`Score: ${(r.score.totalScore * 100).toFixed(0)}/100`);
    lines.push(`Cost:  ${fmtCost(r.costEstimate.totalCost)}`);
    lines.push(`Quality: ${r.expectedQuality}`);
    if (r.reasons.length > 0) {
      lines.push(`Reasons: ${r.reasons.join("; ")}`);
    }
    lines.push("");
  }

  if (rec.rejected.length > 0) {
    lines.push("Rejected models:");
    rec.rejected.forEach((id) => lines.push(`  - ${id}`));
    lines.push("");
  }

  if (rec.assumptions.length > 0) {
    lines.push("Assumptions:");
    rec.assumptions.forEach((a) => lines.push(`  - ${a}`));
    lines.push("");
  }

  return lines.join("\n");
}

export function formatRecommendationJson(rec: RecommendationResult): string {
  return JSON.stringify(rec, null, 2);
}

export function formatRepoMapJson(repoMap: RepoMapResult): string {
  return JSON.stringify(repoMap, null, 2);
}
