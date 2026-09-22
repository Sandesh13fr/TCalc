import { describe, it, expect } from "vitest";
import type { WorkspaceScanResult, WorkspaceFileInfo } from "@wma/core";
import { analyzeTokenDrift, formatDriftMarkdown } from "../src/index.js";

function makeFile(
  relPath: string,
  tokens: number,
  included = true,
  riskFlags: string[] = [],
): WorkspaceFileInfo {
  return {
    path: `/workspace/${relPath}`,
    relativePath: relPath,
    extension: relPath.includes(".") ? `.${relPath.split(".").pop()}` : "",
    language: "TypeScript",
    bytes: tokens * 4,
    estimatedTokens: tokens,
    included,
    riskFlags: riskFlags as any,
  };
}

function makeScanResult(files: WorkspaceFileInfo[]): WorkspaceScanResult {
  const totalEstimatedTokens = files.reduce((s, f) => s + f.estimatedTokens, 0);
  const totalBytes = files.reduce((s, f) => s + f.bytes, 0);
  const included = files.filter((f) => f.included);
  return {
    rootPath: "/workspace",
    scannedAt: new Date().toISOString(),
    totalFiles: files.length,
    includedFiles: included.length,
    excludedFiles: files.length - included.length,
    totalBytes,
    includedBytes: included.reduce((s, f) => s + f.bytes, 0),
    totalEstimatedTokens,
    includedTokens: included.reduce((s, f) => s + f.estimatedTokens, 0),
    files,
    folders: [],
    languages: [],
    warnings: [],
    riskFiles: [],
  };
}

