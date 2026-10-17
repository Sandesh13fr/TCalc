import { afterEach, describe, it, expect } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { executeRecommend } from "../src/commands/recommend.js";

const cleanup: string[] = [];
afterEach(() => cleanup.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));

// Two models identical in every scored dimension, so only the tiebreak can separate them. The
// preferred id sorts after the other, so localeCompare actively picks the wrong one when the
// preference fails to reach the recommender.
function tiedModel(id: string) {
  return {
    id,
    displayName: `Tied ${id}`,
    provider: "test",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    inputPricePerMillion: 0.02,
    cachedInputPricePerMillion: 0.01,
    outputPricePerMillion: 0.04,
    supportsTools: false,
    supportsImages: false,
    supportsLocal: true,
    // local-first is the default privacy mode, so cloud models would be filtered out entirely.
    privacyMode: "local",
    codingScore: 90,
    reasoningScore: 90,
    latencyScore: 10,
    updatedAt: "2026-07-01",
  };
}

function makeWorkspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "tcalc-cli-team-"));
  cleanup.push(root);
  mkdirSync(path.join(root, ".tcalc"));
  mkdirSync(path.join(root, "src"));
  writeFileSync(path.join(root, "src", "index.ts"), "export const value = 1;");
  writeFileSync(path.join(root, "src", "helper.ts"), "export const helper = () => value;");
  // resolveCatalog probes <root>/catalogs/models.json then <root>/.tcalc/models.json.
  writeFileSync(
    path.join(root, ".tcalc", "models.json"),
    JSON.stringify({ version: "1.0", updatedAt: "2026-07-01", models: [tiedModel("alpha/tied"), tiedModel("zeta/tied")] }),
  );
  return root;
}

function writeTeamPolicy(root: string, preferredModelIds: string[]): void {
  writeFileSync(
    path.join(root, ".tcalc", "team.json"),
    JSON.stringify({
      schemaVersion: "1.0",
      modelProfiles: [{ id: "team", preferredModelIds }],
      activeProfile: "team",
    }),
  );
}

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

  it("threads preferredModelIds from .tcalc/team.json through to the recommendation", async () => {
    const root = makeWorkspace();

    // Control: with no team policy on disk, the alphabetical tiebreak decides.
    const baseline = JSON.parse(await executeRecommend({ target: root, format: "json" }));
    expect(baseline.cheapestSufficient.modelId).toBe("alpha/tied");

    // The only thing that changes is the file. This covers the whole chain: team.json is read by
    // loadTeamPolicy, parsed into a profile, looked up by getActiveModelProfile, applied by
    // applyModelProfile, and passed into recommendModels by the command itself. A break in any one
    // of those layers, including the call-site wiring, leaves this assertion at "alpha/tied".
    writeTeamPolicy(root, ["zeta/tied"]);

    const preferred = JSON.parse(await executeRecommend({ target: root, format: "json" }));
    expect(preferred.cheapestSufficient.modelId).toBe("zeta/tied");
  });

  it("leaves the recommendation alone when the policy prefers an unknown model", async () => {
    const root = makeWorkspace();
    writeTeamPolicy(root, ["not-in-catalog/model"]);

    const result = JSON.parse(await executeRecommend({ target: root, format: "json" }));
    expect(result.cheapestSufficient.modelId).toBe("alpha/tied");
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

  describe("team maxTokenBudget enforcement", () => {
    it("clamps explicit token budget below, equal to, and above team maximum, and respects default", async () => {
      const root = makeWorkspace();
      writeFileSync(
        path.join(root, ".tcalc", "team.json"),
        JSON.stringify({
          schemaVersion: "1.0",
          maxTokenBudget: 500,
        }),
      );

      // Below maximum (300)
      const below = JSON.parse(await executeRecommend({ target: root, tokenBudget: 300, format: "json" }));
      expect(below.assumptions).toContain("Context limited to user-specified budget of 300 tokens");

      // Equal to maximum (500)
      const equal = JSON.parse(await executeRecommend({ target: root, tokenBudget: 500, format: "json" }));
      expect(equal.assumptions).toContain("Context limited to user-specified budget of 500 tokens");

      // Above maximum (1200) -> clamped to 500
      const above = JSON.parse(await executeRecommend({ target: root, tokenBudget: 1200, format: "json" }));
      expect(above.assumptions).toContain("Context limited to user-specified budget of 500 tokens");

      // Omitted budget -> defaults to capped defaultContextBudget (min(64000, 500) = 500)
      const omitted = JSON.parse(await executeRecommend({ target: root, format: "json" }));
      expect(omitted.assumptions).toContain("Context limited to user-specified budget of 500 tokens");
    });
  });
});
