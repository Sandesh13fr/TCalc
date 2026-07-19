import { describe, it, expect, beforeAll, vi } from "vitest";
import { handleScanWorkspace } from "../src/tools/scanWorkspaceTool.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, "../../../fixtures/small-node-app");

describe("scanWorkspaceTool", () => {
  it("should return compact JSON summary for valid workspace", async () => {
    const result = await handleScanWorkspace({ rootPath: fixturePath });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.rootPath).toBe(fixturePath);
    expect(parsed.totalFiles).toBeGreaterThan(0);
    expect(parsed.includedFiles).toBeGreaterThan(0);
    expect(parsed.totalEstimatedTokens).toBeGreaterThan(0);
    expect(parsed.topFiles).toBeInstanceOf(Array);
    expect(parsed.topFolders).toBeInstanceOf(Array);
    expect(parsed.languages).toBeInstanceOf(Array);
    expect(parsed.warnings).toBeInstanceOf(Array);
  });

  it("should default to current working directory when no rootPath provided", async () => {
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(fixturePath);
    try {
      const result = await handleScanWorkspace({});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.rootPath).toBe(fixturePath);
      expect(parsed.totalFiles).toBeGreaterThan(0);
    } finally {
      cwd.mockRestore();
    }
  });

  it("should include goal and privacyMode in schema validation", async () => {
    const result = await handleScanWorkspace({
      rootPath: fixturePath,
      goal: "debug",
      privacyMode: "cloud-ok",
    });

    expect(result).toBeDefined();
    expect(result.content[0].type).toBe("text");
  });

  it("should reject invalid goal values", async () => {
    await expect(
      handleScanWorkspace({ rootPath: fixturePath, goal: "invalid-goal" as any })
    ).rejects.toThrow();
  });

  it("should reject invalid privacyMode values", async () => {
    await expect(
      handleScanWorkspace({ rootPath: fixturePath, privacyMode: "invalid" as any })
    ).rejects.toThrow();
  });
});
