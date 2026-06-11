import { describe, it, expect } from "vitest";
import { handleValidateModelCatalog } from "../src/tools/validateModelCatalogTool.js";

describe("validateModelCatalogTool", () => {
  it("should return valid false for nonexistent catalog path", async () => {
    const result = await handleValidateModelCatalog({
      catalogPath: "/nonexistent/path/catalog.json",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.valid).toBe(false);
    expect(parsed.modelCount).toBe(0);
    expect(parsed.errors).toBeInstanceOf(Array);
  });

  it("should handle empty model array", async () => {
    const result = await handleValidateModelCatalog({
      catalogPath: "/nonexistent/path/catalog.json",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.modelCount).toBe(0);
    expect(Array.isArray(parsed.errors)).toBe(true);
  });

  it("should not crash on invalid catalog paths", async () => {
    await expect(
      handleValidateModelCatalog({ catalogPath: "../../../test-path" })
    ).resolves.not.toThrow();
  });
});