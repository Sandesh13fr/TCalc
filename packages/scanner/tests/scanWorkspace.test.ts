import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, rm, stat, symlink, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { scanWorkspace } from "../src/scanWorkspace.js";
import { SCAN_CACHE_VERSION } from "../src/scanCache.js";

// A set of absolute paths for which stat() should deterministically throw ENOENT.
// Tests that need to simulate a disappearing file add to this set before calling
// scanWorkspace, then clear it in a finally block.
const failStatForPaths = new Set<string>();

vi.mock("node:fs/promises", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...real,
    stat: vi.fn(async (p: Parameters<typeof real.stat>[0], opts?: Parameters<typeof real.stat>[1]) => {
      if (failStatForPaths.has(String(p))) {
        const err = Object.assign(new Error(`ENOENT: no such file or directory, stat '${String(p)}'`), {
          code: "ENOENT",
        });
        throw err;
      }
      return opts !== undefined ? real.stat(p, opts as Parameters<typeof real.stat>[1]) : real.stat(p);
    }),
  };
});

// A set of absolute paths for which stat() should deterministically throw ENOENT.
// Tests that need to simulate a disappearing file add to this set before calling
// scanWorkspace, then clear it in a finally block.
const failStatForPaths = new Set<string>();

vi.mock("node:fs/promises", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...real,
    stat: vi.fn(async (p: Parameters<typeof real.stat>[0], opts?: Parameters<typeof real.stat>[1]) => {
      if (failStatForPaths.has(String(p))) {
        const err = Object.assign(new Error(`ENOENT: no such file or directory, stat '${String(p)}'`), {
          code: "ENOENT",
        });
        throw err;
      }
      return opts !== undefined ? real.stat(p, opts as Parameters<typeof real.stat>[1]) : real.stat(p);
    }),
  };
});

