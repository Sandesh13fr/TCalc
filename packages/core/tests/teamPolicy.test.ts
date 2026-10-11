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
    expect(() =>
      parseTeamPolicy({
        schemaVersion: "1.0",
        activeProfile: "missing",
        modelProfiles: [],
      }),
    ).toThrow(/not found/);
  });

  it("allows an omitted active profile", () => {
    const policy = parseTeamPolicy({
      schemaVersion: "1.0",
      modelProfiles: [{ id: "local", allowedProviders: ["local"] }],
    });
    expect(policy.activeProfile).toBeUndefined();
    expect(getActiveModelProfile(policy)).toBeUndefined();
  });

  it("rejects an empty active profile string", () => {
    expect(() =>
      parseTeamPolicy({
        schemaVersion: "1.0",
        modelProfiles: [{ id: "local", allowedProviders: ["local"] }],
        activeProfile: "",
      }),
    ).toThrow(/Team policy activeProfile must not be blank/);
  });

  it("rejects a whitespace-only active profile string", () => {
    expect(() =>
      parseTeamPolicy({
        schemaVersion: "1.0",
        modelProfiles: [{ id: "local", allowedProviders: ["local"] }],
        activeProfile: "   ",
      }),
    ).toThrow(/Team policy activeProfile must not be blank/);
  });

  it("rejects an active profile when modelProfiles is omitted", () => {
    expect(() =>
      parseTeamPolicy({
        schemaVersion: "1.0",
        activeProfile: "local",
      }),
    ).toThrow(/not found/);
  });

  it("rejects a non-string active profile", () => {
    expect(() =>
      parseTeamPolicy({
        schemaVersion: "1.0",
        modelProfiles: [{ id: "local" }],
        activeProfile: 123,
      }),
    ).toThrow(/must be a string/);
  });

  it("rejects an empty model profile id", () => {
    expect(() =>
      parseTeamPolicy({
        schemaVersion: "1.0",
        modelProfiles: [{ id: "" }],
      }),
    ).toThrow(/needs an id/i);
  });

  it("rejects a whitespace-only model profile id", () => {
    expect(() =>
      parseTeamPolicy({
        schemaVersion: "1.0",
        modelProfiles: [{ id: "   " }],
      }),
    ).toThrow(/needs an id/i);
  });

  it("rejects a model profile missing an id", () => {
    expect(() =>
      parseTeamPolicy({
        schemaVersion: "1.0",
        modelProfiles: [{}],
      }),
    ).toThrow(/needs an id/i);
  });

  it("rejects duplicate model profile ids", () => {
    expect(() =>
      parseTeamPolicy({
        schemaVersion: "1.0",
        modelProfiles: [{ id: "local" }, { id: "local" }],
      }),
    ).toThrow(/duplicate model profile id/i);
  });
});
