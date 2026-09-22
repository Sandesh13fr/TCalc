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

  it("E2E: preferred tied model from team.json reaches recommendation output", async () => {
    // Build a temp workspace with two models that are identical in every scoring
    // dimension (same price, context window, scores) so that preferredModelIds is the
    // only differentiator.  The preferred model must appear in at least one tier.
    //
    // Node built-ins are imported dynamically to stay within the CLI tsconfig's
    // "include": ["src"] scope and avoid top-level node:* IDE errors in this file.
    const { join } = await import("node:path");
    const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = await import("node:fs");

    const root = mkdtempSync(join(process.cwd(), ".tcalc-e2e-preferred-"));
    try {
      // Minimal source file so the scanner has something to measure.
      writeFileSync(join(root, "index.ts"), "export const x = 1;\n");

      // Custom catalog with two identical-scoring models; only their IDs differ.
      const catalogDir = join(root, "catalogs");
      mkdirSync(catalogDir);
      const sharedModel = {
        displayName: "Twin",
        provider: "test",
        contextWindow: 128000,
        maxOutputTokens: 4096,
        inputPricePerMillion: 1.0,
        cachedInputPricePerMillion: 0.5,
        outputPricePerMillion: 4.0,
        supportsTools: true,
        supportsImages: false,
        supportsLocal: false,
        privacyMode: "hybrid",
        codingScore: 70,
        latencyScore: 70,
        updatedAt: "2026-01-01",
      };
      writeFileSync(
        join(catalogDir, "models.json"),
        JSON.stringify({
          version: "1.0",
          updatedAt: "2026-01-01",
          models: [
            { ...sharedModel, id: "twin-a", displayName: "Twin A" },
            { ...sharedModel, id: "twin-b", displayName: "Twin B" },
          ],
        }),
      );

      // Team policy: prefer twin-b (alphabetically second, so it would lose the
      // localeCompare tiebreaker without the fix).
      mkdirSync(join(root, ".tcalc"));
      writeFileSync(
        join(root, ".tcalc", "team.json"),
        JSON.stringify({
          schemaVersion: "1.0",
          modelProfiles: [{ id: "default", preferredModelIds: ["twin-b"] }],
          activeProfile: "default",
        }),
      );

      const output = await executeRecommend({
        target: root,
        format: "json",
        privacy: "cloud-ok",
      });
      const parsed = JSON.parse(output);

      const tierIds = [
        parsed.cheapestSufficient.modelId,
        parsed.balanced.modelId,
        parsed.highConfidence.modelId,
      ];

      // twin-b is preferred and scores identically to twin-a in every substantive criterion.
      // Without the fix, the localeCompare fallback ('a' < 'b') would always pick twin-a.
      // With the fix, twin-b wins cheapest-sufficient (first pick, all criteria tied).
      // The dedup mechanism forces the balanced slot to the other model,
      // but twin-b must appear in at least one tier.
      expect(parsed.cheapestSufficient.modelId).toBe("twin-b");
      expect(tierIds).toContain("twin-b");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