describe("analyzeTokenDrift", () => {
  it("computes zero drift for identical scans", () => {
    const files = [
      makeFile("src/index.ts", 500),
      makeFile("src/utils.ts", 300),
    ];
    const base = makeScanResult(files);
    const curr = makeScanResult(files);

    const report = analyzeTokenDrift(base, curr);

    expect(report.netTokenDelta).toBe(0);
    expect(report.netPercentChange).toBe(0);
    expect(report.filesAdded).toBe(0);
    expect(report.filesRemoved).toBe(0);
    expect(report.filesModified).toBe(0);
    expect(report.filesUnchanged).toBe(2);
    expect(report.passed).toBe(true);
    expect(report.violations).toHaveLength(0);
  });

  it("detects added and removed files correctly", () => {
    const baseFiles = [
      makeFile("src/index.ts", 500),
      makeFile("src/legacy.ts", 400),
    ];
    const currFiles = [
      makeFile("src/index.ts", 500),
      makeFile("src/newFeature.ts", 800),
    ];

    const base = makeScanResult(baseFiles);
    const curr = makeScanResult(currFiles);

    const report = analyzeTokenDrift(base, curr);

    expect(report.baselineTotalTokens).toBe(900);
    expect(report.currentTotalTokens).toBe(1300);
    expect(report.netTokenDelta).toBe(400);
    expect(report.filesAdded).toBe(1);
    expect(report.filesRemoved).toBe(1);
    expect(report.filesUnchanged).toBe(1);
    expect(report.topGrowingFiles[0].relativePath).toBe("src/newFeature.ts");
    expect(report.topShrinkingFiles[0].relativePath).toBe("src/legacy.ts");
  });

  it("tracks modified file token updates and risk flag changes", () => {
    const baseFiles = [
      makeFile("src/index.ts", 500),
      makeFile(".env.local", 50, false, []),
    ];
    const currFiles = [
      makeFile("src/index.ts", 1200),
      makeFile(".env.local", 150, false, ["secret"]),
    ];

    const report = analyzeTokenDrift(makeScanResult(baseFiles), makeScanResult(currFiles));

    expect(report.filesModified).toBe(2);
    expect(report.netTokenDelta).toBe(800);
    const envDelta = report.topGrowingFiles.find((f) => f.relativePath === ".env.local");
    expect(envDelta?.riskFlagsAdded).toContain("secret");
  });

  it("aggregates directory drifts accurately", () => {
    const baseFiles = [
      makeFile("packages/core/src/index.ts", 200),
      makeFile("packages/scanner/src/scan.ts", 400),
    ];
    const currFiles = [
      makeFile("packages/core/src/index.ts", 500), // +300
      makeFile("packages/core/src/new.ts", 200), // +200
      makeFile("packages/scanner/src/scan.ts", 350), // -50
    ];

    const report = analyzeTokenDrift(makeScanResult(baseFiles), makeScanResult(currFiles));

    const coreDrift = report.directoryDrifts.find((d) => d.directory === "packages/core/src");
    expect(coreDrift?.tokenDelta).toBe(500);
    expect(coreDrift?.fileCountDelta).toBe(1);

    const scannerDrift = report.directoryDrifts.find((d) => d.directory === "packages/scanner/src");
    expect(scannerDrift?.tokenDelta).toBe(-50);
  });

  it("enforces maxTokenIncrease policy threshold", () => {
    const base = makeScanResult([makeFile("src/index.ts", 1000)]);
    const curr = makeScanResult([makeFile("src/index.ts", 2500)]);

    const report = analyzeTokenDrift(base, curr, { maxTokenIncrease: 1000 });

    expect(report.passed).toBe(false);
    expect(report.violations[0]).toContain("exceeds maximum allowed increase of 1,000");
  });

  it("enforces maxDriftPercentage policy threshold", () => {
    const base = makeScanResult([makeFile("src/index.ts", 1000)]);
    const curr = makeScanResult([makeFile("src/index.ts", 1500)]);

    const report = analyzeTokenDrift(base, curr, { maxDriftPercentage: 25 });

    expect(report.passed).toBe(false);
    expect(report.violations[0]).toContain("exceeds policy threshold of +25%");
  });

  it("alerts on newly introduced risk flags", () => {
    const base = makeScanResult([makeFile("config/key.json", 100)]);
    const curr = makeScanResult([makeFile("config/key.json", 100, false, ["secret"])]);

    const report = analyzeTokenDrift(base, curr, { alertOnNewRiskFlags: true });

    expect(report.passed).toBe(false);
    expect(report.violations[0]).toContain("New risk flag(s) [secret] introduced in config/key.json");
  });

  it("enforces maxFileCountIncrease policy threshold", () => {
    const base = makeScanResult([makeFile("src/1.ts", 100)]);
    const curr = makeScanResult([
      makeFile("src/1.ts", 100),
      makeFile("src/2.ts", 100),
      makeFile("src/3.ts", 100),
    ]);

    const report = analyzeTokenDrift(base, curr, { maxFileCountIncrease: 1 });

    expect(report.passed).toBe(false);
    expect(report.violations[0]).toContain("Net file count increase of 2 exceeds allowed limit of 1");
  });

  it("formats markdown drift report with tables and violations", () => {
    const base = makeScanResult([makeFile("src/index.ts", 1000)]);
    const curr = makeScanResult([
      makeFile("src/index.ts", 1800),
      makeFile("src/app.ts", 400),
    ]);

    const report = analyzeTokenDrift(base, curr, { maxTokenIncrease: 500 });
    const md = formatDriftMarkdown(report);

    expect(md).toContain("# Workspace Token Drift Report");
    expect(md).toContain("❌ POLICY VIOLATION");
    expect(md).toContain("## Summary");
    expect(md).toContain("## Top Growing Files");
    expect(md).toContain("## Directory Breakdown");
    expect(md).toContain("## Policy Violations");
    expect(md).toContain("src/index.ts");
  });

  it("handles empty workspaces safely without division by zero", () => {
    const base = makeScanResult([]);
    const curr = makeScanResult([makeFile("src/initial.ts", 500)]);

    const report = analyzeTokenDrift(base, curr);

    expect(report.netPercentChange).toBe(100);
    expect(report.netTokenDelta).toBe(500);
    expect(report.passed).toBe(true);
  });
});
