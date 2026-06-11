import { describe, it, expect } from "vitest";
import { executeRecommend } from "../src/commands/recommend.js";

describe("recommend command", () => {
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
