import { describe, it, expect } from "vitest";
import { executeRules } from "../src/commands/rules.js";

describe("rules command", () => {
  it("generates generic AGENTS.md content", async () => {
    const result = await executeRules({
      target: "fixtures/small-node-app",
      agentTarget: "generic",
      mode: "normal",
    });
    expect(result.fileName).toBe("AGENTS.md");
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content).toContain("Agent Rules");
  });

  it("generates cursor rules", async () => {
    const result = await executeRules({
      target: "fixtures/small-node-app",
      agentTarget: "cursor",
      mode: "concise",
    });
    expect(result.fileName).toBe(".cursorrules");
    expect(result.content.length).toBeGreaterThan(0);
  });

  it("generates Claude rules", async () => {
    const result = await executeRules({
      target: "fixtures/small-node-app",
      agentTarget: "claude-code",
      mode: "patch-only",
    });
    expect(result.fileName).toBe("CLAUDE.md");
    expect(result.content.length).toBeGreaterThan(0);
  });
});
