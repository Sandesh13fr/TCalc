import { describe, it, expect, vi } from "vitest";
import type { WorkspaceScanResult } from "@wma/core";
import * as scanner from "@wma/scanner";
import { handleCreateRepoMap } from "../src/tools/createRepoMapTool.js";
import { formatRepoMapMarkdown } from "@wma/repo-map";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, "../../../fixtures/small-node-app");

describe("createRepoMapTool", () => {
  it("should return markdown format by default", async () => {
    const result = await handleCreateRepoMap({
      rootPath: fixturePath,
      format: "markdown",
    });

    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("# Repo Map");
  });

  it("should return json format when specified", async () => {
    const result = await handleCreateRepoMap({
      rootPath: fixturePath,
      format: "json",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.rootPath).toBe(fixturePath);
    expect(parsed.importantFiles).toBeInstanceOf(Array);
  });

  it("should not include full source file bodies in json output", async () => {
    const result = await handleCreateRepoMap({
      rootPath: fixturePath,
      format: "json",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.symbols).toBeUndefined();
    expect(parsed.imports).toBeUndefined();
    expect(parsed.routes).toBeUndefined();
  });

  it("should include symbols in markdown format when enabled", async () => {
    const result = await handleCreateRepoMap({
      rootPath: fixturePath,
      format: "markdown",
      enableSymbolExtraction: true,
    });

    expect(result.content[0].text).toBeDefined();
  });

  it("should support tokenBudget option", async () => {
    const result = await handleCreateRepoMap({
      rootPath: fixturePath,
      tokenBudget: 10000,
      format: "json",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.tokenBudget).toBe(10000);
  });

  it("includes symbol extraction warnings in Markdown and JSON output", async () => {
    const scanResult: WorkspaceScanResult = {
      rootPath: fixturePath,
      scannedAt: new Date().toISOString(),
      totalFiles: 1,
      includedFiles: 1,
      excludedFiles: 0,
      totalBytes: 100,
      includedBytes: 100,
      totalEstimatedTokens: 25,
      includedTokens: 25,
      files: [{
        path: path.join(fixturePath, "missing.ts"),
        relativePath: "src/index.ts",
        extension: ".ts",
        language: "TypeScript",
        bytes: 100,
        estimatedTokens: 25,
        included: true,
        riskFlags: [],
      }],
      folders: [],
      languages: [],
      warnings: [],
      riskFiles: [],
    };
    const scanSpy = vi.spyOn(scanner, "scanWorkspace").mockResolvedValue(scanResult);

    try {
      const markdownResult = await handleCreateRepoMap({
        rootPath: fixturePath,
        format: "markdown",
      });
      expect(markdownResult.content[0].text).toContain("## Warnings");
      expect(markdownResult.content[0].text).toContain("Failed to parse src/index.ts:");

      const jsonResult = await handleCreateRepoMap({
        rootPath: fixturePath,
        format: "json",
      });
      const parsed = JSON.parse(jsonResult.content[0].text);
      expect(parsed.warnings).toHaveLength(1);
      expect(parsed.warnings[0]).toContain("Failed to parse src/index.ts:");
    } finally {
      scanSpy.mockRestore();
    }
  });
});