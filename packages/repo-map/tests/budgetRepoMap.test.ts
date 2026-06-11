import { describe, it, expect } from "vitest";
import type {
  RepoMapResult, RepoMapFile, RepoMapFolder, RepoMapLanguage,
} from "@wma/core";
import { budgetRepoMap } from "../src/budgetRepoMap.js";

function makeFile(relativePath: string, priority: number, estimatedTokens: number): RepoMapFile {
  return {
    relativePath,
    estimatedTokens,
    reason: "test",
    priority,
    language: "TypeScript",
  };
}

function makeResult(overrides: Partial<RepoMapResult>): RepoMapResult {
  return {
    rootPath: "/test",
    generatedAt: new Date().toISOString(),
    tokenBudget: 8000,
    estimatedTokens: 5000,
    workspaceTotalTokens: 50000,
    summary: "Test summary",
    topLevelFolders: [],
    languageBreakdown: [],
    importantFiles: [],
    entryPoints: [],
    testFiles: [],
    configFiles: [],
    documentationFiles: [],
    riskyFiles: [],
    largeFiles: [],
    generatedFiles: [],
    excludedFiles: [],
    recommendedInclude: [],
    recommendedExclude: [],
    agentInstructions: [],
    overflowNotes: [],
    ...overrides,
  };
}

describe("budgetRepoMap", () => {
  it("trims lower-priority files first", () => {
    const entryPoint = makeFile("src/index.ts", 100, 200);
    const largeFile = makeFile("data/huge.json", 20, 100000);
    const testFile = makeFile("test/foo.test.ts", 70, 300);
    const sourceFile = makeFile("src/util.ts", 60, 200);

    const result = makeResult({
      tokenBudget: 2000,
      estimatedTokens: 100700,
      entryPoints: [entryPoint],
      testFiles: [testFile],
      largeFiles: [largeFile],
      importantFiles: [entryPoint, testFile, sourceFile, largeFile],
    });

    const budgeted = budgetRepoMap(result, 2000);

    const remainingPaths = budgeted.importantFiles.map((f) => f.relativePath);
    expect(remainingPaths).not.toContain("data/huge.json");
    expect(budgeted.overflowNotes.length).toBeGreaterThan(0);
  });

  it("keeps entry points, configs, and docs before low-priority files", () => {
    const entryPoint = makeFile("src/index.ts", 100, 500);
    const config = makeFile("package.json", 90, 100);
    const doc = makeFile("README.md", 80, 100);
    const largeFile = makeFile("data/huge.json", 20, 100000);

    const result = makeResult({
      tokenBudget: 2000,
      estimatedTokens: 100700,
      entryPoints: [entryPoint],
      configFiles: [config],
      documentationFiles: [doc],
      largeFiles: [largeFile],
      importantFiles: [entryPoint, config, doc, largeFile],
    });

    const budgeted = budgetRepoMap(result, 2000);

    const remainingPaths = budgeted.importantFiles.map((f) => f.relativePath);
    expect(remainingPaths).toContain("src/index.ts");
    expect(remainingPaths).toContain("package.json");
    expect(remainingPaths).toContain("README.md");
    expect(remainingPaths).not.toContain("data/huge.json");
  });

  it("handles 2K budget", () => {
    const files: RepoMapFile[] = [
      makeFile("src/index.ts", 100, 300),
      makeFile("package.json", 90, 100),
      makeFile("README.md", 80, 100),
      makeFile("test/foo.test.ts", 70, 200),
      makeFile("data/big.json", 20, 50000),
    ];

    const result = makeResult({
      tokenBudget: 2000,
      estimatedTokens: 50700,
      entryPoints: [files[0]],
      configFiles: [files[1]],
      documentationFiles: [files[2]],
      testFiles: [files[3]],
      largeFiles: [files[4]],
      importantFiles: files,
    });

    const budgeted = budgetRepoMap(result, 2000);

    expect(budgeted.estimatedTokens).toBeLessThanOrEqual(6000);
    expect(budgeted.overflowNotes.length).toBeGreaterThan(0);
  });

  it("handles 16K budget without trimming when under budget", () => {
    const files: RepoMapFile[] = [
      makeFile("src/index.ts", 100, 500),
      makeFile("package.json", 90, 100),
    ];

    const result = makeResult({
      tokenBudget: 16000,
      estimatedTokens: 600,
      entryPoints: [files[0]],
      configFiles: [files[1]],
      importantFiles: files,
    });

    const budgeted = budgetRepoMap(result, 16000);

    expect(budgeted.importantFiles).toHaveLength(2);
    expect(budgeted.overflowNotes).toHaveLength(0);
  });
});
