import type { WorkspaceScanResult, RepoMapOptions, RepoMapResult, RepoMapFolder, RepoMapLanguage } from "@wma/core";
import { selectImportantFiles } from "./selectImportantFiles.js";
import { budgetRepoMap } from "./budgetRepoMap.js";

export function createRepoMap(
  scanResult: WorkspaceScanResult,
  options: RepoMapOptions,
): RepoMapResult {
  const selected = selectImportantFiles(scanResult, options);

  const topLevelFolders: RepoMapFolder[] = scanResult.folders
    .filter((f) => f.folderPath !== "." && f.includedFiles > 0)
    .map((f) => ({
      relativePath: f.folderPath,
      estimatedTokens: f.totalTokens,
      fileCount: f.includedFiles,
    }))
    .sort((a, b) => b.estimatedTokens - a.estimatedTokens)
    .slice(0, 20);

  const languageBreakdown: RepoMapLanguage[] = scanResult.languages
    .map((l) => ({
      language: l.language,
      estimatedTokens: l.totalTokens,
      fileCount: l.fileCount,
    }))
    .sort((a, b) => b.estimatedTokens - a.estimatedTokens);

  const totalImportantTokens = selected.importantFiles.reduce(
    (sum, f) => sum + f.estimatedTokens, 0,
  );

  const agentInstructions = generateAgentInstructions(
    scanResult,
    selected.largeFiles,
    selected.riskyFiles,
    selected.generatedFiles,
    selected.entryPoints,
    options,
  );

  let result: RepoMapResult = {
    rootPath: scanResult.rootPath,
    generatedAt: new Date().toISOString(),
    tokenBudget: options.tokenBudget,
    estimatedTokens: totalImportantTokens,
    workspaceTotalTokens: scanResult.totalEstimatedTokens,
    summary: buildSummary(scanResult, selected, totalImportantTokens),
    topLevelFolders,
    languageBreakdown,
    importantFiles: selected.importantFiles,
    entryPoints: selected.entryPoints,
    testFiles: selected.testFiles,
    configFiles: selected.configFiles,
    documentationFiles: selected.documentationFiles,
    riskyFiles: selected.riskyFiles,
    largeFiles: selected.largeFiles,
    generatedFiles: selected.generatedFiles,
    excludedFiles: selected.excludedFiles,
    recommendedInclude: selected.recommendedInclude,
    recommendedExclude: selected.recommendedExclude,
    agentInstructions,
    overflowNotes: [],
  };

  result = budgetRepoMap(result, options.tokenBudget);

  return result;
}

function buildSummary(
  scanResult: WorkspaceScanResult,
  selected: ReturnType<typeof selectImportantFiles>,
  totalImportantTokens: number,
): string {
  const includedPct = scanResult.totalFiles > 0
    ? ((scanResult.includedFiles / scanResult.totalFiles) * 100).toFixed(1)
    : "0.0";

  return [
    `Files: ${scanResult.includedFiles} included / ${scanResult.excludedFiles} excluded (${includedPct}% of ${scanResult.totalFiles} total)`,
    `Important files identified: ${selected.importantFiles.length}`,
    `Entry points: ${selected.entryPoints.length}`,
    `Tests: ${selected.testFiles.length}`,
    `Config files: ${selected.configFiles.length}`,
    `Documentation files: ${selected.documentationFiles.length}`,
    `Large files: ${selected.largeFiles.length}`,
    `Risky files: ${selected.riskyFiles.length}`,
    `Tokens in important files: ~${totalImportantTokens.toLocaleString()}`,
    `Workspace total: ~${scanResult.totalEstimatedTokens.toLocaleString()} tokens`,
  ].join("\n");
}

function generateAgentInstructions(
  scanResult: WorkspaceScanResult,
  largeFiles: Array<{ relativePath: string }>,
  riskyFiles: Array<{ relativePath: string }>,
  generatedFiles: Array<{ relativePath: string }>,
  entryPoints: Array<{ relativePath: string }>,
  options: RepoMapOptions,
): string[] {
  const instructions: string[] = [];

  instructions.push("Start by reading this repo map to understand the workspace structure.");
  instructions.push("Do not read the full contents of large files unless specifically needed.");

  if (entryPoints.length > 0) {
    const eps = entryPoints.slice(0, 5).map((f) => f.relativePath).join(", ");
    instructions.push(`Key entry points to read first: ${eps}`);
  }

  if (largeFiles.length > 0) {
    instructions.push(`There are ${largeFiles.length} large file(s). Ask before reading them.`);
  }

  if (riskyFiles.length > 0) {
    instructions.push(`There are ${riskyFiles.length} potentially sensitive file(s). Ask before reading.`);
  }

  if (generatedFiles.length > 0) {
    instructions.push(`There are ${generatedFiles.length} generated file(s). Avoid editing them.`);
  }

  if (options.goal) {
    instructions.push(`The current workspace goal is: ${options.goal}`);
  }

  instructions.push("Prefer reading targeted files over scanning entire directories.");
  instructions.push("Use patch-only output when making code changes.");

  return instructions;
}
