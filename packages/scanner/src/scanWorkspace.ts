import { readdir, stat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_FILE_SIZE_CONFIG, type WorkspaceFileInfo, type WorkspaceScanResult, type FolderStats, type LanguageBreakdown } from "@wma/core";
import { estimateFileTokens, estimateProviderTokens, estimateTokensFromBytes, type ProviderTokenizer } from "@wma/tokenizers";
import { IgnoreResolver, type IgnoreResolverOptions } from "./ignoreResolver.js";
import { classifyFile, detectSecretRisk } from "./classifyFile.js";
import { loadScanCache, saveScanCache, type ScanCacheEntry } from "./scanCache.js";

const CONCURRENCY_LIMIT = 10;

export interface ScanOptions extends IgnoreResolverOptions {
  rootPath: string;
  signal?: AbortSignal;
  cacheFile?: string;
  tokenizer?: ProviderTokenizer;
  tokenizerModel?: string;
}

interface ScannedFile {
  info: WorkspaceFileInfo;
  cacheEntry: ScanCacheEntry;
  cacheHit: boolean;
}

interface WalkContext {
  rootRealPath: string;
  visited: Set<string>;
  skipRelativePaths: Set<string>;
  warnings: string[];
  signal?: AbortSignal;
}

export async function scanWorkspace(options: ScanOptions): Promise<WorkspaceScanResult> {
  const { rootPath } = options;
  const warnings: string[] = [];
  const cacheRelativePath = options.cacheFile ? path.relative(rootPath, options.cacheFile).replace(/\\/g, "/") : undefined;
  const cacheExclude = cacheRelativePath && !cacheRelativePath.startsWith("../") && !path.isAbsolute(cacheRelativePath) ? [cacheRelativePath] : [];
  const resolver = await resolveIgnoreRules(rootPath, {
    ...options,
    userExcludePatterns: [...(options.userExcludePatterns ?? []), ...cacheExclude],
    onWarning: (warning) => {
      warnings.push(warning);
      options.onWarning?.(warning);
    },
  });

  const allFiles: WorkspaceFileInfo[] = [];
  const tokenizerKey = options.tokenizer ? `${options.tokenizer.provider}:${options.tokenizer.id}:${options.tokenizerModel ?? ""}` : "heuristic-v1";
  const cache = await loadScanCache(options.cacheFile, tokenizerKey);
  const nextCache = new Map<string, ScanCacheEntry>();
  let cacheHits = 0;
  let cacheMisses = 0;
  const filePaths = await walkFiles(rootPath, rootPath, resolver, {
    rootRealPath: await realpath(rootPath),
    visited: new Set(),
    skipRelativePaths: new Set(cacheExclude),
    warnings,
    signal: options.signal,
  });

  for (let i = 0; i < filePaths.length; i += CONCURRENCY_LIMIT) {
    options.signal?.throwIfAborted();
    const chunk = filePaths.slice(i, i + CONCURRENCY_LIMIT);
    const results = await Promise.all(chunk.map(filePath => scanSingleFile(rootPath, filePath, resolver, warnings, cache, options)));
    for (const result of results) {
      allFiles.push(result.info);
      nextCache.set(result.info.relativePath, result.cacheEntry);
      if (result.cacheHit) cacheHits++;
      else cacheMisses++;
    }
  }

  try {
    await saveScanCache(options.cacheFile, tokenizerKey, nextCache);
  } catch (error) {
    warnings.push(`Failed to write scan cache: ${errorMessage(error)}`);
  }

  allFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  if (allFiles.length === 0) {
    warnings.push("No files found in workspace");
  }
  warnings.sort();

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
    ...(options.cacheFile ? { cacheHits, cacheMisses } : {}),
  };
}

