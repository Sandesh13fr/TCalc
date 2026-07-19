import { describe, expect, it } from "vitest";
import { compactCompletedGoal } from "../src/compactGoal.js";

describe("compactCompletedGoal", () => {
  it("creates reusable context and reports token savings", () => {
    const result = compactCompletedGoal({
      goal: "add-feature",
      summary: "Added cached scans",
      changedFiles: ["src/cache.ts"],
      decisions: ["Cache is opt-in"],
      nextSteps: ["Monitor hit rate"],
      sourceTokens: 1000,
    });
    expect(result.content).toContain("Added cached scans");
    expect(result.estimatedTokens).toBeGreaterThan(0);
    expect(result.savedTokens).toBeGreaterThan(0);
  });
});
