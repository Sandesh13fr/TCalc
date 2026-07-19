import { describe, it, expect } from "vitest";
import { handleGenerateReport } from "../src/tools/generateReportTool.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, "../../../fixtures/small-node-app");

describe("generateReportTool", () => {
  it("should return markdown format by default", async () => {
    const result = await handleGenerateReport({
      rootPath: fixturePath,
      format: "markdown",
    });

    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("# Workspace Model Report");
  });

  it("should return json format when specified", async () => {
    const result = await handleGenerateReport({
      rootPath: fixturePath,
      format: "json",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.title).toBe("Workspace Model Report");
    expect(parsed.summary).toBeDefined();
    expect(parsed.workspacePath).toBe(fixturePath);
  });

  it("should include repo map when includeRepoMap is true", async () => {
    const result = await handleGenerateReport({
      rootPath: fixturePath,
      format: "markdown",
      includeRepoMap: true,
    });

    expect(result.content[0].text).toContain("# Workspace Model Report");
    expect(result.content[0].text).toContain("# Repo Map");
  });

  it("should include a parseable repo map in JSON reports", async () => {
    const result = await handleGenerateReport({
      rootPath: fixturePath,
      format: "json",
      includeRepoMap: true,
    });

    expect(JSON.parse(result.content[0].text).repoMap).toBeDefined();
  });

  it("should support different goals", async () => {
    const result = await handleGenerateReport({
      rootPath: fixturePath,
      goal: "debug",
      format: "markdown",
    });

    expect(result.content[0].text).toContain("# Workspace Model Report");
  });

  it("caps report recommendation context with team policy", async () => {
    const root = mkdtempSync(path.join(process.cwd(), ".tcalc-report-policy-"));
    try {
      mkdirSync(path.join(root, ".tcalc"));
      writeFileSync(path.join(root, ".tcalc", "team.json"), JSON.stringify({ schemaVersion: "1.0", maxTokenBudget: 100 }));
      writeFileSync(path.join(root, "large.ts"), "word ".repeat(2000));
      const result = await handleGenerateReport({ rootPath: root, format: "json" });
      expect(JSON.parse(result.content[0].text).recommendations.cheapestSufficient.costEstimate.inputTokens).toBe(120);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
