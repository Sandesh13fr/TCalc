import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { IgnoreResolver } from "../src/ignoreResolver.js";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("IgnoreResolver", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "wma-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should load .gitignore patterns and respect them", async () => {
    writeFileSync(join(tmpDir, ".gitignore"), "*.log\nnode_modules/\n");
    const resolver = new IgnoreResolver();
    await resolver.loadIgnoreFiles(tmpDir);
    expect(resolver.shouldIgnore("test.log", 100).ignored).toBe(true);
    expect(resolver.shouldIgnore("node_modules/foo.js", 100).ignored).toBe(true);
    expect(resolver.shouldIgnore("src/index.js", 100).ignored).toBe(false);
  });

  it("should respect user exclude patterns", async () => {
    const resolver = new IgnoreResolver({ userExcludePatterns: ["*.log", "temp/"] });
    await resolver.loadIgnoreFiles(tmpDir);
    expect(resolver.shouldIgnore("debug.log", 100).ignored).toBe(true);
    expect(resolver.shouldIgnore("temp/foo.txt", 100).ignored).toBe(true);
    expect(resolver.shouldIgnore("src/index.js", 100).ignored).toBe(false);
  });

  it("should return non-ignored for files not matching any pattern", async () => {
    const resolver = new IgnoreResolver();
    await resolver.loadIgnoreFiles(tmpDir);
    expect(resolver.shouldIgnore("index.js", 100).ignored).toBe(false);
    expect(resolver.shouldIgnore("lib/util.ts", 100).ignored).toBe(false);
  });

  it("should exclude files exceeding max file size", async () => {
    const resolver = new IgnoreResolver({ maxFileSizeBytes: 1000 });
    await resolver.loadIgnoreFiles(tmpDir);
    const result = resolver.shouldIgnore("big.bin", 50_000_001);
    expect(result.ignored).toBe(true);
    expect(result.reason).toContain("exceeds max file size");
  });

  it("should include files within max file size", async () => {
    const resolver = new IgnoreResolver({ maxFileSizeBytes: 10000 });
    await resolver.loadIgnoreFiles(tmpDir);
    expect(resolver.shouldIgnore("normal.js", 5000).ignored).toBe(false);
  });

  it("should default maxFileSizeBytes to DEFAULT_FILE_SIZE_CONFIG.maxScanFileBytes", async () => {
    const resolver = new IgnoreResolver();
    await resolver.loadIgnoreFiles(tmpDir);
    expect(resolver.shouldIgnore("huge.bin", 100_000_001).ignored).toBe(true);
    expect(resolver.shouldIgnore("medium.bin", 5_000_000).ignored).toBe(false);
  });

  it("should provide reason for ignored files", async () => {
    writeFileSync(join(tmpDir, ".gitignore"), "*.log\n");
    const resolver = new IgnoreResolver();
    await resolver.loadIgnoreFiles(tmpDir);
    const result = resolver.shouldIgnore("error.log", 100);
    expect(result.ignored).toBe(true);
    expect(result.reason).toBeTruthy();
  });

  it("should load additional ignore files", async () => {
    writeFileSync(join(tmpDir, ".customignore"), "secrets/*\n");
    const resolver = new IgnoreResolver({ additionalIgnoreFiles: [".customignore"] });
    await resolver.loadIgnoreFiles(tmpDir);
    expect(resolver.shouldIgnore("secrets/key.txt", 100).ignored).toBe(true);
  });
});
