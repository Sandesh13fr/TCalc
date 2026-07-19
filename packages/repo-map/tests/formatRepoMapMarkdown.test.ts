import { describe, it, expect } from "vitest";
import type { RepoMapResult, RepoMapFile, RepoMapFolder, RepoMapLanguage, RepoMapSymbol, RepoMapImport, RepoMapRoute } from "@wma/core";
import { formatRepoMapMarkdown } from "../src/formatRepoMapMarkdown.js";

function makeFile(relativePath: string, priority: number, estimatedTokens: number, reason?: string): RepoMapFile {
  return {
    relativePath,
    estimatedTokens,
    reason: reason ?? "test file",
    priority,
    language: "TypeScript",
  };
}

function makeFixtureRepoMap(): RepoMapResult {
  return {
    rootPath: "/workspace/test-project",
    generatedAt: "2025-01-01T00:00:00.000Z",
    tokenBudget: 8000,
    estimatedTokens: 2500,
    workspaceTotalTokens: 50000,
    summary: "Files: 10 included / 3 excluded (76.9% of 13 total)\nImportant files identified: 7\nEntry points: 2\nTests: 2\nConfig files: 2\nDocumentation files: 2\nLarge files: 1\nRisky files: 1",
    topLevelFolders: [
      { relativePath: "src", estimatedTokens: 490, fileCount: 4 },
      { relativePath: "test", estimatedTokens: 210, fileCount: 2 },
    ],
    languageBreakdown: [
      { language: "TypeScript", estimatedTokens: 620, fileCount: 6 },
      { language: "JSON", estimatedTokens: 200, fileCount: 2 },
    ],
    importantFiles: [
      makeFile("src/index.ts", 100, 200, "Likely entry point"),
      makeFile("src/main.ts", 100, 150, "Likely entry point"),
      makeFile("package.json", 90, 100, "Config / tooling file"),
      makeFile("tsconfig.json", 90, 80, "Config / tooling file"),
      makeFile("README.md", 80, 50, "Documentation / instructions"),
      makeFile("AGENTS.md", 80, 30, "Documentation / instructions"),
      makeFile("test/index.test.ts", 70, 120, "Test file"),
    ],
    entryPoints: [
      makeFile("src/index.ts", 100, 200, "Likely entry point"),
      makeFile("src/main.ts", 100, 150, "Likely entry point"),
    ],
    testFiles: [
      makeFile("test/index.test.ts", 70, 120, "Test file"),
    ],
    configFiles: [
      makeFile("package.json", 90, 100, "Config / tooling file"),
      makeFile("tsconfig.json", 90, 80, "Config / tooling file"),
    ],
    documentationFiles: [
      makeFile("README.md", 80, 50, "Documentation / instructions"),
      makeFile("AGENTS.md", 80, 30, "Documentation / instructions"),
    ],
    riskyFiles: [
      makeFile(".env", 10, 5, "Low-priority"),
    ],
    largeFiles: [
      makeFile("data/big-file.json", 20, 100000, "Low-priority"),
    ],
    generatedFiles: [],
    excludedFiles: [
      makeFile("node_modules/pkg/index.js", 0, 5000, "In .gitignore"),
    ],
    recommendedInclude: [
      makeFile("src/index.ts", 100, 200, "Likely entry point"),
      makeFile("package.json", 90, 100, "Config / tooling file"),
    ],
    recommendedExclude: [
      makeFile("data/big-file.json", 20, 100000, "Low-priority"),
    ],
    agentInstructions: [
      "Start by reading this repo map.",
      "Key entry points to read first: src/index.ts, src/main.ts",
    ],
    overflowNotes: [],
    symbols: [
      { name: "serve", kind: "function", relativePath: "src/server.ts", lineStart: 1, exported: true, priority: 7 },
      { name: "AppConfig", kind: "interface", relativePath: "src/types.ts", lineStart: 1, exported: true, priority: 7 },
      { name: "Button", kind: "component", relativePath: "src/components/Button.tsx", lineStart: 7, exported: false, priority: 5 },
    ],
    imports: [
      { source: "express", relativePath: "src/server.ts", kind: "import" },
      { source: "react", relativePath: "src/components/Button.tsx", kind: "import" },
    ],
    routes: [
      { relativePath: "src/server.ts", routePattern: "/api/health", framework: "express", reason: "GET /api/health" },
      { relativePath: "app/page.tsx", routePattern: "/", framework: "nextjs", reason: "Next.js App Router page: app/page.tsx" },
    ],
    symbolSummary: [
      "3 symbols extracted from 3 files",
      "Exports: 2",
      "Functions/Components: 2",
    ],
  };
}

function sectionCount(markdown: string, sectionName: string): number {
  return (markdown.match(new RegExp(`^## ${sectionName}`, "gm")) || []).length;
}

