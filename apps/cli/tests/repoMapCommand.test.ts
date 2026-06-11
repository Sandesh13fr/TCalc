import { describe, it, expect } from "vitest";
import { executeRepoMap } from "../src/commands/repoMap.js";

describe("repo-map command", () => {
  it("generates markdown repo map", async () => {
    const output = await executeRepoMap({
      target: "fixtures/small-node-app",
      budget: 8000,
      format: "markdown",
    });
    expect(output).toContain("# Repo Map");
    expect(output).toContain("## Summary");
    expect(output).toContain("## Important Files");
    expect(output).toContain("## Entry Points");
    expect(output).toContain("## Config & Tooling");
    expect(output).toContain("## Documentation");
    expect(output).toContain("## Suggested Prompt Prefix");
  });

  it("respects budget option with small budget", async () => {
    const output = await executeRepoMap({
      target: "fixtures/small-node-app",
      budget: 2000,
      format: "markdown",
    });
    expect(output).toContain("# Repo Map");
    expect(output).toContain("Token Budget");
  });

  it("generates JSON repo map", async () => {
    const output = await executeRepoMap({
      target: "fixtures/small-node-app",
      format: "json",
    });
    const parsed = JSON.parse(output);
    expect(parsed.rootPath).toContain("small-node-app");
    expect(parsed.importantFiles).toBeDefined();
    expect(parsed.entryPoints).toBeDefined();
    expect(Array.isArray(parsed.importantFiles)).toBe(true);
  });

  it("includes symbols by default in JSON", async () => {
    const output = await executeRepoMap({
      target: "fixtures/small-node-app",
      format: "json",
    });
    const parsed = JSON.parse(output);
    expect(parsed.symbols).toBeDefined();
    expect(Array.isArray(parsed.symbols)).toBe(true);
    expect(parsed.routes).toBeDefined();
    expect(Array.isArray(parsed.routes)).toBe(true);
    expect(parsed.symbolSummary).toBeDefined();
    expect(Array.isArray(parsed.symbolSummary)).toBe(true);
  });

  it("--no-symbols omits symbols or shows empty arrays", async () => {
    const output = await executeRepoMap({
      target: "fixtures/small-node-app",
      format: "json",
      noSymbols: true,
    });
    const parsed = JSON.parse(output);
    expect(parsed.symbols).toEqual([]);
    expect(parsed.routes).toEqual([]);
  });

  it("respects --max-symbols", async () => {
    const output = await executeRepoMap({
      target: "fixtures/small-node-app",
      format: "json",
      maxSymbols: 2,
    });
    const parsed = JSON.parse(output);
    expect(parsed.symbols.length).toBeLessThanOrEqual(2);
  });
});
