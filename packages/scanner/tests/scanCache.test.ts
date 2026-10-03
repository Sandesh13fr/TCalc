import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadScanCache, saveScanCache, type ScanCacheEntry } from "../src/scanCache.js";

const roots: string[] = [];

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "tcalc-scan-cache-"));
  roots.push(root);
  return root;
}

function entry(bytes: number): ScanCacheEntry {
  return { bytes, mtimeMs: bytes * 10, estimatedTokens: bytes * 2, riskFlags: [] };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("scan cache persistence", () => {
  it("saves and reloads cache entries", async () => {
    const root = await temporaryRoot();
    const cacheFile = path.join(root, "cache.json");
    const files = new Map([["src/index.ts", entry(42)]]);

    await saveScanCache(cacheFile, "tok-v1", files);

    expect(await loadScanCache(cacheFile, "tok-v1")).toEqual(files);
  });

  it("treats corrupt cache content as a cache miss", async () => {
    const root = await temporaryRoot();
    const cacheFile = path.join(root, "cache.json");
    await writeFile(cacheFile, "{not-json", "utf8");

    expect(await loadScanCache(cacheFile, "tok-v1")).toEqual(new Map());
  });

  it("treats a tokenizer mismatch as a cache miss", async () => {
    const root = await temporaryRoot();
    const cacheFile = path.join(root, "cache.json");
    await saveScanCache(cacheFile, "tok-v1", new Map([["a.ts", entry(1)]]));

    expect(await loadScanCache(cacheFile, "tok-v2")).toEqual(new Map());
  });

  it("supports overlapping saves without sharing a temporary path", async () => {
    const root = await temporaryRoot();
    const cacheFile = path.join(root, "cache.json");
    const first = new Map([["first.ts", entry(1)]]);
    const second = new Map([["second.ts", entry(2)]]);

    await Promise.all([
      saveScanCache(cacheFile, "tok-v1", first),
      saveScanCache(cacheFile, "tok-v1", second),
    ]);

    const persisted = JSON.parse(await readFile(cacheFile, "utf8")) as { files: Record<string, ScanCacheEntry> };
    const keys = Object.keys(persisted.files);
    expect(keys === undefined).toBe(false);
    expect(["first.ts", "second.ts"]).toContain(keys[0]);
    expect((await readdir(root)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });
});
