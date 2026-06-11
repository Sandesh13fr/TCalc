import { readdir, stat, readFile } from "node:fs/promises";
import path from "node:path";
import type { WorkspaceFileInfo, WorkspaceScanResult, FolderStats, LanguageBreakdown } from "@wma/core";
import { DEFAULT_FILE_SIZE_CONFIG } from "@wma/core";
import { IgnoreResolver, type IgnoreResolverOptions } from "./ignoreResolver.js";
import { classifyFile, detectSecretRisk } from "./classifyFile.js";

const CONCURRENCY_LIMIT = 10;

export interface ScanOptions extends IgnoreResolverOptions {
  rootPath: string;
}

export async function scanWorkspace(options: ScanOptions): Promise<WorkspaceScanResult> {
  const { rootPath } = options;
  const resolver = await resolveIgnoreRules(rootPath, options);

  const allFiles: WorkspaceFileInfo[] = [];
  const filePaths = await walkFiles(rootPath, rootPath, resolver);

  for (let i = 0; i < filePaths.length; i += CONCURRENCY_LIMIT) {
    const chunk = filePaths.slice(i, i + CONCURRENCY_LIMIT);
    const results = await Promise.all(chunk.map(filePath => scanSingleFile(rootPath, filePath, resolver)));
    allFiles.push(...results);
  }

  allFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const warnings: string[] = [];
  if (allFiles.length === 0) {
    warnings.push("No files found in workspace");
  }

  const stats = aggregateWorkspaceStats(allFiles);
  const folders = computeFolderStats(allFiles);
  const included = allFiles.filter(f => f.included);
  const languages = computeLanguageBreakdown(included);
  const riskFiles = allFiles.filter(f => f.riskFlags.length > 0);

  return {
    rootPath,
    scannedAt: new Date().toISOString(),
    ...stats,
    files: allFiles,
    folders,
    languages,
    warnings,
    riskFiles,
  };
}