const cleanup: string[] = [];
afterEach(async () => {
  failStatForPaths.clear();
  await Promise.all(cleanup.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("scanWorkspace traversal", () => {
  it("skips symlinks that escape the workspace", async () => {
    const root = await tempDirectory("tcalc-root-");
    const outside = await tempDirectory("tcalc-outside-");
    await writeFile(path.join(root, "inside.ts"), "export const inside = true;");
    await writeFile(path.join(outside, "outside.ts"), "export const outside = true;");
    await symlink(outside, path.join(root, "outside-link"), process.platform === "win32" ? "junction" : "dir");

    const result = await scanWorkspace({ rootPath: root });

    expect(result.files.map((file) => file.relativePath)).toEqual(["inside.ts"]);
    expect(result.warnings).toContain("Skipped symlink outside workspace: outside-link");
  });

  it("stops when cancelled", async () => {
    const root = await tempDirectory("tcalc-cancel-");
    await mkdir(path.join(root, "src"));
    const controller = new AbortController();
    controller.abort();
    await expect(scanWorkspace({ rootPath: root, signal: controller.signal })).rejects.toThrow();
  });

  it("stops symlink cycles", async () => {
    const root = await tempDirectory("tcalc-cycle-");
    const source = path.join(root, "src");
    await mkdir(source);
    await writeFile(path.join(source, "index.ts"), "export const value = 1;");
    await symlink(root, path.join(source, "back"), process.platform === "win32" ? "junction" : "dir");

    const result = await scanWorkspace({ rootPath: root });

    expect(result.files).toHaveLength(1);
    expect(result.warnings.some((warning) => warning.includes("already visited directory"))).toBe(true);
  });

  it("applies ignore rules to symlinked files inside the workspace", async () => {
    const root = await tempDirectory("tcalc-symlink-ignore-");
    const source = path.join(root, "source.txt");
    await writeFile(source, "sensitive workspace content");
    await writeFile(path.join(root, ".gitignore"), "ignored-link.txt\n");
    await symlink(source, path.join(root, "ignored-link.txt"), "file");
    await symlink(source, path.join(root, "included-link.txt"), "file");

    const result = await scanWorkspace({ rootPath: root });

    expect(result.files.map((file) => file.relativePath)).toContain("included-link.txt");
    expect(result.files.map((file) => file.relativePath)).not.toContain("ignored-link.txt");
  });

  it("reports filesystem failures as warnings", async () => {
    const root = await tempDirectory("tcalc-warning-");
    const target = await tempDirectory("tcalc-missing-");
    await symlink(target, path.join(root, "missing-link"), process.platform === "win32" ? "junction" : "dir");
    await rm(target, { recursive: true, force: true });

    const result = await scanWorkspace({ rootPath: root });

    expect(result.warnings.some((warning) => warning.includes("Failed to resolve symlink missing-link"))).toBe(true);
  });

  it("reuses unchanged files from an opt-in persistent cache", async () => {
    const root = await tempDirectory("tcalc-cache-");
    const cacheFile = path.join(root, ".cache", "scan.json");
    const source = path.join(root, "index.ts");
    await writeFile(source, "export const value = 1;");

    const first = await scanWorkspace({ rootPath: root, cacheFile });
    const second = await scanWorkspace({ rootPath: root, cacheFile });
    await writeFile(source, "export const changedValue = 2;");
    const third = await scanWorkspace({ rootPath: root, cacheFile });

    expect(first.cacheHits).toBe(0);
    expect(second.cacheHits).toBe(1);
    expect(second.totalFiles).toBe(first.totalFiles);
    expect(second.files.some((file) => file.path === cacheFile)).toBe(false);
    expect(third.cacheMisses).toBeGreaterThan(0);
  });

  it("rebuilds version 2 caches so stale SQL dump flags do not survive upgrades", async () => {
    const root = await tempDirectory("tcalc-cache-sql-upgrade-");
    const cacheFile = path.join(root, ".cache", "scan.json");
    const source = path.join(root, "query.sql");
    await writeFile(source, "SELECT id FROM users;");
    const sourceStat = await stat(source);
    await mkdir(path.dirname(cacheFile), { recursive: true });
    await writeFile(cacheFile, JSON.stringify({
      version: 2,
      tokenizerKey: "heuristic-v1",
      files: {
        "query.sql": {
          bytes: sourceStat.size,
          mtimeMs: sourceStat.mtimeMs,
          estimatedTokens: 1,
          riskFlags: ["database-dump"],
        },
      },
    }));

    const result = await scanWorkspace({ rootPath: root, cacheFile });
    const query = result.files.find((file) => file.relativePath === "query.sql");
    const rebuiltCache = JSON.parse(await readFile(cacheFile, "utf8")) as { version: number };

    expect(result.cacheHits).toBe(0);
    expect(query?.riskFlags).not.toContain("database-dump");
    expect(query?.included).toBe(true);
    expect(rebuiltCache.version).toBe(3);
  });

  it("uses an optional provider tokenizer in the scan path", async () => {
    const root = await tempDirectory("tcalc-tokenizer-");
    await writeFile(path.join(root, "index.ts"), "export const value = 1;");
    const result = await scanWorkspace({
      rootPath: root,
      tokenizer: { id: "test", provider: "openai", estimate: () => 7 },
    });
    expect(result.files[0].estimatedTokens).toBe(7);
  });

  it("skips a file that disappears between discovery and stat, without aborting the scan", async () => {
    const root = await tempDirectory("tcalc-disappear-");

    // Create two files: one that will persist and one that will "vanish".
    await writeFile(path.join(root, "surviving.ts"), "export const alive = true;");
    const deletedAbsPath = path.join(root, "deleted.ts");
    await writeFile(deletedAbsPath, "export const gone = true;");

    // Deterministically simulate the file disappearing between walkFiles (which
    // uses readdir, not stat) and scanSingleFile (which calls stat).  The module
    // mock intercepts the stat call and throws ENOENT for the target path.
    failStatForPaths.add(deletedAbsPath);

    const result = await scanWorkspace({ rootPath: root });

    // The disappeared file must NOT appear in the scan result.
    expect(result.files.some((f) => f.relativePath === "deleted.ts")).toBe(false);

    // The disappeared file must NOT appear as a zero-byte entry (the old buggy behavior).
    expect(result.files.some((f) => f.relativePath === "deleted.ts" && f.bytes === 0)).toBe(false);

    // A warning must be emitted for the disappeared file.
    expect(result.warnings.some((w) => w.includes("deleted.ts"))).toBe(true);

    // The surviving file must still be scanned successfully.
    expect(result.files.some((f) => f.relativePath === "surviving.ts")).toBe(true);

    // Only the surviving file contributes to the total file count.
    expect(result.totalFiles).toBe(1);
  });

  it("excludes generated assets outside build directories from the workspace total", async () => {
    const root = await tempDirectory("tcalc-generated-");
    const source = path.join(root, "src");
    await mkdir(source);
    await writeFile(path.join(source, "index.ts"), "export const value = 1;");
    await writeFile(path.join(source, "vendor.min.js"), `${"a".repeat(2000)};`);

    const result = await scanWorkspace({ rootPath: root });

    const vendor = result.files.find((file) => file.relativePath === "src/vendor.min.js");
    const index = result.files.find((file) => file.relativePath === "src/index.ts");
    expect(vendor?.riskFlags).toContain("generated");
    expect(vendor?.included).toBe(false);
    expect(vendor?.estimatedTokens).toBeGreaterThan(0);
    expect(result.includedTokens).toBe(index?.estimatedTokens);
  });

  it("discards legacy v1 caches so post-4KB secrets are rescanned and excluded", async () => {
    const root = await tempDirectory("tcalc-legacy-cache-");
    const fileName = "late-secret.ts";
    const filePath = path.join(root, fileName);
    const content = `${"a".repeat(5000)}\napi_key = "12345678901234567890"\n`;
    await writeFile(filePath, content);
    const fileStat = await stat(filePath);
    const cacheFile = path.join(root, ".cache", "scan.json");
    await mkdir(path.dirname(cacheFile), { recursive: true });
    // Legacy preview-only cache entry: same bytes/mtime but no secret flag.
    const legacy = {
      version: 1,
      tokenizerKey: "heuristic-v1",
      files: {
        [fileName]: {
          bytes: Number(fileStat.size),
          mtimeMs: fileStat.mtimeMs,
          estimatedTokens: 10,
          riskFlags: [],
        },
      },
    };
    await writeFile(cacheFile, JSON.stringify(legacy), "utf8");

    const result = await scanWorkspace({ rootPath: root, cacheFile });

    const scanned = result.files.find((f) => f.relativePath === fileName);
    expect(scanned).toBeDefined();
    expect(scanned!.riskFlags).toContain("secret");
    expect(scanned!.included).toBe(false);
    // Legacy entry must not be reused as a cache hit.
    expect(result.cacheHits ?? 0).toBe(0);
    const persisted = JSON.parse(await readFile(cacheFile, "utf8"));
  });


  it("skips a file that disappears between discovery and stat, without aborting the scan", async () => {
    const root = await tempDirectory("tcalc-disappear-");

    // Create two files: one that will persist and one that will "vanish".
    await writeFile(path.join(root, "surviving.ts"), "export const alive = true;");
    const deletedAbsPath = path.join(root, "deleted.ts");
    await writeFile(deletedAbsPath, "export const gone = true;");

    // Deterministically simulate the file disappearing between walkFiles (which
    // uses readdir, not stat) and scanSingleFile (which calls stat).  The module
    // mock intercepts the stat call and throws ENOENT for the target path.
    failStatForPaths.add(deletedAbsPath);

    const result = await scanWorkspace({ rootPath: root });

    // The disappeared file must NOT appear in the scan result.
    expect(result.files.some((f) => f.relativePath === "deleted.ts")).toBe(false);

    // The disappeared file must NOT appear as a zero-byte entry (the old buggy behavior).
    expect(result.files.some((f) => f.relativePath === "deleted.ts" && f.bytes === 0)).toBe(false);

    // A warning must be emitted for the disappeared file.
    expect(result.warnings.some((w) => w.includes("deleted.ts"))).toBe(true);

    // The surviving file must still be scanned successfully.
    expect(result.files.some((f) => f.relativePath === "surviving.ts")).toBe(true);

    // Only the surviving file contributes to the total file count.
    expect(result.totalFiles).toBe(1);
  });
});

async function tempDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  cleanup.push(directory);
  return directory;
}
