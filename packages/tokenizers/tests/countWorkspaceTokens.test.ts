import { describe, it, expect } from "vitest";
import { countWorkspaceTokens } from "../src/countWorkspaceTokens.js";
import type { WorkspaceFileInfo } from "@wma/core";

function makeFile(
  relativePath: string,
  language: string,
  estimatedTokens: number,
): WorkspaceFileInfo {
  return {
    path: relativePath,
    relativePath,
    extension: "",
    language,
    bytes: 100,
    estimatedTokens,
    included: true,
    riskFlags: [],
  };
}

describe("countWorkspaceTokens", () => {
  it("should return language percentages as fractions between 0 and 1", () => {
    const result = countWorkspaceTokens([
      makeFile("src/a.ts", "TypeScript", 50),
      makeFile("src/b.ts", "TypeScript", 50),
      makeFile("src/c.py", "Python", 100),
    ]);

    const percentages = Object.fromEntries(
      result.perLanguage.map((language) => [
        language.language,
        language.percentage,
      ]),
    );

    expect(percentages.TypeScript).toBe(0.5);
    expect(percentages.Python).toBe(0.5);
  });

  it("should return zero percentage when there are no included tokens", () => {
    const result = countWorkspaceTokens([
      makeFile("src/empty.ts", "TypeScript", 0),
    ]);

    expect(result.perLanguage[0]?.percentage).toBe(0);
  });
});
