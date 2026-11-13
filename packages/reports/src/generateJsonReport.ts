import { REPORT_SCHEMA_VERSION, type WorkspaceReport, type WorkspaceScanResult, type RecommendationResult } from "@wma/core";

export type JsonReport = WorkspaceReport;

export function generateJsonReport(scanResult: WorkspaceScanResult, recommendation: RecommendationResult | null): string {
  const sortedFiles = [...scanResult.files]
    .filter((f) => f.included)
    .sort((a, b) => b.estimatedTokens - a.estimatedTokens);

  const folderIncludedTokens = (folderPath: string): number => {
    const prefix = folderPath === "." ? "" : `${folderPath.replace(/\/$/, "")}/`;
    return sortedFiles.reduce((total, file) => {
      if (folderPath === "." || file.relativePath.startsWith(prefix)) {
        return total + file.estimatedTokens;
      }
      return total;
    }, 0);
  };

  const sortedFolders = [...scanResult.folders]
    .filter((f) => f.includedFiles > 0)
    .map((f) => ({ ...f, includedTokens: folderIncludedTokens(f.folderPath) }))
    .sort((a, b) => b.includedTokens - a.includedTokens);

  const largeFiles = sortedFiles.filter((f) => f.estimatedTokens > 50000);

  const checklist: string[] = recommendation
    ? [
        ...new Set([
          ...recommendation.cheapestSufficient.optimizationSuggestions,
          ...recommendation.balanced.optimizationSuggestions,
          ...recommendation.highConfidence.optimizationSuggestions,
        ]),
      ]
    : [];

  if (largeFiles.length > 0) {
    checklist.push(`Review ${largeFiles.length} file(s) exceeding 50k tokens for splitting or exclusion`);
  }
  if (scanResult.totalEstimatedTokens > 1000000) {
    checklist.push("Workspace exceeds 1M total tokens — consider narrowing scope or using a model with larger context");
  }
  if (scanResult.riskFiles.length > 0) {
    checklist.push(`Address ${scanResult.riskFiles.length} flagged risk file(s) before processing`);
  }

  const topTokenConsumers = sortedFiles.slice(0, 10).map((f) => ({
    path: f.relativePath,
    tokens: f.estimatedTokens,
    percentage: scanResult.includedTokens > 0 ? f.estimatedTokens / scanResult.includedTokens : 0,
  }));

  const topFolders = sortedFolders.slice(0, 10).map((f) => ({
    path: f.folderPath,
    tokens: f.includedTokens,
    percentage: scanResult.includedTokens > 0 ? f.includedTokens / scanResult.includedTokens : 0,
  }));

  const languages = scanResult.languages
    .slice()
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .map((l) => ({
      language: l.language,
      fileCount: l.fileCount,
      tokens: l.totalTokens,
      percentage: l.percentage,
    }));

  const report: JsonReport = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    title: "Workspace Model Report",
    generatedAt: scanResult.scannedAt,
    workspacePath: scanResult.rootPath,
    goal: recommendation?.goal ?? null,
    summary: {
      totalFiles: scanResult.totalFiles,
      includedFiles: scanResult.includedFiles,
      excludedFiles: scanResult.excludedFiles,
      totalEstimatedTokens: scanResult.totalEstimatedTokens,
      includedTokens: scanResult.includedTokens,
    },
    topTokenConsumers,
    topFolders,
    languages,
    recommendations: recommendation
      ? {
          cheapestSufficient: recommendation.cheapestSufficient,
          balanced: recommendation.balanced,
          highConfidence: recommendation.highConfidence,
        }
      : null,
    warnings: scanResult.warnings,
    assumptions: recommendation?.assumptions ?? [],
    optimizationChecklist: checklist,
  };

  return JSON.stringify(report, null, 2);
}
