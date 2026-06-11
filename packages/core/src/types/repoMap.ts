import type { WorkspaceGoal } from "./recommendation.js";

export interface RepoMapOptions {
  tokenBudget: number;
  goal?: WorkspaceGoal;
  includeTests?: boolean;
  includeDocs?: boolean;
  includeConfigs?: boolean;
  maxFiles?: number;
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
}
