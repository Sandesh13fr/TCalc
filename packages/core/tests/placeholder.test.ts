import { describe, it, expect } from "vitest";
import {
  REPORT_SCHEMA_VERSION,
  isAgentTarget,
  isOptimizationMode,
  isPrivacySetting,
  isWorkspaceGoal,
} from "../src/index.js";

describe("core package", () => {
  it("exports the report schema version", () => {
    expect(REPORT_SCHEMA_VERSION).toBe("1.0.0");
  });

  it("validates shared runtime option values", () => {
    expect(isWorkspaceGoal("debug")).toBe(true);
    expect(isWorkspaceGoal("invalid")).toBe(false);
    expect(isAgentTarget("codex")).toBe(true);
    expect(isOptimizationMode("patch-only")).toBe(true);
    expect(isPrivacySetting("cloud-ok")).toBe(true);
    expect(isPrivacySetting("cloud")).toBe(false);
  });
});
