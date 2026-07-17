import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..",
);

const EXAMPLE_FILES = [
  "examples/mcp/cursor.mcp.json",
  "examples/mcp/continue.yaml",
  "examples/mcp/claude-desktop.json",
  "examples/mcp/generic-stdio.json",
  "examples/agent-rules/AGENTS.md",
  "examples/agent-rules/CLAUDE.md",
  "examples/agent-rules/.cursorrules",
];

const SECRET_PATTERNS = [
  "api_key", "apikey", "api-key",
  "ghp_", "gho_", "ghu_", "github_pat",
  "sk-", "xoxb-", "xoxp-",
  "password", "PASSWORD",
  "authorization",
];

describe("example files security", () => {
  for (const relPath of EXAMPLE_FILES) {
    it(`${relPath} exists and contains no secrets`, () => {
      const absPath = path.join(repoRoot, relPath);
      expect(existsSync(absPath), `${relPath} should exist`).toBe(true);

      const content = readFileSync(absPath, "utf-8");
      for (const pattern of SECRET_PATTERNS) {
        expect(content.toLowerCase()).not.toContain(pattern);
      }
    });
  }

  it("no example MCP config contains absolute local paths", () => {
    for (const relPath of ["examples/mcp/cursor.mcp.json", "examples/mcp/claude-desktop.json", "examples/mcp/generic-stdio.json"]) {
      const content = readFileSync(path.join(repoRoot, relPath), "utf-8");
      expect(content).not.toMatch(/[C-Z]:\\\\/i);
    }
  });

  it("examples/agent-rules files are valid text content", () => {
    for (const relPath of ["examples/agent-rules/AGENTS.md", "examples/agent-rules/CLAUDE.md", "examples/agent-rules/.cursorrules"]) {
      const content = readFileSync(path.join(repoRoot, relPath), "utf-8");
      expect(content.length).toBeGreaterThan(50);
    }
  });
});
