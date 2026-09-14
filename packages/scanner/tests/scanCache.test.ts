import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadScanCache, saveScanCache, type ScanCacheEntry } from "../src/scanCache.js";

const cleanup: string[] = [];

afterEach(async () => Promise.all(cleanup.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))));

async function tempDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  cleanup.push(directory);
  return directory;
}

function entry(bytes: number): ScanCacheEntry {
  return { bytes, mtimeMs: bytes, estimatedTokens: bytes, riskFlags: [] };
}

describe("scan cache persistence", () => {
  it("saves and loads a complete cache", async () => {
    const root = await tempDirectory("tcalc-scan-cache-");
    const cacheFile = path.join(root, "cache", "scan.json");
    const files = new Map<string, ScanCacheEntry>([["src/index.ts", entry(42)]]);

    await saveScanCache(cacheFile, "tokenizer-v1", files);

    const loaded = await loadScanCache(cacheFile, "tokenizer-v1");
    expect(loaded).toEqual(files);
  });

  it("uses collision-free temporary files for concurrent saves", async () => {
    const root = await tempDirectory("tcalc-scan-cache-concurrent-");
    const cacheFile = path.join(root, "cache", "scan.json");

    await Promise.all([
      saveScanCache(cacheFile, "tokenizer-v1", new Map([["a.ts", entry(1)]])),
      saveScanCache(cacheFile, "tokenizer-v1", new Map([["b.ts", entry(2)]])),
    ]);

    const loaded = await loadScanCache(cacheFile, "tokenizer-v1");
    expect([["a.ts"], ["b.ts"]]).toContainEqual([...loaded.keys()]);
    expect((await readdir(path.dirname(cacheFile))).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  it("cleans up the temporary file and preserves the destination when replacement fails", async () => {
    const root = await tempDirectory("tcalc-scan-cache-failure-");
    const cacheFile = path.join(root, "cache", "scan.json");
    await mkdir(cacheFile, { recursive: true });

    await expect(saveScanCache(cacheFile, "tokenizer-v1", new Map([["a.ts", entry(1)]]))).rejects.toThrow();

    expect((await readdir(path.dirname(cacheFile))).filter((name) => name.endsWith(".tmp"))).toEqual([]);
    expect(await readdir(cacheFile)).toEqual([]);
  });

  it("treats corrupt cache content as a cache miss", async () => {
    const root = await tempDirectory("tcalc-scan-cache-corrupt-");
    const cacheFile = path.join(root, "cache", "scan.json");
    await mkdir(cacheFile, { recursive: true });

    const loaded = await loadScanCache(cacheFile, "tokenizer-v1");
    expect(loaded.size).toBe(0);
  });
});
