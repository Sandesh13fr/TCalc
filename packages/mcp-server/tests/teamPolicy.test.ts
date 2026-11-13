import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { handleScanWorkspace } from "../src/tools/scanWorkspaceTool.js";
import { handleRecommendModels } from "../src/tools/recommendModelsTool.js";
import { handleGenerateReport } from "../src/tools/generateReportTool.js";
import { handleGenerateAgentRules } from "../src/tools/generateAgentRulesTool.js";
import { handleCreateRepoMap } from "../src/tools/createRepoMapTool.js";
import { getLatestRecommendation } from "../src/state.js";

const cleanup: string[] = [];
afterEach(() => cleanup.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));

describe("MCP team policy", () => {
  it("enforces shared exclusions", async () => {
    const root = mkdtempSync(path.join(process.cwd(), ".tcalc-team-policy-"));
    cleanup.push(root);
    mkdirSync(path.join(root, ".tcalc"));
    writeFileSync(path.join(root, ".tcalc", "team.json"), JSON.stringify({ schemaVersion: "1.0", exclude: ["private.ts"] }));
    writeFileSync(path.join(root, "private.ts"), "export const privateValue = 1;");
    writeFileSync(path.join(root, "public.ts"), "export const publicValue = 1;");
    const result = await handleScanWorkspace({ rootPath: root });
    const summary = JSON.parse(result.content[0].text);
    expect(summary.includedFiles).toBe(2);
    expect(summary.excludedFiles).toBe(1);
  });
});

describe("MCP team policy defaultGoal", () => {
  function workspaceWithDefaultGoal(): string {
    const root = mkdtempSync(path.join(process.cwd(), ".tcalc-team-goal-"));
    cleanup.push(root);
    mkdirSync(path.join(root, ".tcalc"));
    writeFileSync(path.join(root, ".tcalc", "team.json"), JSON.stringify({ schemaVersion: "1.0", defaultGoal: "add-feature" }));
    writeFileSync(path.join(root, "index.ts"), "export const value = 1;");
    return root;
  }

  it("recommend_models uses an explicit goal and falls back to defaultGoal", async () => {
    const root = workspaceWithDefaultGoal();
    const explicit = await handleRecommendModels({ rootPath: root, goal: "debug" });
    expect(JSON.parse(explicit.content[0].text).goal).toBe("debug");
    const fallback = await handleRecommendModels({ rootPath: root });
    expect(JSON.parse(fallback.content[0].text).goal).toBe("add-feature");
  });

  it("generate_report uses an explicit goal and falls back to defaultGoal", async () => {
    const root = workspaceWithDefaultGoal();
    await handleGenerateReport({ rootPath: root, format: "json", goal: "debug" });
    expect(getLatestRecommendation()?.goal).toBe("debug");
    await handleGenerateReport({ rootPath: root, format: "json" });
    expect(getLatestRecommendation()?.goal).toBe("add-feature");
  });

  it("generate_agent_rules uses an explicit goal and falls back to defaultGoal", async () => {
    const root = workspaceWithDefaultGoal();
    await handleGenerateAgentRules({ rootPath: root, goal: "debug" });
    expect(getLatestRecommendation()?.goal).toBe("debug");
    await handleGenerateAgentRules({ rootPath: root });
    expect(getLatestRecommendation()?.goal).toBe("add-feature");
  });

  it("create_repo_map uses an explicit goal and falls back to defaultGoal", async () => {
    const root = workspaceWithDefaultGoal();
    const explicit = await handleCreateRepoMap({ rootPath: root, format: "json", goal: "debug" });
    expect(JSON.parse(explicit.content[0].text).agentInstructions).toContain("The current workspace goal is: debug");
    const fallback = await handleCreateRepoMap({ rootPath: root, format: "json" });
    expect(JSON.parse(fallback.content[0].text).agentInstructions).toContain("The current workspace goal is: add-feature");
  });
});
