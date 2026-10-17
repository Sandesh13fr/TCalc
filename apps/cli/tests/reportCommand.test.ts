import { describe, it, expect, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { executeReport } from "../src/commands/report.js";

const cleanup: string[] = [];
afterEach(() => cleanup.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));

function makeWorkspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "tcalc-cli-report-"));
  cleanup.push(root);
  mkdirSync(path.join(root, ".tcalc"));
  mkdirSync(path.join(root, "src"));
  writeFileSync(path.join(root, "src", "index.ts"), "export const value = 1;");
  writeFileSync(
    path.join(root, ".tcalc", "models.json"),
    JSON.stringify({
      version: "1.0",
      updatedAt: "2026-07-01",
      models: [
        {
          id: "local/test",
          displayName: "Local Test",
          provider: "local",
          contextWindow: 128000,
          maxOutputTokens: 4096,
          inputPricePerMillion: 0,
          cachedInputPricePerMillion: 0,
          outputPricePerMillion: 0,
          supportsTools: false,
          supportsImages: false,
          supportsLocal: true,
          privacyMode: "local",
          codingScore: 80,
          reasoningScore: 80,
          latencyScore: 10,
          updatedAt: "2026-07-01",
        },
      ],
    }),
  );
  return root;
}

describe("report command", () => {
  it("generates markdown report with clamped tokenBudget from team policy", async () => {
    const root = makeWorkspace();
    writeFileSync(
      path.join(root, ".tcalc", "team.json"),
      JSON.stringify({
        schemaVersion: "1.0",
        maxTokenBudget: 600,
      }),
    );

    const report = await executeReport({
      target: root,
      format: "json",
      includeRepoMap: true,
    });

    const parsed = JSON.parse(report);
    expect(parsed.recommendations).toBeDefined();
    expect(parsed.assumptions).toContain(
      "Context limited to user-specified budget of 600 tokens",
    );
    expect(parsed.repoMap).toBeDefined();
    expect(parsed.repoMap.tokenBudget).toBe(600);
  });
});
