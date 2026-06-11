import { describe, it, expect } from "vitest";
import { generateAgentRules } from "../src/generateRules.js";

describe("generateAgentRules", () => {
  it('should return AGENTS.md content for "generic" target', () => {
    const result = generateAgentRules({
      target: "generic",
      mode: "normal",
    });
    expect(result.fileName).toBe("AGENTS.md");
    expect(result.content).toContain("generic Agent Rules");
    expect(result.target).toBe("generic");
  });

  it('should return .cursorrules content for "cursor" target', () => {
    const result = generateAgentRules({
      target: "cursor",
      mode: "normal",
    });
    expect(result.fileName).toBe(".cursorrules");
    expect(result.content).toContain("cursor Agent Rules");
    expect(result.target).toBe("cursor");
  });

  it('should return CLAUDE.md content for "claude-code" target', () => {
    const result = generateAgentRules({
      target: "claude-code",
      mode: "normal",
    });
    expect(result.fileName).toBe("CLAUDE.md");
    expect(result.content).toContain("claude-code Agent Rules");
    expect(result.target).toBe("claude-code");
  });

  it("should produce different content for different modes", () => {
    const normal = generateAgentRules({
      target: "generic",
      mode: "normal",
    });
    const concise = generateAgentRules({
      target: "generic",
      mode: "concise",
    });
    expect(normal.content).not.toBe(concise.content);
  });

  it("should include the mode name in the output content", () => {
    const result = generateAgentRules({
      target: "generic",
      mode: "patch-only",
    });
    expect(result.content).toContain("patch-only");
  });

  it("should return all required AgentRulesOutput fields", () => {
    const result = generateAgentRules({
      target: "cursor",
      mode: "repo-map-first",
    });
    expect(result).toHaveProperty("target");
    expect(result).toHaveProperty("mode");
    expect(result).toHaveProperty("fileName");
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("avoidFiles");
    expect(result).toHaveProperty("tokenBudget");
  });

  it("should include workspace tokens when provided", () => {
    const result = generateAgentRules({
      target: "generic",
      mode: "normal",
      workspaceTokens: 25000,
    });
    expect(result.content).toContain("25,000");
  });

  it("should include model recommendations when provided", () => {
    const result = generateAgentRules({
      target: "generic",
      mode: "normal",
      modelRecommendations: ["claude-sonnet-4", "gpt-4o"],
    });
    expect(result.content).toContain("claude-sonnet-4");
    expect(result.content).toContain("gpt-4o");
  });

  it("should assign reasonable avoidFiles for normal mode", () => {
    const result = generateAgentRules({
      target: "generic",
      mode: "normal",
    });
    expect(result.avoidFiles).toContain("node_modules/");
    expect(result.avoidFiles).toContain(".git/");
  });

  it("should assign a numeric tokenBudget", () => {
    const result = generateAgentRules({
      target: "generic",
      mode: "normal",
    });
    expect(typeof result.tokenBudget).toBe("number");
    expect(result.tokenBudget).toBeGreaterThan(0);
  });

  it("should handle ask-before-large-files mode", () => {
    const result = generateAgentRules({
      target: "cursor",
      mode: "ask-before-large-files",
    });
    expect(result.content).toContain("ask-before-large-files");
    expect(result.content).toContain("5 KB");
  });

  it("should support all 7 target types", () => {
    const targets = [
      "cursor",
      "claude-code",
      "codex",
      "cline",
      "roo",
      "continue",
      "aider",
      "generic",
    ] as const;
    for (const target of targets) {
      const result = generateAgentRules({ target, mode: "normal" });
      expect(result.target).toBe(target);
      expect(result.fileName).toBeTruthy();
      expect(result.content.length).toBeGreaterThan(10);
    }
  });

  it("should support all optimization modes", () => {
    const modes = [
      "normal",
      "concise",
      "caveman",
      "patch-only",
      "test-first",
      "plan-then-edit",
      "repo-map-first",
      "ask-before-large-files",
      "no-full-file-dumps",
      "use-summaries",
    ] as const;
    for (const mode of modes) {
      const result = generateAgentRules({ target: "generic", mode });
      expect(result.mode).toBe(mode);
      expect(result.content).toContain(mode);
      expect(result.content.length).toBeGreaterThan(50);
    }
  });
});
