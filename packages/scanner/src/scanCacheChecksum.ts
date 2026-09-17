import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { ScanCacheEntry } from "./scanCache.js";

export type CacheVerificationStrategy = "mtime-only" | "checksum-only" | "hybrid";

export type CacheHitMethod = "none" | "mtime" | "checksum";

export interface CacheLookupResult {
  hit: boolean;
  method: CacheHitMethod;
  entry?: ScanCacheEntry;
}

export interface ScanCacheTelemetry {
  lookups: number;
  hitsByMtime: number;
  hitsByChecksum: number;
  misses: number;
  tokensSaved: number;
}

export function computeContentChecksum(content: Buffer | Uint8Array | string): string {
  const hash = createHash("sha256");
  if (typeof content === "string") {
    hash.update(content, "utf8");
  } else {
    hash.update(content);
  }
  return hash.digest("hex").slice(0, 32); // 128-bit truncated hex string for compact storage
}

export async function computeFileChecksum(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return computeContentChecksum(buffer);
}

export function verifyCacheEntry(
  entry: ScanCacheEntry | undefined,
  currentSize: number,
  currentMtimeMs: number,
  contentBuffer?: Buffer | string,
  strategy: CacheVerificationStrategy = "hybrid",
): CacheLookupResult {
  if (!entry) {
    return { hit: false, method: "none" };
  }

  // Size mismatch is an immediate disqualifier
  if (entry.bytes !== currentSize) {
    return { hit: false, method: "none" };
  }

  // Check mtime-only strategy
  if (strategy === "mtime-only") {
    if (entry.mtimeMs === currentMtimeMs) {
      return { hit: true, method: "mtime", entry };
    }
    return { hit: false, method: "none" };
  }

  // Check hybrid strategy: fast path mtime
  if (strategy === "hybrid" && entry.mtimeMs === currentMtimeMs) {
    return { hit: true, method: "mtime", entry };
  }

  // Fall back to content checksum check if contentBuffer is available and entry has a checksum
  if (contentBuffer !== undefined && entry.checksum) {
    const currentChecksum = computeContentChecksum(contentBuffer);
    if (currentChecksum === entry.checksum) {
      return { hit: true, method: "checksum", entry };
    }
  }

  return { hit: false, method: "none" };
}

export class ScanCacheManager {
  private cache: Map<string, ScanCacheEntry>;
  private strategy: CacheVerificationStrategy;
  private telemetry: ScanCacheTelemetry;

  constructor(
    initialEntries?: Map<string, ScanCacheEntry>,
    strategy: CacheVerificationStrategy = "hybrid",
  ) {
    this.cache = initialEntries ? new Map(initialEntries) : new Map();
    this.strategy = strategy;
    this.telemetry = {
      lookups: 0,
      hitsByMtime: 0,
      hitsByChecksum: 0,
      misses: 0,
      tokensSaved: 0,
    };
  }

  getEntries(): Map<string, ScanCacheEntry> {
    return this.cache;
  }

  getTelemetry(): ScanCacheTelemetry {
    return { ...this.telemetry };
  }

  lookup(
    relativePath: string,
    fileSize: number,
    mtimeMs: number,
    contentBuffer?: Buffer | string,
  ): CacheLookupResult {
    this.telemetry.lookups++;
    const entry = this.cache.get(relativePath);
    const result = verifyCacheEntry(entry, fileSize, mtimeMs, contentBuffer, this.strategy);

    if (result.hit) {
      if (result.method === "mtime") {
        this.telemetry.hitsByMtime++;
      } else if (result.method === "checksum") {
        this.telemetry.hitsByChecksum++;
      }
      if (result.entry) {
        this.telemetry.tokensSaved += result.entry.estimatedTokens;
      }
    } else {
      this.telemetry.misses++;
    }

    return result;
  }

  record(relativePath: string, entry: ScanCacheEntry): void {
    this.cache.set(relativePath, entry);
  }

  createEntry(
    bytes: number,
    mtimeMs: number,
    estimatedTokens: number,
    riskFlags: ScanCacheEntry["riskFlags"],
    content?: Buffer | string,
  ): ScanCacheEntry {
    const checksum = content ? computeContentChecksum(content) : undefined;
    return {
      bytes,
      mtimeMs,
      estimatedTokens,
      riskFlags,
      checksum,
    };
  }

  clear(): void {
    this.cache.clear();
    this.telemetry = {
      lookups: 0,
      hitsByMtime: 0,
      hitsByChecksum: 0,
      misses: 0,
      tokensSaved: 0,
    };
  }
}
