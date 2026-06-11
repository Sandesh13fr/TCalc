import type { CostEstimate } from "./pricing.js";

export type RiskFlag =
  | "secret"
  | "large-file"
  | "generated"
  | "lockfile"
  | "build-output"
  | "binary"
  | "database-dump"
  | "log-file";

export interface WorkspaceFileInfo {
  path: string;
  relativePath: string;
  extension: string;
  language: string;
  bytes: number;
  estimatedTokens: number;
  included: boolean;
  excludedReason?: string;
  riskFlags: RiskFlag[];
}

export interface FolderStats {
  folderPath: string;
  totalFiles: number;
  totalBytes: number;
  totalTokens: number;
  includedFiles: number;
  excludedFiles: number;
}

export interface LanguageBreakdown {
  language: string;
  fileCount: number;
  totalBytes: number;
  totalTokens: number;
  percentage: number;
}

export interface WorkspaceScanResult {
  rootPath: string;
  scannedAt: string;
  totalFiles: number;
  includedFiles: number;
  excludedFiles: number;
  totalBytes: number;
  includedBytes: number;
  totalEstimatedTokens: number;
  includedTokens: number;
  files: WorkspaceFileInfo[];
  folders: FolderStats[];
  languages: LanguageBreakdown[];
  warnings: string[];
  riskFiles: WorkspaceFileInfo[];
}