export async function walkFiles(rootPath: string, currentPath: string, resolver: IgnoreResolver): Promise<string[]> {
  const results: string[] = [];
  let entries: string[];
  try {
    entries = await readdir(currentPath);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry);
    const entryName = path.basename(entry);
    if (entryName === ".git" || entryName === ".svn" || entryName === ".hg") continue;
    let entryStat;
    try {
      entryStat = await stat(fullPath);
    } catch {
      continue;
    }
    const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, "/");
    if (entryStat.isDirectory()) {
      if (resolver.shouldIgnore(relativePath + "/", 0).ignored) continue;
      const subResults = await walkFiles(rootPath, fullPath, resolver);
      results.push(...subResults);
    } else if (entryStat.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

export async function resolveIgnoreRules(rootPath: string, options?: IgnoreResolverOptions): Promise<IgnoreResolver> {
  const resolver = new IgnoreResolver(options);
  await resolver.loadIgnoreFiles(rootPath);
  return resolver;
}

export function aggregateWorkspaceStats(files: WorkspaceFileInfo[]) {
  const included = files.filter(f => f.included);
  return {
    totalFiles: files.length,
    includedFiles: included.length,
    excludedFiles: files.length - included.length,
    totalBytes: files.reduce((s, f) => s + f.bytes, 0),
    includedBytes: included.reduce((s, f) => s + f.bytes, 0),
    totalEstimatedTokens: files.reduce((s, f) => s + f.estimatedTokens, 0),
    includedTokens: included.reduce((s, f) => s + f.estimatedTokens, 0),
  };
}

async function scanSingleFile(
  rootPath: string,
  filePath: string,
  resolver: IgnoreResolver,
): Promise<WorkspaceFileInfo> {
  let entryStat;
  try {
    entryStat = await stat(filePath);
  } catch {
    entryStat = undefined;
  }
  const relativePath = path.relative(rootPath, filePath).replace(/\\/g, "/");
  const extension = path.extname(filePath).toLowerCase();
  const fileSize = entryStat ? Number(entryStat.size) : 0;
  const classification = classifyFile(relativePath, fileSize);
  const riskFlags = [...classification.riskFlags];

  const ignoreResult = resolver.shouldIgnore(relativePath, fileSize);

  const excludedByIgnoreOrBinary = ignoreResult.ignored || classification.isBinary;
  let excludedBySecret = riskFlags.includes("secret");
  let estimatedTokens = 0;
  let contentPreview = "";

  const fileSizeConfig = DEFAULT_FILE_SIZE_CONFIG;

  if (!excludedByIgnoreOrBinary && entryStat && fileSize > 0) {
    if (fileSize <= fileSizeConfig.maxTextFileBytes) {
      try {
        const buf = await readFile(filePath);
        const text = buf.toString("utf-8");
        estimatedTokens = estimateTokensHeuristic(text, extension);
        contentPreview = text.slice(0, fileSizeConfig.maxContentPreviewBytes);
      } catch {
        estimatedTokens = Math.round(fileSize / 4);
      }
    } else {
      estimatedTokens = Math.round(fileSize / 4);
    }

    if (contentPreview) {
      const contentFlags = detectSecretRisk(relativePath, contentPreview);
      for (const flag of contentFlags) {
        if (!riskFlags.includes(flag)) riskFlags.push(flag);
      }
      if (riskFlags.includes("secret")) {
        excludedBySecret = true;
      }
    }
  }

  const excludedByRisk = classification.riskFlags.some(f =>
    ["lockfile", "build-output", "generated", "large-file", "database-dump", "log-file"].includes(f)
  );

  const included = !excludedByIgnoreOrBinary && !excludedBySecret && !excludedByRisk;

  return {
    path: filePath,
    relativePath,
    extension,
    language: classification.language,
    bytes: fileSize,
    estimatedTokens,
    included,
    excludedReason: getExclusionReason(ignoreResult, classification.isBinary, riskFlags),
    riskFlags,
  };
}

function getExclusionReason(
  ignoreResult: { ignored: boolean; reason?: string },
  isBinary: boolean,
  riskFlags: string[],
): string | undefined {
  if (ignoreResult.ignored) return ignoreResult.reason ?? "ignored";
  if (isBinary) return "binary file";
  if (riskFlags.includes("secret")) return "potential secret file";
  const risk = riskFlags.find(f =>
    ["lockfile", "build-output", "generated", "large-file", "database-dump", "log-file"].includes(f)
  );
  if (risk) return risk.replace("-", " ");
  return undefined;
}

const EXTENSION_TOKEN_MULTIPLIERS: Record<string, number> = {
  ".json": 0.9,
  ".yaml": 0.85,
  ".yml": 0.85,
  ".md": 1.1,
  ".mdx": 1.1,
  ".svg": 1.3,
};

export function estimateTokensHeuristic(text: string, ext?: string): number {
  const charCount = text.length;
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  const charEstimate = Math.ceil(charCount / 4);
  const wordEstimate = Math.ceil(wordCount * 1.3);
  let estimate = Math.max(charEstimate, wordEstimate);
  if (ext) {
    estimate = Math.round(estimate * (EXTENSION_TOKEN_MULTIPLIERS[ext] ?? 1));
  }
  return estimate;
}

function computeFolderStats(files: WorkspaceFileInfo[]): FolderStats[] {
  const folderMap = new Map<string, WorkspaceFileInfo[]>();
  for (const file of files) {
    const folder = path.dirname(file.relativePath).replace(/\\/g, "/");
    const list = folderMap.get(folder) ?? [];
    list.push(file);
    folderMap.set(folder, list);
  }
  const stats: FolderStats[] = [];
  for (const [folderPath, folderFiles] of folderMap) {
    stats.push({
      folderPath,
      totalFiles: folderFiles.length,
      totalBytes: folderFiles.reduce((s, f) => s + f.bytes, 0),
      totalTokens: folderFiles.reduce((s, f) => s + f.estimatedTokens, 0),
      includedFiles: folderFiles.filter(f => f.included).length,
      excludedFiles: folderFiles.filter(f => !f.included).length,
    });
  }
  stats.sort((a, b) => b.totalTokens - a.totalTokens);
  return stats;
}

function computeLanguageBreakdown(files: WorkspaceFileInfo[]): LanguageBreakdown[] {
  const langMap = new Map<string, { count: number; bytes: number; tokens: number }>();
  for (const file of files) {
    const entry = langMap.get(file.language) ?? { count: 0, bytes: 0, tokens: 0 };
    entry.count++;
    entry.bytes += file.bytes;
    entry.tokens += file.estimatedTokens;
    langMap.set(file.language, entry);
  }
  const totalTokens = files.reduce((s, f) => s + f.estimatedTokens, 0);
  const breakdown: LanguageBreakdown[] = [];
  for (const [language, data] of langMap) {
    breakdown.push({
      language,
      fileCount: data.count,
      totalBytes: data.bytes,
      totalTokens: data.tokens,
      percentage: totalTokens > 0 ? data.tokens / totalTokens : 0,
    });
  }
  breakdown.sort((a, b) => b.totalTokens - a.totalTokens);
  return breakdown;
}
