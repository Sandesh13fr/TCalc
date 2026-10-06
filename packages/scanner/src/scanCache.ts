import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { RiskFlag } from "@wma/core";

export interface ScanCacheEntry {
  bytes: number;
  mtimeMs: number;
  estimatedTokens: number;
  riskFlags: RiskFlag[];
}

interface ScanCacheFile {
  version: 3;
  tokenizerKey: string;
  files: Record<string, ScanCacheEntry>;
}

export const SCAN_CACHE_VERSION = 3;

export async function loadScanCache(cacheFile: string | undefined, tokenizerKey: string): Promise<Map<string, ScanCacheEntry>> {
  if (!cacheFile) return new Map();
  try {
    const parsed = JSON.parse(await readFile(cacheFile, "utf8")) as ScanCacheFile;
    // Older caches may contain preview-only secret results or the former
    // extension-only SQL dump classification. Discard them so unchanged
    // files are classified against the current rules after upgrade.
    if (parsed.version !== SCAN_CACHE_VERSION || parsed.tokenizerKey !== tokenizerKey || !parsed.files) return new Map();
    return new Map(Object.entries(parsed.files));
  } catch {
    return new Map();
  }
}

export async function saveScanCache(cacheFile: string | undefined, tokenizerKey: string, files: Map<string, ScanCacheEntry>): Promise<void> {
  if (!cacheFile) return;
  await mkdir(path.dirname(cacheFile), { recursive: true });
  const temporary = `${cacheFile}.${process.pid}.${randomUUID()}.tmp`;
  const payload: ScanCacheFile = { version: SCAN_CACHE_VERSION, tokenizerKey, files: Object.fromEntries(files) };

  try {
    await writeFile(temporary, JSON.stringify(payload), "utf8");
    await rename(temporary, cacheFile);
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}
