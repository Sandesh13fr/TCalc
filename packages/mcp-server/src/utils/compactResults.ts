import type { WorkspaceScanResult, RecommendationResult, RepoMapResult, ModelCatalog } from "@wma/core";

export interface CompactWorkspaceSummary {
  rootPath: string;
  totalFiles: number;
  includedFiles: number;
  excludedFiles: number;
  totalEstimatedTokens: number;
  topFiles: Array<{ path: string; tokens: number; language: string }>;
  topFolders: Array<{ path: string; tokens: number; files: number }>;
  languages: Array<{ language: string; tokens: number; percentage: number }>;
  warnings: string[];
}

export interface CompactRecommendationSummary {
  goal: string;
  workspaceTokens: number;
  cheapestSufficient: {
    modelId: string;
    displayName: string;
    cost: string;
    score: number;
  };
  balanced: {
    modelId: string;
    displayName: string;
    cost: string;
    score: number;
  };
  highConfidence: {
    modelId: string;
    displayName: string;
    cost: string;
    score: number;
  };
  rejected: string[];
  assumptions: string[];
}

export function createCompactWorkspaceSummary(scan: WorkspaceScanResult): CompactWorkspaceSummary {
  const topFiles = scan.files
    .filter((f) => f.included)
    .sort((a, b) => b.estimatedTokens - a.estimatedTokens)
    .slice(0, 10)
    .map((f) => ({
      path: f.relativePath,
      tokens: f.estimatedTokens,
      language: f.language,
    }));

  const topFolders = scan.folders
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .slice(0, 10)
    .map((f) => ({
      path: f.folderPath,
      tokens: f.totalTokens,
      files: f.includedFiles,
    }));

  const languages = scan.languages.map((l) => ({
    language: l.language,
    tokens: l.totalTokens,
    percentage: l.percentage,
  }));

  return {
    rootPath: scan.rootPath,
    totalFiles: scan.totalFiles,
    includedFiles: scan.includedFiles,
    excludedFiles: scan.excludedFiles,
    totalEstimatedTokens: scan.totalEstimatedTokens,
    topFiles,
    topFolders,
    languages,
    warnings: scan.warnings,
  };
}

export function createCompactRecommendationSummary(rec: RecommendationResult): CompactRecommendationSummary {
  const formatCost = (cents: number): string => `$${cents.toFixed(4)}`;

  return {
    goal: rec.goal,
    workspaceTokens: rec.workspaceTokens,
    cheapestSufficient: {
      modelId: rec.cheapestSufficient.modelId,
      displayName: rec.cheapestSufficient.displayName,
      cost: formatCost(rec.cheapestSufficient.costEstimate.totalCost),
      score: rec.cheapestSufficient.score.totalScore,
    },
    balanced: {
      modelId: rec.balanced.modelId,
      displayName: rec.balanced.displayName,
      cost: formatCost(rec.balanced.costEstimate.totalCost),
      score: rec.balanced.score.totalScore,
    },
    highConfidence: {
      modelId: rec.highConfidence.modelId,
      displayName: rec.highConfidence.displayName,
      cost: formatCost(rec.highConfidence.costEstimate.totalCost),
      score: rec.highConfidence.score.totalScore,
    },
    rejected: rec.rejected,
    assumptions: rec.assumptions,
  };
}

export interface CompactRepoMap {
  rootPath: string;
  generatedAt: string;
  estimatedTokens: number;
  workspaceTotalTokens: number;
  summary: string;
  topLevelFolders: Array<{ path: string; tokens: number; files: number }>;
  languageBreakdown: Array<{ language: string; tokens: number; files: number }>;
  importantFileCount: number;
  entryPointCount: number;
  riskyFileCount: number;
  largeFileCount: number;
  symbolCount: number;
}

export function createCompactRepoMap(map: RepoMapResult): CompactRepoMap {
  return {
    rootPath: map.rootPath,
    generatedAt: map.generatedAt,
    estimatedTokens: map.estimatedTokens,
    workspaceTotalTokens: map.workspaceTotalTokens,
    summary: map.summary,
    topLevelFolders: map.topLevelFolders.map((f) => ({
      path: f.relativePath,
      tokens: f.estimatedTokens,
      files: f.fileCount,
    })),
    languageBreakdown: map.languageBreakdown.map((l) => ({
      language: l.language,
      tokens: l.estimatedTokens,
      files: l.fileCount,
    })),
    importantFileCount: map.importantFiles.length,
    entryPointCount: map.entryPoints.length,
    riskyFileCount: map.riskyFiles.length,
    largeFileCount: map.largeFiles.length,
    symbolCount: map.symbols.length,
  };
}

export interface CompactCatalogSummary {
  version: string;
  updatedAt: string;
  modelCount: number;
  providers: string[];
}

export function createCompactCatalogSummary(catalog: ModelCatalog): CompactCatalogSummary {
  const providers = [...new Set(catalog.models.map((m) => m.provider))];
  return {
    version: catalog.version,
    updatedAt: catalog.updatedAt,
    modelCount: catalog.models.length,
    providers,
  };
}