#!/usr/bin/env node

import { startServer } from "./server.js";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  startServer().catch((error) => {
    console.error("MCP server error:", error);
    process.exit(1);
  });
}

export { startServer, createServer } from "./server.js";
export {
  handleScanWorkspace,
  type ScanWorkspaceInput,
  getCachedScan,
} from "./tools/scanWorkspaceTool.js";
export {
  handleRecommendModels,
  type RecommendModelsInput,
  getCachedRecommendation,
} from "./tools/recommendModelsTool.js";
export {
  handleCreateRepoMap,
  type CreateRepoMapInput,
  getCachedRepoMap,
} from "./tools/createRepoMapTool.js";
export {
  handleGenerateAgentRules,
  type GenerateAgentRulesInput,
} from "./tools/generateAgentRulesTool.js";
export {
  handleGenerateReport,
  type GenerateReportInput,
} from "./tools/generateReportTool.js";
export {
  handleValidateModelCatalog,
  type ValidateModelCatalogInput,
} from "./tools/validateModelCatalogTool.js";
export { readWorkspaceSummary } from "./resources/workspaceSummaryResource.js";
export { readModelCatalog } from "./resources/modelCatalogResource.js";
export {
  getOptimizeCodingAgentPrompt,
  type OptimizeCodingAgentArgs,
} from "./prompts/optimizeCodingAgentPrompt.js";
export {
  validateRootPath,
  isWithinAllowedPath,
  resolveCatalogPath,
} from "./utils/safeRootPath.js";
export * from "./state.js";
