import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { executeRepoMap } from "../src/commands/repoMap.js";
import { executeScan } from "../src/commands/scan.js";

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

  it("keeps scanner-classified generated files in the repo map end to end", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "tcalc-cli-generated-"));
    try {
      await mkdir(path.join(root, "src"));
      await writeFile(path.join(root, "src", "index.ts"), "export const value = 1;");
      await writeFile(path.join(root, "src", "vendor.min.js"), `${"a".repeat(4000)};`);

      const parsed = JSON.parse(await executeRepoMap({ target: root, format: "json" }));

      // A real scan has to have excluded it from the token budget. reason/priority identify which
      // branch produced the entry: the excluded pass carries the scanner's reason and priority 0,
      // while an included low-priority file would read "Low-priority" at priority 10.
      const excluded = parsed.excludedFiles.find((f) => f.relativePath === "src/vendor.min.js");
      expect(excluded).toBeDefined();
      expect(excluded.reason).toBe("generated");
      expect(excluded.priority).toBe(0);

      // Despite that exclusion, the generated-file label and its agent guidance survive.
      expect(parsed.generatedFiles.map((f) => f.relativePath)).toContain("src/vendor.min.js");
      expect(parsed.agentInstructions).toContain("There are 1 generated file(s). Avoid editing them.");

      // Exclusion is still a token-budget decision, so it stays out of include recommendations.
      expect(parsed.importantFiles.map((f) => f.relativePath)).not.toContain("src/vendor.min.js");
      expect(parsed.recommendedInclude.map((f) => f.relativePath)).not.toContain("src/vendor.min.js");

      // Appearing in several overlapping lists must not produce repeated exclude advice.
      const recommended = parsed.recommendedExclude.map((f) => f.relativePath);
      expect(new Set(recommended).size).toBe(recommended.length);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps nested-ignored directories out of scan tokens and the emitted repo map", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "tcalc-cli-nested-ignore-"));
    try {
      await mkdir(path.join(root, "packages", "app", "src"), { recursive: true });
      await mkdir(path.join(root, "packages", "app", "generated"), { recursive: true });
      await writeFile(path.join(root, "packages", "app", ".gitignore"), "generated/\n");
      await writeFile(path.join(root, "packages", "app", "src", "index.ts"), "export const included = true;\n");
      await writeFile(
        path.join(root, "packages", "app", "generated", "ignored.ts"),
        `export const ignored = "${"token-heavy ".repeat(1000)}";\n`,
      );

      const scan = JSON.parse(await executeScan({ target: root, format: "json" }));
      const included = scan.files.find(
        (file: { relativePath: string }) => file.relativePath === "packages/app/src/index.ts",
      );

      expect(included).toBeDefined();
      expect(scan.includedTokens).toBe(included.estimatedTokens);
      expect(scan.files.map((file: { relativePath: string }) => file.relativePath))
        .not.toContain("packages/app/generated/ignored.ts");

      const repoMap = JSON.parse(await executeRepoMap({
        target: root,
        format: "json",
        noSymbols: true,
      }));
      expect(repoMap.workspaceTotalTokens).toBe(scan.includedTokens);
      expect(JSON.stringify(repoMap)).not.toContain("packages/app/generated/ignored.ts");
      expect(JSON.stringify(repoMap)).not.toContain("token-heavy");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

});
