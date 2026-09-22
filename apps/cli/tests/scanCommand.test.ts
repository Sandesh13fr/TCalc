import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeScan } from "../src/commands/scan.js";
import { setClipboardAdapter, resetClipboardAdapter, type ClipboardAdapter } from "../src/utils/clipboard.js";
import { CliError } from "../src/utils/errors.js";
import path from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

const fixturePath = path.resolve("fixtures/small-node-app");

describe("scan command", () => {
  beforeEach(() => {
    resetClipboardAdapter();
  });

  afterEach(() => {
    resetClipboardAdapter();
  });

  it("scan fixture workspace in JSON format", async () => {
    const output = await executeScan({
      target: "fixtures/small-node-app",
      format: "json",
    });
    const parsed = JSON.parse(output);
    expect(parsed.rootPath).toContain("small-node-app");
    expect(parsed.totalFiles).toBeGreaterThan(0);
    expect(parsed.includedFiles).toBeGreaterThan(0);
  });

  it("scan fixture workspace in markdown format contains expected sections", async () => {
    const output = await executeScan({
      target: "fixtures/small-node-app",
      format: "markdown",
    });
    expect(output).toContain("# Workspace Scan Report");
    expect(output).toContain("## Summary");
    expect(output).toContain("Total Files");
    expect(output).toContain("Included Files");
  });

  it("scan fixture workspace in table format", async () => {
    const output = await executeScan({
      target: "fixtures/small-node-app",
      format: "table",
    });
    expect(output).toContain("Workspace Root:");
    expect(output).toContain("Total Files:");
    expect(output).toContain("Included Files:");
    expect(output).toContain("Excluded Files:");
  });

  it("surfaces malformed workspace config instead of silently using defaults", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "tcalc-bad-config-"));
    try {
      await writeFile(path.join(root, "index.ts"), "export const value = 1;\n");
      await writeFile(path.join(root, ".tcalc.json"), "{ \"exclude\": [\"secret/**\"], }");

      await expect(executeScan({ target: root, format: "json" })).rejects.toThrow(/Failed to load workspace config/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects invalid workspace config field types", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "tcalc-invalid-config-"));
    try {
      await writeFile(path.join(root, "index.ts"), "export const value = 1;\n");
      await writeFile(path.join(root, ".tcalc.json"), JSON.stringify({ exclude: "dist/**" }));

      await expect(executeScan({ target: root, format: "json" })).rejects.toThrow(/invalid exclude/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("scan handles default path (cwd)", async () => {
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(fixturePath);
    try {
      const output = await executeScan({ format: "json" });
      const parsed = JSON.parse(output);
      expect(parsed.rootPath).toBe(fixturePath);
      expect(parsed.totalFiles).toBeGreaterThan(0);
    } finally {
      cwd.mockRestore();
    }
  });

  it("copies output to clipboard when copy option is true", async () => {
    let copiedText = "";
    const mockAdapter: ClipboardAdapter = {
      async writeText(text: string) {
        copiedText = text;
      },
    };
    setClipboardAdapter(mockAdapter);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const output = await executeScan({
        target: "fixtures/small-node-app",
        format: "json",
        copy: true,
      });

      expect(copiedText).toBe(output);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Scan result copied to clipboard.");
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("handles clipboard failures when copy option is true", async () => {
    const failingAdapter: ClipboardAdapter = {
      async writeText() {
        throw new CliError("Failed to copy scan result to clipboard: tool unavailable.");
      },
    };
    setClipboardAdapter(failingAdapter);

    await expect(
      executeScan({
        target: "fixtures/small-node-app",
        copy: true,
      })
    ).rejects.toThrow("Failed to copy scan result to clipboard: tool unavailable.");
  });
});
