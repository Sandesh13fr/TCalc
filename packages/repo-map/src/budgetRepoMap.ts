import type { RepoMapResult } from "@wma/core";

export function budgetRepoMap(
  repoMap: RepoMapResult,
  tokenBudget: number,
): RepoMapResult {
  const result = { ...repoMap, overflowNotes: [...repoMap.overflowNotes] };

  const totalTokens = estimateMarkdownTokens(repoMap);

  if (totalTokens <= tokenBudget) {
    return result;
  }

  const highPriorityFiles = [
    ...repoMap.entryPoints,
    ...repoMap.configFiles,
    ...repoMap.documentationFiles,
  ];

  const highPriorityPaths = new Set(highPriorityFiles.map((f) => f.relativePath));

  const trimCandidates = [
    ...repoMap.largeFiles.map((f) => ({ file: f, order: 0 })),
    ...repoMap.generatedFiles.map((f) => ({ file: f, order: 1 })),
    ...repoMap.riskyFiles.map((f) => ({ file: f, order: 2 })),
    ...repoMap.excludedFiles.map((f) => ({ file: f, order: 3 })),
    ...repoMap.testFiles
      .filter((f) => !highPriorityPaths.has(f.relativePath))
      .map((f) => ({ file: f, order: 4 })),
    ...repoMap.importantFiles
      .filter(
        (f) =>
          !highPriorityPaths.has(f.relativePath) &&
          !repoMap.testFiles.some((t) => t.relativePath === f.relativePath),
      )
      .map((f) => ({ file: f, order: 5 })),
  ];

  trimCandidates.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.file.priority - b.file.priority;
  });

  const importantFiles = [...repoMap.importantFiles];
  const testFiles = [...repoMap.testFiles];
  const largeFiles = [...repoMap.largeFiles];
  const riskyFiles = [...repoMap.riskyFiles];
  const generatedFiles = [...repoMap.generatedFiles];
  const excludedFiles = [...repoMap.excludedFiles];
  const recommendedInclude = [...repoMap.recommendedInclude];
  const recommendedExclude = [...repoMap.recommendedExclude];

  const trimmedPaths = new Set<string>();
  let currentEstimate = totalTokens;

  for (const { file } of trimCandidates) {
    if (currentEstimate <= tokenBudget) break;
    if (highPriorityPaths.has(file.relativePath)) continue;

    const fileTokens = file.estimatedTokens + 50;

    removeFileFromList(importantFiles, file.relativePath);
    removeFileFromList(testFiles, file.relativePath);
    removeFileFromList(largeFiles, file.relativePath);
    removeFileFromList(riskyFiles, file.relativePath);
    removeFileFromList(generatedFiles, file.relativePath);
    removeFileFromList(excludedFiles, file.relativePath);
    removeFileFromList(recommendedInclude, file.relativePath);
    removeFileFromList(recommendedExclude, file.relativePath);

    trimmedPaths.add(file.relativePath);
    currentEstimate -= fileTokens;
  }

  result.importantFiles = importantFiles;
  result.testFiles = testFiles;
  result.largeFiles = largeFiles;
  result.riskyFiles = riskyFiles;
  result.generatedFiles = generatedFiles;
  result.excludedFiles = excludedFiles;
  result.recommendedInclude = recommendedInclude;
  result.recommendedExclude = recommendedExclude;
  result.estimatedTokens = currentEstimate;

  if (trimmedPaths.size > 0) {
    result.overflowNotes.push(
      `Budget of ${tokenBudget.toLocaleString()} tokens exceeded. Trimmed ${trimmedPaths.size} lower-priority file(s) to fit.`,
    );
    if (trimmedPaths.size <= 5) {
      const paths = [...trimmedPaths].map((p) => `\`${p}\``).join(", ");
      result.overflowNotes.push(`Trimmed files: ${paths}`);
    } else {
      result.overflowNotes.push(
        `Trimmed ${trimmedPaths.size} files. High-priority files (entry points, config, docs) were preserved.`,
      );
    }
  }

  return result;
}

function estimateMarkdownTokens(repoMap: RepoMapResult): number {
  const listFiles = (files: Array<{ estimatedTokens: number }>) =>
    files.reduce((sum, f) => sum + f.estimatedTokens, 0);

  const overhead = 2000;
  return (
    overhead +
    listFiles(repoMap.entryPoints) +
    listFiles(repoMap.configFiles) +
    listFiles(repoMap.documentationFiles) +
    listFiles(repoMap.testFiles) +
    listFiles(repoMap.largeFiles) +
    listFiles(repoMap.riskyFiles) +
    listFiles(repoMap.generatedFiles) +
    listFiles(repoMap.excludedFiles)
  );
}

function removeFileFromList(
  list: Array<{ relativePath: string }>,
  relativePath: string,
): void {
  const idx = list.findIndex((f) => f.relativePath === relativePath);
  if (idx !== -1) {
    list.splice(idx, 1);
  }
}
