import { describe, it, expect } from "vitest";
import { handleGenerateAgentRules } from "../src/tools/generateAgentRulesTool.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, "../../../fixtures/small-node-app");

describe("generateAgentRulesTool", () => {
  it("should return target, mode, suggested filename, and content", async () => {
    const result = await handleGenerateAgentRules({
      rootPath: fixturePath,
      target: "cursor",
      mode: "repo-map-first",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.target).toBe("cursor");
    expect(parsed.mode).toBe("repo-map-first");
    expect(parsed.suggestedFileName).toBe(".cursorrules");
    expect(parsed.content).toBeDefined();
    expect(typeof parsed.content).toBe("string");
  });

  it("should default to generic target and repo-map-first mode", async () => {
    const result = await handleGenerateAgentRules({
      rootPath: fixturePath,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.target).toBe("generic");
    expect(parsed.mode).toBe("repo-map-first");
    expect(parsed.suggestedFileName).toBe("AGENTS.md");
  });

  it("should support claude-code target", async () => {
    const result = await handleGenerateAgentRules({
      rootPath: fixturePath,
      target: "claude-code",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.target).toBe("claude-code");
    expect(parsed.suggestedFileName).toBe("CLAUDE.md");
  });

  it("should support different modes", async () => {
    const result = await handleGenerateAgentRules({
      rootPath: fixturePath,
      mode: "concise",
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.mode).toBe("concise");
  });
});