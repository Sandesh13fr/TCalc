import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { IgnoreResolver } from "../src/ignoreResolver.js";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
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

  it("should reject absolute and parent-traversing ignore file entries", async () => {
    const warnings: string[] = [];
    const resolver = new IgnoreResolver({
      additionalIgnoreFiles: ["../outside.ignore", "/abs.ignore"],
      onWarning: (w) => warnings.push(w),
    });
    await resolver.loadIgnoreFiles(tmpDir);
    expect(warnings.some((w) => w.includes("Skipped ignore file outside workspace"))).toBe(true);
  });

  it("should not follow a safe-looking ignore filename that symlinks outside the workspace", async () => {
    const outsideDir = mkdtempSync(join(tmpdir(), "wma-outside-"));
    try {
      const outsideFile = join(outsideDir, "evil.ignore");
      writeFileSync(outsideFile, "should-be-ignored-by-evil/*\n");
      const linkName = ".evilignore";
      try {
        symlinkSync(outsideFile, join(tmpDir, linkName));
      } catch {
        return; // symlink privileges unavailable (e.g. Windows CI) — skip
      }
      const warnings: string[] = [];
      const resolver = new IgnoreResolver({
        additionalIgnoreFiles: [linkName],
        onWarning: (w) => warnings.push(w),
      });
      await resolver.loadIgnoreFiles(tmpDir);
      expect(resolver.shouldIgnore("should-be-ignored-by-evil/file.txt", 100).ignored).toBe(false);
      expect(warnings.some((w) => w.includes("Skipped ignore file outside workspace"))).toBe(true);
    } finally {
      rmSync(outsideDir, { recursive: true, force: true });
    }
  });
  it("should scope nested .gitignore patterns to their directory", async () => {
    const packageDir = join(tmpDir, "packages", "app");
    const otherDir = join(tmpDir, "packages", "other");
    mkdirSync(packageDir, { recursive: true });
    mkdirSync(otherDir, { recursive: true });
    writeFileSync(join(packageDir, ".gitignore"), "*.log\ndist/\n");

    const resolver = new IgnoreResolver();
    await resolver.loadIgnoreFiles(tmpDir);

    expect(resolver.shouldIgnore("packages/app/error.log", 100).ignored).toBe(true);
    expect(resolver.shouldIgnore("packages/app/src/debug.log", 100).ignored).toBe(true);
    expect(resolver.shouldIgnore("packages/app/dist/bundle.js", 100).ignored).toBe(true);
    expect(resolver.shouldIgnore("packages/app/src/dist/bundle.js", 100).ignored).toBe(true);
    expect(resolver.shouldIgnore("packages/other/error.log", 100).ignored).toBe(false);
    expect(resolver.shouldIgnore("packages/other/src/dist/bundle.js", 100).ignored).toBe(false);
    expect(resolver.shouldIgnore("error.log", 100).ignored).toBe(false);
  });

  it("should honor negation from nested .gitignore files", async () => {
    const packageDir = join(tmpDir, "packages", "app");
    mkdirSync(packageDir, { recursive: true });
    writeFileSync(join(packageDir, ".gitignore"), "*.log\n!important.log\n");

    const resolver = new IgnoreResolver();
    await resolver.loadIgnoreFiles(tmpDir);

    expect(resolver.shouldIgnore("packages/app/debug.log", 100).ignored).toBe(true);
    expect(resolver.shouldIgnore("packages/app/important.log", 100).ignored).toBe(false);
  });

  it("should stop nested ignore discovery when aborted", async () => {
    const packageDir = join(tmpDir, "packages", "app");
    mkdirSync(packageDir, { recursive: true });
    writeFileSync(join(packageDir, ".gitignore"), "*.log\n");
    const controller = new AbortController();
    controller.abort();

    const resolver = new IgnoreResolver({ signal: controller.signal });
    await expect(resolver.loadIgnoreFiles(tmpDir)).rejects.toThrow();
  });

  it("should treat special characters in nested directory names literally", async () => {
    const specialDir = join(tmpDir, "packages", "lib[old]");
    const siblingDir = join(tmpDir, "packages", "libo");
    mkdirSync(specialDir, { recursive: true });
    mkdirSync(siblingDir, { recursive: true });
    writeFileSync(join(specialDir, ".gitignore"), "*.log\n");

    const resolver = new IgnoreResolver();
    await resolver.loadIgnoreFiles(tmpDir);

    expect(resolver.shouldIgnore("packages/lib[old]/debug.log", 100).ignored).toBe(true);
    expect(resolver.shouldIgnore("packages/libo/debug.log", 100).ignored).toBe(false);
  });

  it("should load local ignore rules through in-workspace directory symlinks", async () => {
    const targetDir = join(tmpDir, "packages", "target");
    const linkDir = join(tmpDir, "linked-package");
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(join(targetDir, ".gitignore"), "*.log\n");
    symlinkSync(targetDir, linkDir, "dir");

    const resolver = new IgnoreResolver();
    await resolver.loadIgnoreFiles(tmpDir);

    expect(resolver.shouldIgnore("linked-package/debug.log", 100).ignored).toBe(true);
  });
});
