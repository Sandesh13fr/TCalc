import type { WorkspaceGoal } from "./recommendation.js";

export interface RepoMapOptions {
  tokenBudget: number;
  goal?: WorkspaceGoal;
  includeTests?: boolean;
  includeDocs?: boolean;
  includeConfigs?: boolean;
  maxFiles?: number;
  enableSymbolExtraction?: boolean;
  maxParseFileBytes?: number;
  maxSymbols?: number;
  includeImports?: boolean;
  includeRoutes?: boolean;
}

export interface RepoMapFile {
  relativePath: string;
  language?: string;
  estimatedTokens: number;
  reason: string;
  priority: number;
}

export interface RepoMapFolder {
  relativePath: string;
  estimatedTokens: number;
  fileCount: number;
}

export interface RepoMapLanguage {
  language: string;
  estimatedTokens: number;
  fileCount: number;
}

export interface RepoMapSymbol {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "enum" | "variable" | "method" | "component" | "route" | "unknown";
  relativePath: string;
  lineStart?: number;
  lineEnd?: number;
  exported?: boolean;
  async?: boolean;
  priority: number;
}

export interface RepoMapImport {
  source: string;
  importedFrom?: string;
  resolvedPath?: string;
  relativePath: string;
  kind: "import" | "require" | "dynamic-import" | "export-from";
}

export interface RepoMapRoute {
  relativePath: string;
  routePattern?: string;
  framework?: "nextjs" | "express" | "fastify" | "react-router" | "fastapi" | "flask" | "spring" | "unknown";
  reason: string;
}

export interface RepoMapResult {
  rootPath: string;
  generatedAt: string;
  tokenBudget: number;
  estimatedTokens: number;
  workspaceTotalTokens: number;
  summary: string;
  topLevelFolders: RepoMapFolder[];
  languageBreakdown: RepoMapLanguage[];
  importantFiles: RepoMapFile[];
  entryPoints: RepoMapFile[];
  testFiles: RepoMapFile[];
  configFiles: RepoMapFile[];
  documentationFiles: RepoMapFile[];
  riskyFiles: RepoMapFile[];
  largeFiles: RepoMapFile[];
  generatedFiles: RepoMapFile[];
  excludedFiles: RepoMapFile[];
  recommendedInclude: RepoMapFile[];
  recommendedExclude: RepoMapFile[];
  agentInstructions: string[];
  overflowNotes: string[];
  symbols: RepoMapSymbol[];
  imports: RepoMapImport[];
  routes: RepoMapRoute[];
  symbolSummary: string[];
}
