import { describe, it, expect } from "vitest";
import { createCompactWorkspaceSummary } from "../src/utils/compactResults.js";
import type { WorkspaceScanResult } from "@wma/core";

describe("createCompactWorkspaceSummary - immutability (Issue #132)", () => {
  it("does not mutate scan.files or scan.folders in place and retains original ordering", () => {
    const scan: WorkspaceScanResult = {
      rootPath: "/workspace",
      scannedAt: new Date().toISOString(),
      totalFiles: 3,
      includedFiles: 3,
      excludedFiles: 0,
      totalBytes: 300,
      includedBytes: 300,
      totalEstimatedTokens: 60,
      includedTokens: 60,
      files: [
        { path: "/workspace/small.ts", relativePath: "small.ts", extension: ".ts", language: "TypeScript", bytes: 50, estimatedTokens: 10, included: true, riskFlags: [] },
        { path: "/workspace/large.ts", relativePath: "large.ts", extension: ".ts", language: "TypeScript", bytes: 150, estimatedTokens: 30, included: true, riskFlags: [] },
        { path: "/workspace/medium.ts", relativePath: "medium.ts", extension: ".ts", language: "TypeScript", bytes: 100, estimatedTokens: 20, included: true, riskFlags: [] },
      ],
      folders: [
        { folderPath: "sub-b", totalBytes: 100, totalTokens: 10, fileCount: 1, includedFiles: 1 },
        { folderPath: "sub-a", totalBytes: 500, totalTokens: 50, fileCount: 2, includedFiles: 2 },
        { folderPath: "sub-c", totalBytes: 200, totalTokens: 20, fileCount: 1, includedFiles: 1 },
      ],
      languages: [],
      warnings: [],
      riskFiles: [],
    };

    // Store snapshots of original order
    const originalFilePaths = scan.files.map((f) => f.relativePath);
    const originalFolderPaths = scan.folders.map((f) => f.folderPath);

    const summary = createCompactWorkspaceSummary(scan);

    // Summary should be sorted by tokens descending
    expect(summary.topFiles.map((f) => f.path)).toEqual(["large.ts", "medium.ts", "small.ts"]);
    expect(summary.topFolders.map((f) => f.path)).toEqual(["sub-a", "sub-c", "sub-b"]);

    // Input scan object MUST retain its original order without mutation
    expect(scan.files.map((f) => f.relativePath)).toEqual(originalFilePaths);
    expect(scan.folders.map((f) => f.folderPath)).toEqual(originalFolderPaths);
  });
});
