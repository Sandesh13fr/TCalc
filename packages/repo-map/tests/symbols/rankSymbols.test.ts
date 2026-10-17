import { describe, it, expect } from "vitest";
import { rankSymbols, isTestFilePath } from "../../src/symbols/rankSymbols.js";
import type { RepoMapSymbol } from "@wma/core";

function makeSymbol(name: string, relativePath: string, exported = true, priority = 5): RepoMapSymbol {
  return {
    name,
    kind: "function",
    relativePath,
    line: 1,
    exported,
    priority,
  };
}

describe("rankSymbols - test file path detection (Issue #136)", () => {
  it("does not classify paths containing 'test' substring like latest.ts or contest.ts as test files", () => {
    expect(isTestFilePath("src/latest.ts")).toBe(false);
    expect(isTestFilePath("src/contest.ts")).toBe(false);
    expect(isTestFilePath("src/fastest.js")).toBe(false);
    expect(isTestFilePath("lib/attestation.ts")).toBe(false);
  });

  it("accurately classifies true test files and test directories", () => {
    expect(isTestFilePath("tests/unit.test.ts")).toBe(true);
    expect(isTestFilePath("src/__tests__/app.spec.js")).toBe(true);
    expect(isTestFilePath("test/helpers.ts")).toBe(true);
    expect(isTestFilePath("src/utils.test.tsx")).toBe(true);
    expect(isTestFilePath("pkg/service_test.go")).toBe(true);
    expect(isTestFilePath("test.py")).toBe(true);
  });

  it("prioritizes true test symbols over production symbols for debug goal without false positives", () => {
    const symContest = makeSymbol("handleContest", "src/contest.ts");
    const symLatest = makeSymbol("getLatest", "src/latest.ts");
    const symTest = makeSymbol("testRunner", "tests/unit.test.ts");

    const ranked = rankSymbols([symContest, symLatest, symTest], "debug");

    // symTest should be prioritized first because it's a real test file
    expect(ranked[0].name).toBe("testRunner");
    // contest and latest should not be treated as test files, and ordered alphabetically
    expect(ranked[1].name).toBe("getLatest");
    expect(ranked[2].name).toBe("handleContest");
  });

  it("does not prioritize test files for default or non-test goals", () => {
    const symContest = makeSymbol("handleContest", "src/contest.ts");
    const symTest = makeSymbol("testRunner", "tests/unit.test.ts");

    const ranked = rankSymbols([symTest, symContest], "build-mvp");
    // Alphabetical order when exported & priority are equal and goal is not debug/test-generation
    expect(ranked[0].name).toBe("handleContest");
    expect(ranked[1].name).toBe("testRunner");
  });
});
