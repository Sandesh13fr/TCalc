import { describe, expect, it } from "vitest";
import { getActiveModelProfile, parseTeamPolicy } from "../src/teamPolicy.js";

describe("team policies", () => {
  it("validates and selects a shared model profile", () => {
    const policy = parseTeamPolicy({
      schemaVersion: "1.0",
      privacyMode: "local-first",
      maxTokenBudget: 32000,
      modelProfiles: [{ id: "local", allowedProviders: ["local"] }],
      activeProfile: "local",
    });
    expect(getActiveModelProfile(policy)?.allowedProviders).toEqual(["local"]);
  });

  it("rejects an unknown active profile", () => {
    expect(() => parseTeamPolicy({ schemaVersion: "1.0", activeProfile: "missing", modelProfiles: [] })).toThrow(/not found/);
  });
});
