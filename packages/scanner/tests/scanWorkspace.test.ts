import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { scanWorkspace } from "../src/scanWorkspace.js";

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
});

async function tempDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  cleanup.push(directory);
  return directory;
}
