import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  computeContentChecksum,
  verifyCacheEntry,
  ScanCacheManager,
} from "../src/scanCacheChecksum.js";
import { loadScanCache, saveScanCache, SCAN_CACHE_VERSION } from "../src/scanCache.js";
import type { ScanCacheEntry } from "../src/scanCache.js";

describe("computeContentChecksum", () => {
  it("produces deterministic 32-char hex digest for strings and buffers", () => {
    const text = "export const answer = 42;";
    const hash1 = computeContentChecksum(text);
    const hash2 = computeContentChecksum(Buffer.from(text, "utf8"));

    expect(hash1).toHaveLength(32);
    expect(hash1).toBe(hash2);
  });

  it("changes digest when content is altered", () => {
    const hashA = computeContentChecksum("console.log('alpha');");
    const hashB = computeContentChecksum("console.log('beta');");

    expect(hashA).not.toBe(hashB);
  });
});

describe("verifyCacheEntry", () => {
  const content = "function hello() { return 'world'; }";
  const checksum = computeContentChecksum(content);

  const entry: ScanCacheEntry = {
    bytes: content.length,
    mtimeMs: 1000000,
    estimatedTokens: 12,
    riskFlags: [],
    checksum,
  };

  it("yields mtime hit when size and mtime match exactly", () => {
    const result = verifyCacheEntry(entry, content.length, 1000000);
    expect(result.hit).toBe(true);
    expect(result.method).toBe("mtime");
    expect(result.entry).toBe(entry);
  });

  it("yields checksum hit when mtime changed but content checksum is identical (git checkout scenario)", () => {
    const result = verifyCacheEntry(entry, content.length, 2000000, content, "hybrid");
    expect(result.hit).toBe(true);
    expect(result.method).toBe("checksum");
  });

  it("fails verification when file size changes", () => {
    const result = verifyCacheEntry(entry, content.length + 5, 1000000);
    expect(result.hit).toBe(false);
    expect(result.method).toBe("none");
  });

  it("fails verification when content differs even if length matches", () => {
    const differentContent = "function dummy() { return 'world'; }"; // same length
    const result = verifyCacheEntry(entry, differentContent.length, 2000000, differentContent, "hybrid");
    expect(result.hit).toBe(false);
    expect(result.method).toBe("none");
  });

  it("strictly enforces mtime-only strategy when specified", () => {
    const result = verifyCacheEntry(entry, content.length, 2000000, content, "mtime-only");
    expect(result.hit).toBe(false);
  });
});

describe("ScanCacheManager", () => {
  it("tracks telemetry across multiple lookups", () => {
    const manager = new ScanCacheManager();
    const content = "const x = 100;";
    const entry = manager.createEntry(content.length, 5000, 5, [], content);

    manager.record("src/fileA.ts", entry);

    // Hit via mtime
    const lookup1 = manager.lookup("src/fileA.ts", content.length, 5000);
    expect(lookup1.hit).toBe(true);
    expect(lookup1.method).toBe("mtime");

    // Hit via checksum (simulating checkout touch)
    const lookup2 = manager.lookup("src/fileA.ts", content.length, 9000, content);
    expect(lookup2.hit).toBe(true);
    expect(lookup2.method).toBe("checksum");

    // Miss (unknown file)
    const lookup3 = manager.lookup("src/fileB.ts", 10, 1000);
    expect(lookup3.hit).toBe(false);

    const telemetry = manager.getTelemetry();
    expect(telemetry.lookups).toBe(3);
    expect(telemetry.hitsByMtime).toBe(1);
    expect(telemetry.hitsByChecksum).toBe(1);
    expect(telemetry.misses).toBe(1);
    expect(telemetry.tokensSaved).toBe(10); // 5 tokens * 2 hits
  });
});

describe("loadScanCache & saveScanCache persistence", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "wma-cache-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("persists and reloads v3 cache with checksums", async () => {
    const cacheFile = path.join(tempDir, ".wma-cache.json");
    const map = new Map<string, ScanCacheEntry>();
    map.set("src/index.ts", {
      bytes: 120,
      mtimeMs: 123456,
      estimatedTokens: 30,
      riskFlags: [],
      checksum: "abc123def456789012345678901234ab",
    });

    await saveScanCache(cacheFile, "heuristic-v1", map);
    const loaded = await loadScanCache(cacheFile, "heuristic-v1");

    expect(loaded.size).toBe(1);
    const entry = loaded.get("src/index.ts");
    expect(entry?.bytes).toBe(120);
    expect(entry?.checksum).toBe("abc123def456789012345678901234ab");
  });

  it("loads v2 cache entries gracefully for backward compatibility", async () => {
    const cacheFile = path.join(tempDir, ".wma-cache-v2.json");
    const v2Payload = {
      version: 2,
      tokenizerKey: "heuristic-v1",
      files: {
        "legacy.ts": {
          bytes: 80,
          mtimeMs: 9999,
          estimatedTokens: 20,
          riskFlags: [],
        },
      },
    };
    await writeFile(cacheFile, JSON.stringify(v2Payload), "utf8");

    const loaded = await loadScanCache(cacheFile, "heuristic-v1");
    expect(loaded.size).toBe(1);
    expect(loaded.get("legacy.ts")?.estimatedTokens).toBe(20);
    expect(loaded.get("legacy.ts")?.checksum).toBeUndefined();
  });

  it("discards cache if tokenizer key differs", async () => {
    const cacheFile = path.join(tempDir, ".wma-cache.json");
    const map = new Map<string, ScanCacheEntry>();
    map.set("a.ts", { bytes: 10, mtimeMs: 10, estimatedTokens: 2, riskFlags: [] });

    await saveScanCache(cacheFile, "heuristic-v1", map);
    const loaded = await loadScanCache(cacheFile, "cl100k_base");
    expect(loaded.size).toBe(0);
  });
});
