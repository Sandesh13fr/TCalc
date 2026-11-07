import { describe, it, expect, vi } from "vitest";
import type { WorkspaceScanResult, WorkspaceFileInfo, FolderStats, LanguageBreakdown } from "@wma/core";
import { createRepoMap } from "../src/createRepoMap.js";
import * as typeScriptSymbols from "../src/symbols/parsers/typescriptSymbols.js";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

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

function makeFixtureScanResult(): WorkspaceScanResult {
  const files: WorkspaceFileInfo[] = [
    makeFile({ relativePath: "package.json", extension: ".json", language: "JSON" }),
    makeFile({ relativePath: "README.md", extension: ".md", language: "Markdown" }),
    makeFile({ relativePath: "instructions.md", extension: ".md", language: "Markdown" }),
    makeFile({ relativePath: "tsconfig.json", extension: ".json", language: "JSON" }),
    makeFile({ relativePath: "src/index.ts", extension: ".ts", estimatedTokens: 200 }),
    makeFile({ relativePath: "src/main.ts", extension: ".ts", estimatedTokens: 150 }),
    makeFile({ relativePath: "src/lib/utils.ts", extension: ".ts", estimatedTokens: 80 }),
    makeFile({ relativePath: "src/lib/helper.ts", extension: ".ts", estimatedTokens: 60 }),
    makeFile({ relativePath: "test/index.test.ts", extension: ".ts", estimatedTokens: 120 }),
    makeFile({ relativePath: "test/utils.spec.ts", extension: ".ts", estimatedTokens: 90 }),
    makeFile({ relativePath: "dist/bundle.min.js", extension: ".js", estimatedTokens: 8000, riskFlags: ["generated"] }),
    makeFile({ relativePath: "data/big-file.json", extension: ".json", estimatedTokens: 100000 }),
    makeFile({ relativePath: ".env", extension: "", estimatedTokens: 10, riskFlags: ["secret"] }),
  ];

  const folders: FolderStats[] = [
    { folderPath: ".", totalFiles: 13, totalBytes: 0, totalTokens: 0, includedFiles: 13, excludedFiles: 0 },
    { folderPath: "src", totalFiles: 4, totalBytes: 0, totalTokens: 490, includedFiles: 4, excludedFiles: 0 },
    { folderPath: "src/lib", totalFiles: 2, totalBytes: 0, totalTokens: 140, includedFiles: 2, excludedFiles: 0 },
    { folderPath: "test", totalFiles: 2, totalBytes: 0, totalTokens: 210, includedFiles: 2, excludedFiles: 0 },
    { folderPath: "dist", totalFiles: 1, totalBytes: 0, totalTokens: 8000, includedFiles: 1, excludedFiles: 0 },
    { folderPath: "data", totalFiles: 1, totalBytes: 0, totalTokens: 100000, includedFiles: 1, excludedFiles: 0 },
  ];

  const languages: LanguageBreakdown[] = [
    { language: "TypeScript", fileCount: 6, totalBytes: 0, totalTokens: 620, percentage: 0.57 },
    { language: "JSON", fileCount: 2, totalBytes: 0, totalTokens: 200, percentage: 0.18 },
    { language: "Markdown", fileCount: 2, totalBytes: 0, totalTokens: 200, percentage: 0.18 },
  ];

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
    folders,
    languages,
    warnings: [],
    riskFiles: files.filter((f) => f.riskFlags.length > 0),
  };
}

