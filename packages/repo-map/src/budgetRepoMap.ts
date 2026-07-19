import type { RepoMapFile, RepoMapResult } from "@wma/core";
import { estimateTokens } from "@wma/tokenizers";
import { formatRepoMapMarkdown } from "./formatRepoMapMarkdown.js";

export function budgetRepoMap(repoMap: RepoMapResult, tokenBudget: number): RepoMapResult {
  const result: RepoMapResult = {
    ...repoMap,
    importantFiles: [...repoMap.importantFiles],
    testFiles: [...repoMap.testFiles],
    largeFiles: [...repoMap.largeFiles],
    riskyFiles: [...repoMap.riskyFiles],
    generatedFiles: [...repoMap.generatedFiles],
    excludedFiles: [...repoMap.excludedFiles],
    recommendedInclude: [...repoMap.recommendedInclude],
    recommendedExclude: [...repoMap.recommendedExclude],
    overflowNotes: [...repoMap.overflowNotes],
  };

  updateSerializedEstimate(result);
  if (result.estimatedTokens <= tokenBudget) return result;

  const highPriorityPaths = new Set([
    ...repoMap.entryPoints,
    ...repoMap.configFiles,
    ...repoMap.documentationFiles,
  ].map((file) => file.relativePath));

  const candidates = uniqueTrimCandidates(repoMap, highPriorityPaths);
  result.overflowNotes.push(`Budget of ${tokenBudget.toLocaleString()} tokens exceeded; lower-priority sections were trimmed.`);

  let trimmedCount = 0;
  for (const file of candidates) {
    if (result.estimatedTokens <= tokenBudget) break;
    removeEverywhere(result, file.relativePath);
    trimmedCount++;
    updateSerializedEstimate(result);
  }

  if (trimmedCount > 0) {
    result.overflowNotes.push(`Trimmed ${trimmedCount} lower-priority file(s); entry points, config, and documentation were preserved.`);
    refreshSymbolSummary(result);
  }

  updateSerializedEstimate(result);
  if (result.estimatedTokens > tokenBudget) {
    result.overflowNotes.push(`The required high-priority sections need ${result.estimatedTokens.toLocaleString()} tokens and cannot fit the requested budget.`);
    updateSerializedEstimate(result);
  }

  return result;
}

function uniqueTrimCandidates(repoMap: RepoMapResult, highPriorityPaths: Set<string>): RepoMapFile[] {
  const ordered = [
    ...repoMap.largeFiles,
    ...repoMap.generatedFiles,
    ...repoMap.riskyFiles,
    ...repoMap.excludedFiles,
    ...repoMap.testFiles,
    ...repoMap.importantFiles,
  ];
  const seen = new Set<string>();
  return ordered.filter((file) => {
    if (highPriorityPaths.has(file.relativePath) || seen.has(file.relativePath)) return false;
    seen.add(file.relativePath);
    return true;
  });
}

function removeEverywhere(repoMap: RepoMapResult, relativePath: string): void {
  repoMap.importantFiles = withoutPath(repoMap.importantFiles, relativePath);
  repoMap.testFiles = withoutPath(repoMap.testFiles, relativePath);
  repoMap.largeFiles = withoutPath(repoMap.largeFiles, relativePath);
  repoMap.riskyFiles = withoutPath(repoMap.riskyFiles, relativePath);
  repoMap.generatedFiles = withoutPath(repoMap.generatedFiles, relativePath);
  repoMap.excludedFiles = withoutPath(repoMap.excludedFiles, relativePath);
  repoMap.recommendedInclude = withoutPath(repoMap.recommendedInclude, relativePath);
  repoMap.recommendedExclude = withoutPath(repoMap.recommendedExclude, relativePath);
  repoMap.symbols = repoMap.symbols.filter((symbol) => symbol.relativePath !== relativePath);
  repoMap.imports = repoMap.imports.filter((entry) => entry.relativePath !== relativePath);
  repoMap.routes = repoMap.routes.filter((route) => route.relativePath !== relativePath);
}

function refreshSymbolSummary(repoMap: RepoMapResult): void {
  repoMap.symbolSummary = repoMap.symbols.length === 0 ? [] : [
    `${repoMap.symbols.length} symbols extracted from ${new Set(repoMap.symbols.map((symbol) => symbol.relativePath)).size} files`,
    `Exports: ${repoMap.symbols.filter((symbol) => symbol.exported).length}`,
    `Functions: ${repoMap.symbols.filter((symbol) => symbol.kind === "function" || symbol.kind === "component").length}`,
    `Classes: ${repoMap.symbols.filter((symbol) => symbol.kind === "class").length}`,
    `Interfaces/Types: ${repoMap.symbols.filter((symbol) => symbol.kind === "interface" || symbol.kind === "type").length}`,
    `Routes: ${repoMap.routes.length}`,
  ];
}

function withoutPath(files: RepoMapFile[], relativePath: string): RepoMapFile[] {
  return files.filter((file) => file.relativePath !== relativePath);
}

function updateSerializedEstimate(repoMap: RepoMapResult): void {
  let estimate = estimateTokens(formatRepoMapMarkdown(repoMap));
  repoMap.estimatedTokens = estimate;
  const stableEstimate = estimateTokens(formatRepoMapMarkdown(repoMap));
  if (stableEstimate !== estimate) {
    estimate = stableEstimate;
    repoMap.estimatedTokens = estimate;
  }
}
