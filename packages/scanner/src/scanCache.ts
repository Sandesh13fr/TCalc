import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RiskFlag } from "@wma/core";

export interface ScanCacheEntry {
  bytes: number;
  mtimeMs: number;
  estimatedTokens: number;
  riskFlags: RiskFlag[];
}

interface ScanCacheFile {
  version: 2;
  tokenizerKey: string;
  files: Record<string, ScanCacheEntry>;
}

export const SCAN_CACHE_VERSION = 2;

export interface ScanCacheFileOperations {
  rename(source: string, destination: string): Promise<void>;
}

const defaultOperations: ScanCacheFileOperations = { rename };

export async function loadScanCache(cacheFile: string | undefined, tokenizerKey: string): Promise<Map<string, ScanCacheEntry>> {
  if (!cacheFile) return new Map();
  try {
    const parsed = JSON.parse(await readFile(cacheFile, "utf8")) as ScanCacheFile;
    // Version 1 caches were produced by preview-only secret detection and may
    // mark files with post-4KB secrets as included. Discard them so every
    // unchanged file receives one full-text scan after upgrade.
    if (parsed.version !== SCAN_CACHE_VERSION || parsed.tokenizerKey !== tokenizerKey || !parsed.files) return new Map();
    return new Map(Object.entries(parsed.files));
  } catch {
    return new Map();
  }
}

export async function saveScanCache(
  cacheFile: string | undefined,
  tokenizerKey: string,
  files: Map<string, ScanCacheEntry>,
  operations: ScanCacheFileOperations = defaultOperations,
): Promise<void> {
  if (!cacheFile) return;
  await mkdir(path.dirname(cacheFile), { recursive: true });
  const temporary = `${cacheFile}.${process.pid}.${randomUUID()}.tmp`;
  const payload: ScanCacheFile = { version: SCAN_CACHE_VERSION, tokenizerKey, files: Object.fromEntries(files) };

  try {
    await writeFile(temporary, JSON.stringify(payload), "utf8");
    await operations.rename(temporary, cacheFile);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}
