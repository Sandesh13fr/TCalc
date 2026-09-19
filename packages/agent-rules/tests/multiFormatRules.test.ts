import { describe, it, expect } from "vitest";
import {
  generateWindsurfRules,
  generateCopilotInstructions,
  generateGeminiRules,
  generateMultiFormatRules,
} from "../src/index.js";
import { isOptimizationMode, type AgentRulesOutput } from "@wma/core";

describe("MultiFormat Agent Rules", () => {
  it("generates valid Windsurf rules with custom build and test commands", () => {
    const rules = generateWindsurfRules({
      mode: "concise",
      workspaceTokens: 45000,
      testCommand: "pnpm test:unit",
      buildCommand: "pnpm build:fast",
      modelRecommendations: ["Claude 3.7 Sonnet", "GPT-4o"],
    });

    expect(rules.fileName).toBe(".windsurfrules");
    expect(rules.content).toContain("# Windsurf Workspace Rules");
    expect(rules.content).toContain("~45,000 tokens");
    expect(rules.content).toContain("Claude 3.7 Sonnet");
    expect(rules.content).toContain("pnpm test:unit");
    expect(rules.content).toContain("pnpm build:fast");
    expect(rules.content).toContain("Be extremely direct");
    expect(rules.avoidFiles).toContain("dist/");
    expect(rules.tokenBudget).toBe(16000);
  });

  it("generates GitHub Copilot instructions with PR readiness guidelines", () => {
    const rules = generateCopilotInstructions({
      mode: "patch-only",
      workspaceTokens: 32000,
      projectDescription: "TCalc token estimation workspace",
      codingConventions: ["Use Vitest for all unit tests", "No external telemetry"],
    });

    expect(rules.fileName).toBe(".github/copilot-instructions.md");
    expect(rules.content).toContain("# GitHub Copilot Instructions");
    expect(rules.content).toContain("TCalc token estimation workspace");
    expect(rules.content).toContain("Use Vitest for all unit tests");
    expect(rules.content).toContain("No external telemetry");
    expect(rules.content).toContain("## Pull Request Readiness");
    expect(rules.avoidFiles).toContain("node_modules/");
  });

  it("generates Gemini system instructions with Planning Mode guidelines", () => {
    const rules = generateGeminiRules({
      mode: "normal",
      workspaceTokens: 120000,
      systemRole: "Staff AI Solutions Architect",
      toolingNotes: ["Preserve all docstrings", "Execute Vitest checks"],
    });

    expect(rules.fileName).toBe("GEMINI.md");
    expect(rules.content).toContain("# Gemini System Prompt & Guidelines");
    expect(rules.content).toContain("Staff AI Solutions Architect");
    expect(rules.content).toContain("~120,000 tokens");
    expect(rules.content).toContain("Planning Mode");
    expect(rules.content).toContain("Preserve all docstrings");
  });

  it("supports caveman mode in Windsurf rules", () => {
    const rules = generateWindsurfRules({ mode: "caveman" });
    expect(rules.content).toContain("Terse bullet points only. Maximum brevity.");
  });

  it("dispatches single formats via generateMultiFormatRules", () => {
    const windsurf = generateMultiFormatRules("windsurf", { workspaceTokens: 1000 }) as AgentRulesOutput;
    expect(windsurf.fileName).toBe(".windsurfrules");

    const copilot = generateMultiFormatRules("copilot", { workspaceTokens: 2000 }) as AgentRulesOutput;
    expect(copilot.fileName).toBe(".github/copilot-instructions.md");

    const gemini = generateMultiFormatRules("gemini", { workspaceTokens: 3000 }) as AgentRulesOutput;
    expect(gemini.fileName).toBe("GEMINI.md");

    const cursor = generateMultiFormatRules("cursor", { workspaceTokens: 4000 }) as AgentRulesOutput;
    expect(cursor.fileName).toBe(".cursorrules");
  });

  it("bundles all rule formats when requested format is 'all'", () => {
    const bundle = generateMultiFormatRules("all", {
      workspaceTokens: 50000,
      mode: "concise",
    }) as Record<string, AgentRulesOutput>;

    expect(bundle).toHaveProperty("cursor");
    expect(bundle).toHaveProperty("claude");
    expect(bundle).toHaveProperty("generic");
    expect(bundle).toHaveProperty("windsurf");
    expect(bundle).toHaveProperty("copilot");
    expect(bundle).toHaveProperty("gemini");

    expect(bundle.windsurf.fileName).toBe(".windsurfrules");
    expect(bundle.copilot.fileName).toBe(".github/copilot-instructions.md");
    expect(bundle.gemini.fileName).toBe("GEMINI.md");
  });

  it("defaults every format to a valid optimization mode and token budget", () => {
    const bundle = generateMultiFormatRules("all", { workspaceTokens: 1000 }) as Record<string, AgentRulesOutput>;

    for (const output of Object.values(bundle)) {
      expect(output.mode).toBe("normal");
      expect(isOptimizationMode(output.mode)).toBe(true);
      expect(output.tokenBudget).toBe(64000);
      expect(output.content).not.toContain("Mode: balanced");
    }
  });
});