export async function walkFiles(rootPath: string, currentPath: string, resolver: IgnoreResolver, context?: WalkContext): Promise<string[]> {
  const state = context ?? {
    rootRealPath: await realpath(rootPath),
    visited: new Set<string>(),
    skipRelativePaths: new Set<string>(),
    warnings: [],
  };
  state.signal?.throwIfAborted();
  const results: string[] = [];
  let currentRealPath: string;
  try {
    currentRealPath = await realpath(currentPath);
  } catch (error) {
    state.warnings.push(`Failed to resolve ${relativeDisplay(rootPath, currentPath)}: ${errorMessage(error)}`);
    return results;
  }
  if (!isWithinRoot(state.rootRealPath, currentRealPath)) {
    state.warnings.push(`Skipped path outside workspace: ${relativeDisplay(rootPath, currentPath)}`);
    return results;
  }
  if (state.visited.has(currentRealPath)) {
    state.warnings.push(`Skipped already visited directory: ${relativeDisplay(rootPath, currentPath)}`);
    return results;
  }
  state.visited.add(currentRealPath);

  let entries;
  try {
    entries = await readdir(currentPath, { withFileTypes: true });
  } catch (error) {
    state.warnings.push(`Failed to read directory ${relativeDisplay(rootPath, currentPath)}: ${errorMessage(error)}`);
    return results;
  }
  for (const entry of entries) {
    state.signal?.throwIfAborted();
    const fullPath = path.join(currentPath, entry.name);
    const entryName = entry.name;
    if (entryName === ".git" || entryName === ".svn" || entryName === ".hg") continue;
    const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, "/");
    if (state.skipRelativePaths.has(relativePath)) continue;

    if (entry.isSymbolicLink()) {
      try {
        const targetRealPath = await realpath(fullPath);
        if (!isWithinRoot(state.rootRealPath, targetRealPath)) {
          state.warnings.push(`Skipped symlink outside workspace: ${relativePath}`);
          continue;
        }
        const targetStat = await stat(fullPath);
        if (targetStat.isDirectory()) {
          if (!resolver.shouldIgnore(relativePath + "/", 0).ignored) {
            results.push(...await walkFiles(rootPath, fullPath, resolver, state));
          }
        } else if (targetStat.isFile()) {
          results.push(fullPath);
        }
      } catch (error) {
        state.warnings.push(`Failed to resolve symlink ${relativePath}: ${errorMessage(error)}`);
      }
    } else if (entry.isDirectory()) {
      if (resolver.shouldIgnore(relativePath + "/", 0).ignored) continue;
      const subResults = await walkFiles(rootPath, fullPath, resolver, state);
      results.push(...subResults);
    } else if (entry.isFile()) {
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
  warnings: string[],
  cache: Map<string, ScanCacheEntry>,
  options: ScanOptions,
): Promise<ScannedFile> {
  const signal = options.signal;
  signal?.throwIfAborted();
  let entryStat;
  try {
    entryStat = await stat(filePath);
  } catch (error) {
    warnings.push(`Failed to stat ${path.relative(rootPath, filePath)}: ${errorMessage(error)}`);
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
  const cached = cache.get(relativePath);
  let cacheHit = false;

  if (!excludedByIgnoreOrBinary && entryStat && fileSize > 0) {
    if (cached && cached.bytes === fileSize && cached.mtimeMs === entryStat.mtimeMs) {
      estimatedTokens = cached.estimatedTokens;
      for (const flag of cached.riskFlags) if (!riskFlags.includes(flag)) riskFlags.push(flag);
      excludedBySecret = riskFlags.includes("secret");
      cacheHit = true;
    } else if (fileSize <= fileSizeConfig.maxTextFileBytes) {
      try {
        const buf = await readFile(filePath, { signal });
        const text = buf.toString("utf-8");
        estimatedTokens = options.tokenizer
          ? estimateProviderTokens(text, options.tokenizer, options.tokenizerModel, (value) => estimateFileTokens(value, relativePath)).tokens
          : estimateFileTokens(text, relativePath);
        contentPreview = text.slice(0, fileSizeConfig.maxContentPreviewBytes);
      } catch (error) {
        if (signal?.aborted) signal.throwIfAborted();
        warnings.push(`Failed to read ${relativePath}: ${errorMessage(error)}`);
        estimatedTokens = estimateTokensFromBytes(fileSize);
      }
    } else {
      estimatedTokens = estimateTokensFromBytes(fileSize);
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
    info: {
      path: filePath,
      relativePath,
      extension,
      language: classification.language,
      bytes: fileSize,
      estimatedTokens,
      included,
      excludedReason: getExclusionReason(ignoreResult, classification.isBinary, riskFlags),
      riskFlags,
    },
    cacheEntry: {
      bytes: fileSize,
      mtimeMs: entryStat?.mtimeMs ?? 0,
      estimatedTokens,
      riskFlags,
    },
    cacheHit,
  };
}

function isWithinRoot(rootPath: string, targetPath: string): boolean {
  const relative = path.relative(rootPath, targetPath);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function relativeDisplay(rootPath: string, targetPath: string): string {
  return path.relative(rootPath, targetPath).replace(/\\/g, "/") || ".";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
