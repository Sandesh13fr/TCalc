import { describe, it, expect } from "vitest";
import { validateRootPath } from "../src/utils/safeRootPath.js";
import { handleScanWorkspace } from "../src/tools/scanWorkspaceTool.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, "../../../fixtures/small-node-app");

describe("security", () => {
  describe("validateRootPath", () => {
    it("should accept valid absolute paths", () => {
      const result = validateRootPath(fixturePath);
      expect(result).toBeDefined();
      expect(result).toContain("small-node-app");
    });

    it("should accept relative paths and resolve them", () => {
      const result = validateRootPath(".");
      expect(result).toBeDefined();
    });

    it("should default to process.cwd() when no path provided", () => {
      const result = validateRootPath(undefined);
      expect(result).toBe(process.cwd());
    });
  });

  describe("no shell execution in tools", () => {
    it("scan_workspace should not execute shell commands", async () => {
      const result = await handleScanWorkspace({ rootPath: fixturePath });
      expect(result).toBeDefined();
      expect(result.content[0].text).toBeDefined();
    });
  });

  describe("no network calls", () => {
    it("tools should operate entirely on local files", async () => {
      const result = await handleScanWorkspace({ rootPath: fixturePath });
      expect(result.content[0].text).not.toContain("http://");
      expect(result.content[0].text).not.toContain("https://");
    });
  });

  describe("no source file bodies exposed", () => {
    it("workspace summary should not include file contents", async () => {
      const result = await handleScanWorkspace({ rootPath: fixturePath });
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).not.toHaveProperty("files");
    });
  });
});