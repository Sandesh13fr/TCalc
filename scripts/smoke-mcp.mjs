#!/usr/bin/env node
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { handleScanWorkspace } from "../packages/mcp-server/dist/tools/scanWorkspaceTool.js";
import { handleRecommendModels } from "../packages/mcp-server/dist/tools/recommendModelsTool.js";
import { handleCreateRepoMap } from "../packages/mcp-server/dist/tools/createRepoMapTool.js";
import { handleGenerateAgentRules } from "../packages/mcp-server/dist/tools/generateAgentRulesTool.js";
import { handleGenerateReport } from "../packages/mcp-server/dist/tools/generateReportTool.js";
import { handleValidateModelCatalog } from "../packages/mcp-server/dist/tools/validateModelCatalogTool.js";
import { handleCompactCompletedGoal } from "../packages/mcp-server/dist/tools/compactCompletedGoalTool.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = resolve(repoRoot, "fixtures/small-node-app");
const catalogPath = resolve(repoRoot, "catalogs/models.json");
process.env.WMA_ALLOWED_ROOT = repoRoot;

const tools = [
  ["scan_workspace", () => handleScanWorkspace({ rootPath: fixture })],
  ["recommend_models", () => handleRecommendModels({ rootPath: fixture, catalogPath })],
  ["create_repo_map", () => handleCreateRepoMap({ rootPath: fixture, format: "json", tokenBudget: 8000 })],
  ["generate_agent_rules", () => handleGenerateAgentRules({ rootPath: fixture, target: "generic", mode: "concise" })],
  ["generate_report", () => handleGenerateReport({ rootPath: fixture, catalogPath, format: "json" })],
  ["validate_model_catalog", () => handleValidateModelCatalog({ catalogPath })],
  ["compact_completed_goal", () => handleCompactCompletedGoal({ goal: "debug", summary: "Fixed parser", changedFiles: ["src/parser.ts"] })],
];

console.log("MCP tool smoke tests:\n");
for (const [name, run] of tools) {
  process.stdout.write(`  ${name}... `);
  const result = await run();
  if (!result.content?.[0]?.text) throw new Error(`${name} returned no text content`);
  JSON.parse(result.content[0].text);
  process.stdout.write("✓\n");
}
console.log("\nAll MCP tool smoke tests passed.");
