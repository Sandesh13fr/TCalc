import { describe, it, expect } from "vitest";
import type { WorkspaceScanResult, WorkspaceFileInfo, RiskFlag } from "@wma/core";
import { generateSarifReport } from "../src/index.js";
import type { SarifLog } from "../src/types/sarif.js";

function makeFile(
  relPath: string,
  tokens: number,
  riskFlags: RiskFlag[] = [],
  included = true,
): WorkspaceFileInfo {
  return {
    path: `/workspace/${relPath}`,
    relativePath: relPath,
    extension: relPath.includes(".") ? `.${relPath.split(".").pop()}` : "",
    language: "TypeScript",
    bytes: tokens * 4,
    estimatedTokens: tokens,
    included,
    riskFlags,
  };
}

function makeScanResult(files: WorkspaceFileInfo[]): WorkspaceScanResult {
  const totalTokens = files.reduce((s, f) => s + f.estimatedTokens, 0);
  const totalBytes = files.reduce((s, f) => s + f.bytes, 0);
  return {
    rootPath: "/workspace",
    files,
    totalFiles: files.length,
    scannedFiles: files.length,
    includedFiles: files.filter((f) => f.included).length,
    excludedFiles: files.filter((f) => !f.included).length,
    totalBytes,
    totalTokens,
    confidence: "high",
    scannedAt: new Date().toISOString(),
    durationMs: 12,
    folderStats: [],
    warnings: [],
  };
}

describe("generateSarifReport", () => {
  it("generates compliant SARIF 2.1.0 structure with rules catalog", () => {
    const scan = makeScanResult([makeFile("src/index.ts", 200)]);
    const output = generateSarifReport(scan);
    const parsed: SarifLog = JSON.parse(output);

    expect(parsed.version).toBe("2.1.0");
    expect(parsed.$schema).toContain("sarif-schema-2.1.0.json");
    expect(parsed.runs).toHaveLength(1);

    const driver = parsed.runs[0].tool.driver;
    expect(driver.name).toBe("tcalc");
    expect(driver.rules.length).toBeGreaterThanOrEqual(6);
    expect(driver.rules.map((r) => r.id)).toContain("tcalc/secret-leak");
    expect(parsed.runs[0].results).toHaveLength(0);
  });

  it("classifies secret exposure as error level result", () => {
    const scan = makeScanResult([
      makeFile(".env.local", 100, ["secret"], false),
    ]);
    const output = generateSarifReport(scan);
    const parsed: SarifLog = JSON.parse(output);

    const results = parsed.runs[0].results;
    expect(results).toHaveLength(1);
    expect(results[0].ruleId).toBe("tcalc/secret-leak");
    expect(results[0].level).toBe("error");
    expect(results[0].locations[0].physicalLocation.artifactLocation.uri).toBe(".env.local");
    expect(results[0].properties?.riskFlag).toBe("secret");
  });

  it("classifies database dumps as error level results", () => {
    const scan = makeScanResult([
      makeFile("dump.sql", 50000, ["database-dump"], false),
    ]);
    const output = generateSarifReport(scan);
    const parsed: SarifLog = JSON.parse(output);

    const results = parsed.runs[0].results;
    expect(results).toHaveLength(1);
    expect(results[0].ruleId).toBe("tcalc/database-dump-exposed");
    expect(results[0].level).toBe("error");
    expect(results[0].message.text).toContain("database-dump");
  });

  it("classifies large files and build outputs as warning level results", () => {
    const scan = makeScanResult([
      makeFile("dist/bundle.js", 150000, ["build-output", "large-file"], false),
    ]);
    const output = generateSarifReport(scan);
    const parsed: SarifLog = JSON.parse(output);

    const results = parsed.runs[0].results;
    expect(results).toHaveLength(2);
    const ruleIds = results.map((r) => r.ruleId);
    expect(ruleIds).toContain("tcalc/build-output-leak");
    expect(ruleIds).toContain("tcalc/large-file-token-bloat");
    expect(results.every((r) => r.level === "warning")).toBe(true);
  });

  it("normalizes Windows backslashes in artifact URIs", () => {
    const scan = makeScanResult([
      makeFile("packages\\scanner\\secret.key", 50, ["secret"], false),
    ]);
    const output = generateSarifReport(scan);
    const parsed: SarifLog = JSON.parse(output);

    const uri = parsed.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri;
    expect(uri).toBe("packages/scanner/secret.key");
    expect(uri).not.toContain("\\");
  });

  it("supports pretty-printed JSON formatting", () => {
    const scan = makeScanResult([makeFile("src/main.ts", 100)]);
    const output = generateSarifReport(scan, { pretty: true });

    expect(output).toContain("\n");
    expect(output).toContain('  "$schema":');
  });

  it("handles lockfiles and minified assets as note level advisories", () => {
    const scan = makeScanResult([
      makeFile("pnpm-lock.yaml", 25000, ["lockfile"], false),
      makeFile("vendor.min.js", 12000, ["generated"], false),
    ]);
    const output = generateSarifReport(scan);
    const parsed: SarifLog = JSON.parse(output);

    const results = parsed.runs[0].results;
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.level === "note")).toBe(true);
  });
});
