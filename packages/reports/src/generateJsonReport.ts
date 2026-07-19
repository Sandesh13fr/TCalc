import { REPORT_SCHEMA_VERSION, type WorkspaceReport, type WorkspaceScanResult, type RecommendationResult } from "@wma/core";

export type JsonReport = WorkspaceReport;

export function generateJsonReport(scanResult: WorkspaceScanResult, recommendation: RecommendationResult | null): string {
  if (!recommendation) {
    const emptyReport: JsonReport = {
      schemaVersion: REPORT_SCHEMA_VERSION,
      title: "Workspace Model Report",
      generatedAt: scanResult.scannedAt,
      workspacePath: scanResult.rootPath,
      goal: null,
      summary: {
        totalFiles: scanResult.totalFiles,
        includedFiles: scanResult.includedFiles,
        excludedFiles: scanResult.excludedFiles,
        totalEstimatedTokens: scanResult.totalEstimatedTokens,
        includedTokens: scanResult.includedTokens,
      },
      topTokenConsumers: [],
      topFolders: [],
      languages: [],
      recommendations: null,
      warnings: scanResult.warnings,
      assumptions: [],
      optimizationChecklist: [],
    };
    return JSON.stringify(emptyReport, null, 2);
  }

  const allSuggestions = [
    ...recommendation.cheapestSufficient.optimizationSuggestions,
    ...recommendation.balanced.optimizationSuggestions,
    ...recommendation.highConfidence.optimizationSuggestions,
  ];
  const uniqueSuggestions = [...new Set(allSuggestions)];

  const sortedFiles = [...scanResult.files]
    .filter((f) => f.included)
    .sort((a, b) => b.estimatedTokens - a.estimatedTokens);

  const sortedFolders = [...scanResult.folders]
    .filter((f) => f.includedFiles > 0)
    .sort((a, b) => b.totalTokens - a.totalTokens);

  const largeFiles = sortedFiles.filter((f) => f.estimatedTokens > 50000);

  const checklist: string[] = [...uniqueSuggestions];
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
    tokens: f.totalTokens,
    percentage: scanResult.includedTokens > 0 ? f.totalTokens / scanResult.includedTokens : 0,
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
    goal: recommendation.goal,
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
    recommendations: {
      cheapestSufficient: recommendation.cheapestSufficient,
      balanced: recommendation.balanced,
      highConfidence: recommendation.highConfidence,
    },
    warnings: scanResult.warnings,
    assumptions: recommendation.assumptions,
    optimizationChecklist: checklist,
  };

  return JSON.stringify(report, null, 2);
}
