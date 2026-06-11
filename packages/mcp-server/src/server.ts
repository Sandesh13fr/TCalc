import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  handleScanWorkspace,
  type ScanWorkspaceInput,
} from "./tools/scanWorkspaceTool.js";
import {
  handleRecommendModels,
  type RecommendModelsInput,
} from "./tools/recommendModelsTool.js";
import {
  handleCreateRepoMap,
  type CreateRepoMapInput,
} from "./tools/createRepoMapTool.js";
import {
  handleGenerateAgentRules,
  type GenerateAgentRulesInput,
} from "./tools/generateAgentRulesTool.js";
import {
  handleGenerateReport,
  type GenerateReportInput,
} from "./tools/generateReportTool.js";
import {
  handleValidateModelCatalog,
  type ValidateModelCatalogInput,
} from "./tools/validateModelCatalogTool.js";
import { readWorkspaceSummary } from "./resources/workspaceSummaryResource.js";
import { readModelCatalog } from "./resources/modelCatalogResource.js";
import {
  getOptimizeCodingAgentPrompt,
  type OptimizeCodingAgentArgs,
} from "./prompts/optimizeCodingAgentPrompt.js";

export function createServer(): Server {
  const server = new Server(
    {
      name: "wma-mcp",
      version: "0.1.0",
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "scan_workspace",
          description: "Scan a workspace and return a compact JSON summary of the codebase structure, file counts, and token estimates.",
          inputSchema: {
            type: "object",
            properties: {
              rootPath: { type: "string", description: "Root path to scan (defaults to current working directory)" },
              goal: { type: "string", description: "Workspace goal" },
              privacyMode: { type: "string", enum: ["local-first", "cloud-ok"] },
              maxFiles: { type: "number" },
              tokenBudget: { type: "number" },
            },
          },
        },
        {
          name: "recommend_models",
          description: "Scan workspace and recommend AI models based on token count, goal, and privacy preferences.",
          inputSchema: {
            type: "object",
            properties: {
              rootPath: { type: "string", description: "Root path to scan" },
              goal: { type: "string", description: "Workspace goal" },
              privacyMode: { type: "string", enum: ["local-first", "cloud-ok"] },
              catalogPath: { type: "string", description: "Path to model catalog JSON" },
              tokenBudget: { type: "number", description: "Token budget limit" },
            },
          },
        },
        {
          name: "create_repo_map",
          description: "Generate a repo map showing important files, entry points, and optionally extracted symbols.",
          inputSchema: {
            type: "object",
            properties: {
              rootPath: { type: "string", description: "Root path to scan" },
              goal: { type: "string", description: "Workspace goal" },
              tokenBudget: { type: "number", description: "Token budget for repo map" },
              enableSymbolExtraction: { type: "boolean", description: "Enable symbol extraction" },
              maxSymbols: { type: "number", description: "Maximum symbols to extract" },
              format: { type: "string", enum: ["markdown", "json"] },
            },
          },
        },
        {
          name: "generate_agent_rules",
          description: "Generate agent rules for a specific target (cursor, claude-code, generic) and optimization mode.",
          inputSchema: {
            type: "object",
            properties: {
              rootPath: { type: "string", description: "Root path to scan" },
              target: { type: "string", enum: ["generic", "cursor", "claude-code"] },
              mode: { type: "string", enum: ["normal", "concise", "patch-only", "repo-map-first", "ask-before-reading-large-files"] },
              goal: { type: "string", description: "Workspace goal" },
              privacyMode: { type: "string", enum: ["local-first", "cloud-ok"] },
            },
          },
        },
        {
          name: "generate_report",
          description: "Generate a full Markdown or JSON report including workspace scan and model recommendations.",
          inputSchema: {
            type: "object",
            properties: {
              rootPath: { type: "string", description: "Root path to scan" },
              goal: { type: "string", description: "Workspace goal" },
              privacyMode: { type: "string", enum: ["local-first", "cloud-ok"] },
              catalogPath: { type: "string", description: "Path to model catalog JSON" },
              includeRepoMap: { type: "boolean", description: "Include repo map in report" },
              format: { type: "string", enum: ["markdown", "json"] },
            },
          },
        },
        {
          name: "validate_model_catalog",
          description: "Validate a model catalog JSON file for required fields and correct types.",
          inputSchema: {
            type: "object",
            properties: {
              catalogPath: { type: "string", description: "Path to model catalog JSON" },
            },
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "scan_workspace":
        return handleScanWorkspace(args ?? {});
      case "recommend_models":
        return handleRecommendModels(args ?? {});
      case "create_repo_map":
        return handleCreateRepoMap(args ?? {});
      case "generate_agent_rules":
        return handleGenerateAgentRules(args ?? {});
      case "generate_report":
        return handleGenerateReport(args ?? {});
      case "validate_model_catalog":
        return handleValidateModelCatalog(args ?? {});
      default:
        return {
          content: [
            {
              type: "text" as const,
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "workspace://summary",
          name: "Workspace Summary",
          description: "Latest workspace scan summary (compact JSON)",
          mimeType: "application/json",
        },
        {
          uri: "model-catalog://models",
          name: "Model Catalog Summary",
          description: "Loaded model catalog summary (no secrets exposed)",
          mimeType: "application/json",
        },
      ],
    };
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    return {
      resourceTemplates: [],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    switch (uri) {
      case "workspace://summary":
        return readWorkspaceSummary();
      case "model-catalog://models":
        return readModelCatalog();
      default:
        return {
          contents: [
            {
              uri,
              text: "Unknown resource",
            },
          ],
        };
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: "optimize_coding_agent_for_workspace",
          description: "Generate optimized instructions for a coding agent working on this workspace",
          arguments: [
            {
              name: "goal",
              description: "Workspace goal (e.g., build-mvp, add-feature, debug)",
              required: true,
            },
            {
              name: "tokenBudget",
              description: "Target token budget",
              required: false,
            },
            {
              name: "privacyMode",
              description: "Privacy mode preference",
              required: false,
            },
          ],
        },
      ],
    };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "optimize_coding_agent_for_workspace") {
      const promptArgs: OptimizeCodingAgentArgs = {
        goal: (args?.goal as any) ?? "build-mvp",
        tokenBudget: args?.tokenBudget ? Number(args.tokenBudget) : undefined,
        privacyMode: (args?.privacyMode as any) ?? "local-first",
      };
      return getOptimizeCodingAgentPrompt(promptArgs);
    }

    return {
      messages: [
        {
          role: "user" as const,
          text: "Unknown prompt",
        },
      ],
    };
  });

  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}