describe("createRepoMap", () => {
  it("creates summary from fixture scan result", () => {
    const scan = makeFixtureScanResult();
    const result = createRepoMap(scan, { tokenBudget: 8000 });

    expect(result.rootPath).toBe("/workspace");
    expect(result.generatedAt).toBeDefined();
    expect(result.tokenBudget).toBe(8000);
    expect(result.workspaceTotalTokens).toBeGreaterThan(0);
    expect(result.summary).toContain("Files:");
    expect(result.summary).toContain("Entry points:");
    expect(result.summary).toContain("Tests:");
  });

  it("includes important files", () => {
    const scan = makeFixtureScanResult();
    const result = createRepoMap(scan, { tokenBudget: 8000 });

    expect(result.importantFiles.length).toBeGreaterThan(0);
    expect(result.entryPoints.length).toBeGreaterThan(0);
    expect(result.configFiles.length).toBeGreaterThan(0);
    expect(result.documentationFiles.length).toBeGreaterThan(0);
    expect(result.testFiles.length).toBeGreaterThan(0);
  });

  it("includes recommended agent context", () => {
    const scan = makeFixtureScanResult();
    const result = createRepoMap(scan, { tokenBudget: 8000 });

    expect(result.recommendedInclude.length).toBeGreaterThan(0);
    expect(result.agentInstructions.length).toBeGreaterThan(0);
    expect(result.agentInstructions.some((i) => i.includes("repo map"))).toBe(true);
  });

  it("includes overflow notes when budget is small", () => {
    const scan = makeFixtureScanResult();
    const result = createRepoMap(scan, { tokenBudget: 2000 });

    if (result.overflowNotes.length > 0) {
      expect(result.overflowNotes[0]).toContain("Budget");
    }
  });

  it("includes top level folders", () => {
    const scan = makeFixtureScanResult();
    const result = createRepoMap(scan, { tokenBudget: 8000 });

    expect(result.topLevelFolders.length).toBeGreaterThan(0);
    const srcFolder = result.topLevelFolders.find((f) => f.relativePath === "src");
    expect(srcFolder).toBeDefined();
    expect(srcFolder!.fileCount).toBeGreaterThan(0);
  });

  it("includes language breakdown", () => {
    const scan = makeFixtureScanResult();
    const result = createRepoMap(scan, { tokenBudget: 8000 });

    expect(result.languageBreakdown.length).toBeGreaterThan(0);
    const ts = result.languageBreakdown.find((l) => l.language === "TypeScript");
    expect(ts).toBeDefined();
  });

  it("includes failed-read warnings and preserves symbols from successful files", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "repo-map-warnings-"));
    try {
      const scan = makeFixtureScanResult();
      const goodPath = join(tempDir, "index.ts");
      writeFileSync(goodPath, "export function availableSymbol() {}", "utf-8");
      scan.files = [
        makeFile({ relativePath: "src/index.ts", path: goodPath }),
        makeFile({ relativePath: "src/main.ts", path: join(tempDir, "missing.ts") }),
      ];

      const result = createRepoMap(scan, { tokenBudget: 8000 });

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("Failed to parse src/main.ts:");
      expect(result.symbols.some((symbol) => symbol.name === "availableSymbol")).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("includes parser-failure warnings and preserves symbols from other files", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "repo-map-parser-warnings-"));
    const originalParser = typeScriptSymbols.extractTypeScriptSymbols;
    const parserSpy = vi.spyOn(typeScriptSymbols, "extractTypeScriptSymbols")
      .mockImplementation((content, relativePath, ext) => {
        if (relativePath === "src/broken.ts") throw new Error("simulated parser failure");
        return originalParser(content, relativePath, ext);
      });

    try {
      const scan = makeFixtureScanResult();
      const goodPath = join(tempDir, "index.ts");
      const brokenPath = join(tempDir, "broken.ts");
      writeFileSync(goodPath, "export function availableSymbol() {}", "utf-8");
      writeFileSync(brokenPath, "export function brokenSymbol() {}", "utf-8");
      scan.files = [
        makeFile({ relativePath: "src/index.ts", path: goodPath }),
        makeFile({ relativePath: "src/broken.ts", path: brokenPath }),
      ];

      const result = createRepoMap(scan, { tokenBudget: 8000 });

      expect(result.warnings).toEqual([
        "Failed to parse src/broken.ts: simulated parser failure",
      ]);
      expect(result.symbols.some((symbol) => symbol.name === "availableSymbol")).toBe(true);
      expect(result.symbols.some((symbol) => symbol.name === "brokenSymbol")).toBe(false);
    } finally {
      parserSpy.mockRestore();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("handles empty scan result gracefully", () => {
    const scan: WorkspaceScanResult = {
      rootPath: "/empty",
      scannedAt: new Date().toISOString(),
      totalFiles: 0,
      includedFiles: 0,
      excludedFiles: 0,
      totalBytes: 0,
      includedBytes: 0,
      totalEstimatedTokens: 0,
      includedTokens: 0,
      files: [],
      folders: [],
      languages: [],
      warnings: [],
      riskFiles: [],
    };
    const result = createRepoMap(scan, { tokenBudget: 8000 });

    expect(result.rootPath).toBe("/empty");
    expect(result.importantFiles).toHaveLength(0);
    expect(result.summary).toContain("Files:");
  });
});
