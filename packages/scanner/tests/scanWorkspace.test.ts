import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, stat, symlink, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { scanWorkspace } from "../src/scanWorkspace.js";
import { SCAN_CACHE_VERSION } from "../src/scanCache.js";

const cleanup: string[] = [];
afterEach(async () => Promise.all(cleanup.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))));

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

  it("uses an optional provider tokenizer in the scan path", async () => {
    const root = await tempDirectory("tcalc-tokenizer-");
    await writeFile(path.join(root, "index.ts"), "export const value = 1;");
    const result = await scanWorkspace({
      rootPath: root,
      tokenizer: { id: "test", provider: "openai", estimate: () => 7 },
    });
    expect(result.files[0].estimatedTokens).toBe(7);
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
    expect(persisted.version).toBe(SCAN_CACHE_VERSION);
  });
});

async function tempDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  cleanup.push(directory);
  return directory;
}