describe("formatRepoMapMarkdown", () => {
  it("outputs all expected Markdown sections", () => {
    const repoMap = makeFixtureRepoMap();
    const md = formatRepoMapMarkdown(repoMap);

    expect(md).toContain("# Repo Map");
    expect(sectionCount(md, "Summary")).toBe(1);
    expect(sectionCount(md, "Project Shape")).toBe(1);
    expect(sectionCount(md, "Important Files")).toBe(1);
    expect(sectionCount(md, "Entry Points")).toBe(1);
    expect(sectionCount(md, "Tests")).toBe(1);
    expect(sectionCount(md, "Config & Tooling")).toBe(1);
    expect(sectionCount(md, "Documentation")).toBe(1);
    expect(sectionCount(md, "Large / Noisy Files")).toBe(1);
    expect(sectionCount(md, "Risk / Sensitive Files")).toBe(1);
    expect(sectionCount(md, "Recommended Agent Context")).toBe(1);
    expect(sectionCount(md, "Suggested Prompt Prefix")).toBe(1);
    expect(sectionCount(md, "Overflow Notes")).toBe(1);
  });

  it("does not include full source contents", () => {
    const repoMap = makeFixtureRepoMap();
    const md = formatRepoMapMarkdown(repoMap);

    expect(md).not.toContain("```ts");
    expect(md).not.toContain("```javascript");
    expect(md).not.toContain("export function");
    expect(md).not.toMatch(/\bconst \w+ = /);
    expect(md).not.toMatch(/\bfunction \w+\(/);
  });

  it("includes suggested prompt prefix", () => {
    const repoMap = makeFixtureRepoMap();
    const md = formatRepoMapMarkdown(repoMap);

    expect(md).toContain("Suggested Prompt Prefix");
    expect(md).toContain("Prefer targeted file reads");
    expect(md).toContain("patch-only output");
  });

  it("safely handles empty scan result", () => {
    const repoMap: RepoMapResult = {
      rootPath: "/empty",
      generatedAt: "2025-01-01T00:00:00.000Z",
      tokenBudget: 8000,
      estimatedTokens: 0,
      workspaceTotalTokens: 0,
      summary: "Files: 0 included / 0 excluded (0.0% of 0 total)",
      topLevelFolders: [],
      languageBreakdown: [],
      importantFiles: [],
      entryPoints: [],
      testFiles: [],
      configFiles: [],
      documentationFiles: [],
      riskyFiles: [],
      largeFiles: [],
      generatedFiles: [],
      excludedFiles: [],
      recommendedInclude: [],
      recommendedExclude: [],
      agentInstructions: [],
      overflowNotes: [],
    };
    const md = formatRepoMapMarkdown(repoMap);

    expect(md).toContain("# Repo Map");
    expect(md).toContain("## Summary");
    expect(md).toContain("No important files identified.");
    expect(md).toContain("No large or noisy files detected.");
    expect(md).toContain("No risk-flagged files detected.");
  });

  it("includes overflow notes when present", () => {
    const repoMap = makeFixtureRepoMap();
    repoMap.overflowNotes = ["Budget of 2,000 tokens exceeded. Trimmed 1 lower-priority file(s) to fit."];
    const md = formatRepoMapMarkdown(repoMap);

    expect(md).toContain("## Overflow Notes");
    expect(md).toContain("Budget of 2,000 tokens exceeded");
  });

  it("shows no overflow notes when none present", () => {
    const repoMap = makeFixtureRepoMap();
    const md = formatRepoMapMarkdown(repoMap);

    expect(md).toContain("No budget trimming applied");
  });

  it("includes Key Symbols section", () => {
    const repoMap = makeFixtureRepoMap();
    const md = formatRepoMapMarkdown(repoMap);

    expect(md).toContain("## Key Symbols");
    expect(md).toContain("`serve`");
    expect(md).toContain("`AppConfig`");
    expect(md).toContain("`Button`");
  });

  it("includes Routes / Entry Handlers section", () => {
    const repoMap = makeFixtureRepoMap();
    const md = formatRepoMapMarkdown(repoMap);

    expect(md).toContain("## Routes / Entry Handlers");
    expect(md).toContain("/api/health");
  });

  it("includes Import / Dependency Hints section", () => {
    const repoMap = makeFixtureRepoMap();
    const md = formatRepoMapMarkdown(repoMap);

    expect(md).toContain("## Import / Dependency Hints");
    expect(md).toContain("express");
  });

  it("does not include source bodies", () => {
    const repoMap = makeFixtureRepoMap();
    const md = formatRepoMapMarkdown(repoMap);

    expect(md).not.toContain("```");
    expect(md).not.toContain("export function");
  });

  it("does not include Key Symbols when symbols are empty", () => {
    const repoMap = makeFixtureRepoMap();
    repoMap.symbols = [];
    repoMap.symbolSummary = [];
    repoMap.routes = [];
    repoMap.imports = [];
    const md = formatRepoMapMarkdown(repoMap);

    expect(md).not.toContain("## Key Symbols");
    expect(md).not.toContain("## Routes / Entry Handlers");
    expect(md).not.toContain("## Import / Dependency Hints");
  });

  it("escapes hostile Markdown fields", () => {
    const repoMap = makeFixtureRepoMap();
    repoMap.importantFiles[0].relativePath = "src/a`b|c.ts";
    repoMap.importantFiles[0].reason = "reason\n## injected";
    repoMap.routes![0].routePattern = "/a|b";
    const md = formatRepoMapMarkdown(repoMap);

    expect(md).toContain("a`b&#124;c.ts");
    expect(md).toContain("reason \\#\\# injected");
    expect(md).toContain("/a\\|b");
    expect(md).not.toContain("\n## injected");
  });
});
