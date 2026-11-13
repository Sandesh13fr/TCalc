import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { executeCatalogValidate } from "../src/commands/catalog.js";

// Pin "now" to the bundled catalog's own date so these output tests don't
// start failing as the calendar moves (#218). Freshness has its own tests.
const now = new Date(`${JSON.parse(readFileSync("catalogs/models.json", "utf-8")).updatedAt}T00:00:00Z`);

describe("catalog validate command", () => {
  it("validates valid catalog", async () => {
    // The bundled catalog from the workspace catalogs directory
    const result = await executeCatalogValidate({
      path: "catalogs/models.json",
      now,
    });
    expect(result.valid).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.message).toContain("VALID");
  });

  it("emits JSON when requested", async () => {
    const result = await executeCatalogValidate({
      path: "catalogs/models.json",
      format: "json",
      now,
    });
    const payload = JSON.parse(result.message);
    expect(payload).toMatchObject({ valid: true, errors: [] });
    expect(payload.modelCount).toBeGreaterThanOrEqual(20);
  });

  it("reports a catalog older than --max-age-days", async () => {
    const result = await executeCatalogValidate({
      path: "catalogs/models.json",
      maxAgeDays: 30,
      now: new Date(now.getTime() + 31 * 86_400_000),
    });
    expect(result.valid).toBe(false);
    expect(result.message).toContain("31 days old");
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
