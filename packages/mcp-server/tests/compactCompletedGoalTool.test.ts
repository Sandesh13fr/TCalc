import { describe, expect, it } from "vitest";
import { handleCompactCompletedGoal } from "../src/tools/compactCompletedGoalTool.js";

describe("compact_completed_goal", () => {
  it("returns compact JSON context", async () => {
    const result = await handleCompactCompletedGoal({ goal: "debug", summary: "Fixed parser", sourceTokens: 1000 });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.content).toContain("Fixed parser");
    expect(parsed.savedTokens).toBeGreaterThan(0);
  });
});
