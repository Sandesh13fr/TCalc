import { describe, it, expect } from "vitest";
import type { WorkspaceScanResult, WorkspaceFileInfo, FolderStats, LanguageBreakdown } from "@wma/core";
import { selectImportantFiles } from "../src/selectImportantFiles.js";

function makeFile(overrides: Partial<WorkspaceFileInfo> & { relativePath: string }): WorkspaceFileInfo {
  return {
    path: `/workspace/${overrides.relativePath}`,
    extension: overrides.extension ?? ".ts",
    language: overrides.language ?? "TypeScript",
    bytes: overrides.bytes ?? 1000,
    estimatedTokens: overrides.estimatedTokens ?? 100,
    included: overrides.included ?? true,
    riskFlags: overrides.riskFlags ?? [],
    ...overrides,
  };
}

function makeScanResult(files: WorkspaceFileInfo[]): WorkspaceScanResult {
  return {
    rootPath: "/workspace",
    scannedAt: new Date().toISOString(),
    totalFiles: files.length,
    includedFiles: files.filter((f) => f.included).length,
    excludedFiles: files.filter((f) => !f.included).length,
    totalBytes: files.reduce((s, f) => s + f.bytes, 0),
    includedBytes: files.filter((f) => f.included).reduce((s, f) => s + f.bytes, 0),
    totalEstimatedTokens: files.reduce((s, f) => s + f.estimatedTokens, 0),
    includedTokens: files.filter((f) => f.included).reduce((s, f) => s + f.estimatedTokens, 0),
    files,
    folders: [],
    languages: [],
    warnings: [],
    riskFiles: files.filter((f) => f.riskFlags.length > 0),
  };
}

describe("selectImportantFiles", () => {
  it("detects package.json", () => {
    const result = makeScanResult([
      makeFile({ relativePath: "package.json", extension: ".json" }),
    ]);
    const selected = selectImportantFiles(result, { tokenBudget: 8000 });
    expect(selected.configFiles).toHaveLength(1);
    expect(selected.configFiles[0].relativePath).toBe("package.json");
    expect(selected.configFiles[0].priority).toBe(90);
  });

  it("detects README.md", () => {
    const result = makeScanResult([
      makeFile({ relativePath: "README.md", extension: ".md" }),
    ]);
    const selected = selectImportantFiles(result, { tokenBudget: 8000 });
    expect(selected.documentationFiles).toHaveLength(1);
    expect(selected.documentationFiles[0].relativePath).toBe("README.md");
    expect(selected.documentationFiles[0].priority).toBe(80);
  });

  it("detects src/index.ts", () => {
    const result = makeScanResult([
      makeFile({ relativePath: "src/index.ts", extension: ".ts" }),
    ]);
    const selected = selectImportantFiles(result, { tokenBudget: 8000 });
    expect(selected.entryPoints).toHaveLength(1);
    expect(selected.entryPoints[0].relativePath).toBe("src/index.ts");
    expect(selected.entryPoints[0].priority).toBe(100);
  });

  it("detects tests", () => {
    const result = makeScanResult([
      makeFile({ relativePath: "src/foo.test.ts", extension: ".ts" }),
      makeFile({ relativePath: "tests/bar.spec.ts", extension: ".ts" }),
      makeFile({ relativePath: "src/main.ts", extension: ".ts" }),
    ]);
    const selected = selectImportantFiles(result, { tokenBudget: 8000 });
    expect(selected.testFiles).toHaveLength(2);
    const testPaths = selected.testFiles.map((f) => f.relativePath).sort();
    expect(testPaths).toEqual(["src/foo.test.ts", "tests/bar.spec.ts"]);
  });

  it("deprioritizes generated files", () => {
    const result = makeScanResult([
      makeFile({ relativePath: "dist/bundle.min.js", extension: ".js", estimatedTokens: 10000 }),
      makeFile({ relativePath: "src/index.ts", extension: ".ts" }),
    ]);
    const selected = selectImportantFiles(result, { tokenBudget: 8000 });
    const generated = selected.generatedFiles.find((f) => f.relativePath === "dist/bundle.min.js");
    expect(generated).toBeDefined();
    expect(generated!.priority).toBeLessThanOrEqual(20);
    const entry = selected.entryPoints.find((f) => f.relativePath === "src/index.ts");
    expect(entry).toBeDefined();
    expect(entry!.priority).toBeGreaterThan(generated!.priority);
  });

  it("flags large files", () => {
    const result = makeScanResult([
      makeFile({ relativePath: "data/big-file.json", extension: ".json", estimatedTokens: 100000 }),
    ]);
    const selected = selectImportantFiles(result, { tokenBudget: 8000 });
    expect(selected.largeFiles).toHaveLength(1);
    expect(selected.largeFiles[0].relativePath).toBe("data/big-file.json");
  });

  it("detects AGENTS.md and CLAUDE.md", () => {
    const result = makeScanResult([
      makeFile({ relativePath: "AGENTS.md", extension: ".md" }),
      makeFile({ relativePath: "CLAUDE.md", extension: ".md" }),
    ]);
    const selected = selectImportantFiles(result, { tokenBudget: 8000 });
    expect(selected.documentationFiles).toHaveLength(2);
  });

  it("detects tsconfig.json as config", () => {
    const result = makeScanResult([
      makeFile({ relativePath: "tsconfig.json", extension: ".json" }),
      makeFile({ relativePath: "tsconfig.base.json", extension: ".json" }),
    ]);
    const selected = selectImportantFiles(result, { tokenBudget: 8000 });
    expect(selected.configFiles.length).toBeGreaterThanOrEqual(2);
  });

  it("marks excluded files", () => {
    const result = makeScanResult([
      makeFile({ relativePath: "node_modules/foo/index.js", extension: ".js", included: false, excludedReason: "In .gitignore" }),
    ]);
    const selected = selectImportantFiles(result, { tokenBudget: 8000 });
    expect(selected.excludedFiles).toHaveLength(1);
    expect(selected.excludedFiles[0].relativePath).toBe("node_modules/foo/index.js");
  });
});
