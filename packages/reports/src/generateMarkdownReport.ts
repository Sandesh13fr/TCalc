import type { WorkspaceScanResult, RecommendationResult } from "@wma/core";

function fmtCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function generateMarkdownReport(scanResult: WorkspaceScanResult, recommendation: RecommendationResult | null): string {
  const lines: string[] = [];

  lines.push("# Workspace Model Report");
  lines.push("");
  lines.push(`**Scan Date:** ${scanResult.scannedAt}`);
  lines.push("");
  lines.push(`**Workspace Root:** \`${scanResult.rootPath}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | ---:|`);
  lines.push(`| Total Files | ${scanResult.totalFiles} |`);
  lines.push(`| Included Files | ${scanResult.includedFiles} |`);
  lines.push(`| Excluded Files | ${scanResult.excludedFiles} |`);
  lines.push(`| Total Estimated Tokens | ${scanResult.totalEstimatedTokens.toLocaleString()} |`);
  lines.push(`| Included Tokens | ${scanResult.includedTokens.toLocaleString()} |`);
  lines.push("");

  const sortedFiles = [...scanResult.files]
    .filter((f) => f.included)
    .sort((a, b) => b.estimatedTokens - a.estimatedTokens);
  const top10Files = sortedFiles.slice(0, 10);

  if (top10Files.length > 0) {
    lines.push("## Top 10 Files by Token Count");
    lines.push("");
    lines.push("| # | File | Tokens | % of Total |");
    lines.push("| --- | --- | ---:| ---:|");
    top10Files.forEach((f, i) => {
      lines.push(`| ${i + 1} | \`${f.relativePath}\` | ${f.estimatedTokens.toLocaleString()} | ${pct(f.estimatedTokens / scanResult.includedTokens)} |`);
    });
    lines.push("");
  }

  const sortedFolders = [...scanResult.folders]
    .filter((f) => f.includedFiles > 0)
    .sort((a, b) => b.totalTokens - a.totalTokens);
  const top10Folders = sortedFolders.slice(0, 10);

  if (top10Folders.length > 0) {
    lines.push("## Top 10 Folders by Token Count");
    lines.push("");
    lines.push("| # | Folder | Files | Tokens | % of Total |");
    lines.push("| --- | --- | ---:| ---:| ---:|");
    top10Folders.forEach((f, i) => {
      lines.push(`| ${i + 1} | \`${f.folderPath}\` | ${f.includedFiles} | ${f.totalTokens.toLocaleString()} | ${pct(f.totalTokens / scanResult.includedTokens)} |`);
    });
    lines.push("");
  }

  if (scanResult.languages.length > 0) {
    lines.push("## Language Breakdown");
    lines.push("");
    lines.push("| Language | Files | Tokens | % |");
    lines.push("| --- | ---:| ---:| ---:|");
    const sortedLangs = [...scanResult.languages].sort((a, b) => b.totalTokens - a.totalTokens);
    sortedLangs.forEach((l) => {
      lines.push(`| ${l.language} | ${l.fileCount} | ${l.totalTokens.toLocaleString()} | ${pct(l.percentage)} |`);
    });
    lines.push("");
  }

  if (scanResult.warnings.length > 0) {
    lines.push("## Warnings");
    lines.push("");
    scanResult.warnings.forEach((w) => {
      lines.push(`- ${w}`);
    });
    lines.push("");
  }

  if (scanResult.riskFiles.length > 0) {
    lines.push("### Risk Flags");
    lines.push("");
    scanResult.riskFiles.forEach((f) => {
      lines.push(`- \`${f.relativePath}\` — ${f.riskFlags.join(", ")}`);
    });
    lines.push("");
  }

  if (recommendation === null) {
    lines.push("## Recommendations");
    lines.push("");
    lines.push("Recommendations unavailable.");
    lines.push("");
    lines.push("## Assumptions");
    lines.push("");
    lines.push("None provided.");
    lines.push("");
    lines.push("## Estimated Costs");
    lines.push("");
    lines.push("No cost estimates available.");
    lines.push("");
    lines.push("## Optimization Checklist");
    lines.push("");
    lines.push("No optimizations suggested.");
  } else {
    const tiers: Array<{ label: string; rec: typeof recommendation.cheapestSufficient }> = [
      { label: "Cheapest Sufficient", rec: recommendation.cheapestSufficient },
      { label: "Balanced", rec: recommendation.balanced },
      { label: "High Confidence", rec: recommendation.highConfidence },
    ];

    lines.push("## Recommendations");
    lines.push("");

    for (const { label, rec } of tiers) {
      lines.push(`### ${label}`);
      lines.push("");
      lines.push(`**Model:** ${rec.displayName} (\`${rec.modelId}\`)`);
      lines.push("");
      lines.push(`**Estimated Cost:** ${fmtCost(rec.costEstimate.totalCost)}`);
      lines.push("");
      lines.push(`**Total Score:** ${rec.score.totalScore.toFixed(1)}`);
      lines.push("");
      lines.push("| Criterion | Score |");
      lines.push("| --- | ---:|");
      lines.push(`| Context Fit | ${rec.score.contextFit.toFixed(1)} |`);
      lines.push(`| Task Quality Fit | ${rec.score.taskQualityFit.toFixed(1)} |`);
      lines.push(`| Cost Efficiency | ${rec.score.costEfficiency.toFixed(1)} |`);
      lines.push(`| Latency Fit | ${rec.score.latencyFit.toFixed(1)} |`);
      lines.push(`| Privacy Fit | ${rec.score.privacyFit.toFixed(1)} |`);
      lines.push("");
      lines.push(`**Expected Quality:** ${rec.expectedQuality}`);
      lines.push("");
      lines.push(`**Overflow Risk:** ${(rec.overflowRisk * 100).toFixed(0)}%`);
      lines.push("");

      if (rec.reasons.length > 0) {
        lines.push("**Reasons:**");
        rec.reasons.forEach((r) => lines.push(`- ${r}`));
        lines.push("");
      }

      if (rec.warnings.length > 0) {
        lines.push("**Warnings:**");
        rec.warnings.forEach((w) => lines.push(`- ⚠ ${w}`));
        lines.push("");
      }

      if (rec.optimizationSuggestions.length > 0) {
        lines.push("**Optimization Suggestions:**");
        rec.optimizationSuggestions.forEach((s) => lines.push(`- ${s}`));
        lines.push("");
      }
    }

    lines.push("## Assumptions");
    lines.push("");
    if (recommendation.assumptions.length > 0) {
      recommendation.assumptions.forEach((a) => lines.push(`- ${a}`));
    } else {
      lines.push("None provided.");
    }
    lines.push("");

    lines.push("## Estimated Costs");
    lines.push("");
    lines.push("| Model | Input Cost | Output Cost | Cached Input Cost | Total Cost |");
    lines.push("| --- | ---:| ---:| ---:| ---:|");
    for (const { label, rec } of tiers) {
      const e = rec.costEstimate;
      lines.push(`| ${rec.displayName} | ${fmtCost(e.inputCost)} | ${fmtCost(e.outputCost)} | ${fmtCost(e.cachedInputCost)} | ${fmtCost(e.totalCost)} |`);
    }
    if (recommendation.allScored.length > 0) {
      const otherModels = recommendation.allScored.filter(
        (m) => m.modelId !== recommendation.cheapestSufficient.modelId
          && m.modelId !== recommendation.balanced.modelId
          && m.modelId !== recommendation.highConfidence.modelId,
      );
      for (const m of otherModels) {
        const e = m.costEstimate;
        lines.push(`| ${m.displayName} | ${fmtCost(e.inputCost)} | ${fmtCost(e.outputCost)} | ${fmtCost(e.cachedInputCost)} | ${fmtCost(e.totalCost)} |`);
      }
    }
    lines.push("");

    lines.push("## Optimization Checklist");
    lines.push("");
    const checklist: string[] = [];

    const allSuggestions = [
      ...recommendation.cheapestSufficient.optimizationSuggestions,
      ...recommendation.balanced.optimizationSuggestions,
      ...recommendation.highConfidence.optimizationSuggestions,
    ];
    const uniqueSuggestions = [...new Set(allSuggestions)];

    if (uniqueSuggestions.length > 0) {
      uniqueSuggestions.forEach((s) => checklist.push(`- [ ] ${s}`));
    }

    const largeFiles = sortedFiles.filter((f) => f.estimatedTokens > 50000);
    if (largeFiles.length > 0) {
      checklist.push(`- [ ] Review ${largeFiles.length} file(s) exceeding 50k tokens for splitting or exclusion`);
    }

    if (scanResult.totalEstimatedTokens > 1000000) {
      checklist.push("- [ ] Workspace exceeds 1M total tokens — consider narrowing scope or using a model with larger context");
    }

    if (scanResult.riskFiles.length > 0) {
      checklist.push(`- [ ] Address ${scanResult.riskFiles.length} flagged risk file(s) before processing`);
    }

    if (checklist.length === 0) {
      lines.push("No optimizations suggested.");
    } else {
      checklist.forEach((item) => lines.push(item));
    }

    lines.push("");
  }

  return lines.join("\n");
}
