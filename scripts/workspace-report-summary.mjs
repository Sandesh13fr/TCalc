#!/usr/bin/env node
import { readFileSync, appendFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const inputPath = process.argv[2] || resolve(repoRoot, "dist-ci/model-recommendations.json");
const data = JSON.parse(readFileSync(inputPath, "utf-8"));

const total = data?.workspaceTokens;
const goal = data?.goal ?? "n/a";
const tiers = [];
for (const [tierKey, label] of [
  ["cheapestSufficient", "cheapest-sufficient"],
  ["balanced", "balanced"],
  ["highConfidence", "high-confidence"],
]) {
  const r = data?.[tierKey];
  if (!r) continue;
  const modelId = r.modelId || r.displayName || "?";
  const cost = r.costEstimate?.estimatedCostUsd;
  const tierLabel = r.tier || label;
  if (typeof cost === "number") {
    tiers.push(`${tierLabel}: ${modelId} ($${cost})`);
  } else {
    tiers.push(`${tierLabel}: ${modelId}`);
  }
}

const totalStr = typeof total === "number" ? total.toLocaleString("en-US") : "n/a";
const tiersStr = tiers.join(" | ") || "n/a";

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `total=${totalStr}\ngoal=${goal}\ntiers=${tiersStr}\n`,
  );
} else {
  console.log(`total=${totalStr}`);
  console.log(`goal=${goal}`);
  console.log(`tiers=${tiersStr}`);
}
