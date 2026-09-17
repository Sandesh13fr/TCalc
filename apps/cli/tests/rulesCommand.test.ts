import { describe, it, expect } from "vitest";
import { executeRules } from "../src/commands/rules.js";
import { handleRulesOutput } from "../src/utils/rulesOutput.js";

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

  it("generates Codex rules in AGENTS.md", async () => {
    const result = await executeRules({
      target: "fixtures/small-node-app",
      agentTarget: "codex",
      mode: "repo-map-first",
    });
    expect(result.fileName).toBe("AGENTS.md");
    expect(result.content).toContain("codex Agent Rules");
  });
  it("previews without writing when --yes is absent", async () => {
    const messages: string[] = [];
    let writes = 0;
    const result = await handleRulesOutput({
      content: "rules",
      outputPath: "AGENTS.md",
      stdout: false,
      yes: false,
      force: false,
      log: message => messages.push(message),
      write: (async () => { writes += 1; }) as any,
    });

    expect(result).toBe("preview");
    expect(writes).toBe(0);
    expect(messages[0]).toContain("Would write to: AGENTS.md");
  });

  it("uses exclusive creation for --yes without --force", async () => {
    let flag: string | undefined;
    await handleRulesOutput({
      content: "rules",
      outputPath: "AGENTS.md",
      stdout: false,
      yes: true,
      force: false,
      log: () => undefined,
      write: (async (_path: unknown, _content: unknown, options: { flag?: string }) => {
        flag = options.flag;
      }) as any,
    });
    expect(flag).toBe("wx");
  });

  it("uses replacement for --yes with --force", async () => {
    let flag: string | undefined;
    await handleRulesOutput({
      content: "rules",
      outputPath: "AGENTS.md",
      stdout: false,
      yes: true,
      force: true,
      log: () => undefined,
      write: (async (_path: unknown, _content: unknown, options: { flag?: string }) => {
        flag = options.flag;
      }) as any,
    });
    expect(flag).toBe("w");
  });

  it("reports an actionable error when --yes would overwrite", async () => {
    await expect(handleRulesOutput({
      content: "rules",
      outputPath: "AGENTS.md",
      stdout: false,
      yes: true,
      force: false,
      log: () => undefined,
      write: (async () => {
        throw Object.assign(new Error("exists"), { code: "EEXIST" });
      }) as any,
    })).rejects.toThrow("Use --force to overwrite it");
  });
});
