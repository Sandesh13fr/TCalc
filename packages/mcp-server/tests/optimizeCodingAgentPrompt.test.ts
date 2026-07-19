import { describe, expect, it } from "vitest";
import { getOptimizeCodingAgentPrompt } from "../src/prompts/optimizeCodingAgentPrompt.js";

describe("getOptimizeCodingAgentPrompt", () => {
  it("rejects invalid token budgets", () => {
    expect(() => getOptimizeCodingAgentPrompt({ goal: "debug", tokenBudget: Number.NaN })).toThrow(/positive integer/);
    expect(() => getOptimizeCodingAgentPrompt({ goal: "debug", tokenBudget: -1 })).toThrow(/positive integer/);
  });
});
