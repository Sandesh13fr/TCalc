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
});
