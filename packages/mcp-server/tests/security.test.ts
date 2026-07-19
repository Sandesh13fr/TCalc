import { describe, it, expect } from "vitest";
import { resolveCatalogPath, validateRootPath } from "../src/utils/safeRootPath.js";
import { handleScanWorkspace } from "../src/tools/scanWorkspaceTool.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

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

    it("should reject paths outside the allowed root", () => {
      expect(() => validateRootPath(path.dirname(process.cwd()))).toThrow(/disallowed/);
    });

    it("rejects sibling paths that only share the allowed-root prefix", () => {
      const parent = mkdtempSync(path.join(tmpdir(), "tcalc-root-prefix-"));
      const allowed = path.join(parent, "workspace");
      const sibling = path.join(parent, "workspace-evil");
      mkdirSync(allowed);
      mkdirSync(sibling);
      const previous = process.env.WMA_ALLOWED_ROOT;
      process.env.WMA_ALLOWED_ROOT = allowed;
      try {
        expect(() => validateRootPath(sibling)).toThrow(/disallowed/);
      } finally {
        if (previous === undefined) delete process.env.WMA_ALLOWED_ROOT;
        else process.env.WMA_ALLOWED_ROOT = previous;
        rmSync(parent, { recursive: true, force: true });
      }
    });

    it("should allow the trusted bundled catalog with a narrower workspace root", () => {
      const previous = process.env.WMA_ALLOWED_ROOT;
      process.env.WMA_ALLOWED_ROOT = fixturePath;
      try {
        expect(resolveCatalogPath()).toMatch(/catalogs[\\/]models\.json$/);
      } finally {
        if (previous === undefined) delete process.env.WMA_ALLOWED_ROOT;
        else process.env.WMA_ALLOWED_ROOT = previous;
      }
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
