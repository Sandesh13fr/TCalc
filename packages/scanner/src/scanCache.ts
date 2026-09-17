import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RiskFlag } from "@wma/core";

export interface ScanCacheEntry {
  bytes: number;
  mtimeMs: number;
  estimatedTokens: number;
  riskFlags: RiskFlag[];
  checksum?: string;
}

interface ScanCacheFile {
  version: number;
  tokenizerKey: string;
  files: Record<string, ScanCacheEntry>;
}

export const SCAN_CACHE_VERSION = 3;

export async function loadScanCache(
  cacheFile: string | undefined,
  tokenizerKey: string,
): Promise<Map<string, ScanCacheEntry>> {
  if (!cacheFile) return new Map();
  try {
    const parsed = JSON.parse(await readFile(cacheFile, "utf8")) as ScanCacheFile;
    // Version 1 caches were produced by preview-only secret detection and may
    // mark files with post-4KB secrets as included. Discard them.
    // Versions 2 and 3 are supported (v2 entries will have undefined checksum).
    if (
      (parsed.version !== 2 && parsed.version !== SCAN_CACHE_VERSION) ||
      parsed.tokenizerKey !== tokenizerKey ||
      !parsed.files
    ) {
      return new Map();
    }
    return new Map(Object.entries(parsed.files));
  } catch {
    return new Map();
  }
}

export async function saveScanCache(
  cacheFile: string | undefined,
  tokenizerKey: string,
  files: Map<string, ScanCacheEntry>,
): Promise<void> {
  if (!cacheFile) return;
  await mkdir(path.dirname(cacheFile), { recursive: true });
  const temporary = `${cacheFile}.${process.pid}.tmp`;
  const payload: ScanCacheFile = {
    version: SCAN_CACHE_VERSION,
    tokenizerKey,
    files: Object.fromEntries(files),
  };
  await writeFile(temporary, JSON.stringify(payload), "utf8");
  await rename(temporary, cacheFile).catch(async () => {
    await writeFile(cacheFile, JSON.stringify(payload), "utf8");
    await rm(temporary, { force: true });
  });
}
