import { describe, expect, it } from "vitest";
import { parseAgentTarget, parseGoal, parsePositiveInteger } from "../src/utils/options.js";
import { resolveTargetPath } from "../src/utils/paths.js";

describe("CLI input validation", () => {
  it("accepts supported enum values", () => {
    expect(parseGoal("debug")).toBe("debug");
    expect(parseAgentTarget("codex")).toBe("codex");
  });

  it("rejects unsupported enums and invalid numbers", () => {
    expect(() => parseGoal("invalid")).toThrow(/Invalid goal/);
    expect(() => parsePositiveInteger("0")).toThrow(/positive integer/);
    expect(() => parsePositiveInteger("1.5")).toThrow(/positive integer/);
  });

  it("rejects missing workspace paths", () => {
    expect(() => resolveTargetPath("fixtures/does-not-exist")).toThrow(/does not exist/);
  });
});
