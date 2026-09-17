import { describe, it, expect } from "vitest";
import { chdir, cwd } from "node:process";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { executeRecommend } from "../src/commands/recommend.js";

describe("recommend command", () => {
  it("loads the bundled model catalog when invoked outside the TCalc checkout", async () => {
    const originalCwd = cwd();
    const tmpDir = mkdtempSync(join(tmpdir(), "tcalc-cli-cwd-"));

    try {
      chdir(tmpDir);
      const output = await executeRecommend({
        target: resolve(originalCwd, "fixtures/small-node-app"),
        format: "json",
      });
      const parsed = JSON.parse(output);

      expect(parsed.cheapestSufficient).toBeDefined();
      expect(parsed.balanced).toBeDefined();
      expect(parsed.highConfidence).toBeDefined();
    } finally {
      chdir(originalCwd);
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("recommends models from catalog", async () => {
    const output = await executeRecommend({
      target: "fixtures/small-node-app",
      format: "json",
    });
    const parsed = JSON.parse(output);
    expect(parsed.goal).toBeDefined();
    expect(parsed.cheapestSufficient).toBeDefined();
    expect(parsed.balanced).toBeDefined();
    expect(parsed.highConfidence).toBeDefined();
  });

  it("respects local-first privacy mode", async () => {
    const output = await executeRecommend({
      target: "fixtures/small-node-app",
      privacy: "local-first",
      format: "json",
    });
    const parsed = JSON.parse(output);
    expect(parsed.goal).toBeDefined();
  });

  it("returns table format output", async () => {
    const output = await executeRecommend({
      target: "fixtures/small-node-app",
      format: "table",
    });
    expect(output).toContain("Recommendations for goal:");
    expect(output).toContain("Workspace tokens:");
    expect(output).toContain("Cheapest Sufficient");
    expect(output).toContain("Balanced");
    expect(output).toContain("High Confidence");
  });
});
