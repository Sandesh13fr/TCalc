import { describe, it, expect } from "vitest";
import { executeCatalogValidate } from "../src/commands/catalog.js";

describe("catalog validate command", () => {
  it("validates valid catalog", async () => {
    // The bundled catalog from the workspace catalogs directory
    const result = await executeCatalogValidate({
      path: "catalogs/models.json",
    });
    expect(result.valid).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.message).toContain("VALID");
  });

  it("fails on missing catalog", async () => {
    const result = await executeCatalogValidate({
      path: "catalogs/nonexistent.json",
    });
    expect(result.valid).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain("No models found");
  });

  it("fails on invalid catalog path", async () => {
    const result = await executeCatalogValidate({
      path: "nonexistent/path/models.json",
    });
    expect(result.valid).toBe(false);
    expect(result.exitCode).toBe(1);
  });
});
