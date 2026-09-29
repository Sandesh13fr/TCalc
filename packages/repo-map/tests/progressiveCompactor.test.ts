import { describe, it, expect } from "vitest";
import {
  stripComments,
  collapseFunctionBodies,
  extractExportOutline,
  progressiveCompact,
} from "../src/index.js";

const SAMPLE_TS = `
import { Database } from "./db.js";

/**
 * User service handles registration and authentication.
 * It coordinates with the SQL database.
 */
export class UserService {
  // Database connection handle
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /*
   * Registers a new user with email and hashed password.
   */
  public async register(email: string, pass: string): Promise<boolean> {
    const valid = email.includes("@");
    if (!valid) return false;
    await this.db.save({ email, pass });
    return true;
  }
}

export interface UserDTO {
  id: string;
  email: string;
}
`;

describe("Progressive Compactor", () => {
  it("strips single-line and multi-line comments in Stage 1", () => {
    const stripped = stripComments(SAMPLE_TS);

    expect(stripped).not.toContain("User service handles registration");
    expect(stripped).not.toContain("Database connection handle");
    expect(stripped).not.toContain("Registers a new user");
    expect(stripped).toContain("export class UserService");
    expect(stripped).toContain("public async register");
  });

  it("strips Python comments and docstrings", () => {
    const pyCode = `
# Module docstring
"""This is a service module"""
def process_data(items):
    # Process items in loop
    result = []
    for item in items:
        result.append(item * 2)
    return result
`;
    const stripped = stripComments(pyCode, "python");

    expect(stripped).not.toContain("# Module docstring");
    expect(stripped).not.toContain("# Process items in loop");
    expect(stripped).toContain("def process_data(items):");
  });

  it("collapses function and method bodies in Stage 2", () => {
    const collapsed = collapseFunctionBodies(stripComments(SAMPLE_TS));

    expect(collapsed).toContain("/* collapsed */");
    expect(collapsed).toContain("export class UserService");
    expect(collapsed).not.toContain("this.db.save({ email, pass })");
  });

  it("extracts export and interface outline in Stage 3", () => {
    const outline = extractExportOutline(SAMPLE_TS);

    expect(outline).toContain('import { Database } from "./db.js";');
    expect(outline).toContain("export class UserService");
    expect(outline).toContain("export interface UserDTO {");
    expect(outline).not.toContain("this.db = db;");
  });

  it("returns stage 0 when code already fits under maxTargetTokens", () => {
    const result = progressiveCompact("const x = 1;", {
      maxTargetTokens: 1000,
    });

    expect(result.stage).toBe(0);
    expect(result.reductionPercentage).toBe(0);
    expect(result.code).toBe("const x = 1;");
  });

  it("progressively steps from stage 0 to stage 1 when comment removal fits", () => {
    const result = progressiveCompact(SAMPLE_TS, { maxTargetTokens: 110 });

    expect(result.stage).toBe(1);
    expect(result.compactedTokens).toBeLessThan(result.originalTokens);
    expect(result.code).not.toContain("User service handles registration");
  });

  it("progressively steps to stage 2 when body collapsing is needed", () => {
    const result = progressiveCompact(SAMPLE_TS, { maxTargetTokens: 90 });

    expect(result.stage).toBe(2);
    expect(result.code).toContain("/* collapsed */");
    expect(result.reductionPercentage).toBeGreaterThan(15);
  });

  it("progressively steps to stage 3 for tight token limits", () => {
    const result = progressiveCompact(SAMPLE_TS, { maxTargetTokens: 30 });

    expect(result.stage).toBe(3);
    expect(result.code).toContain("export interface UserDTO");
    expect(result.reductionPercentage).toBeGreaterThan(45);
  });

  it("handles empty input string safely", () => {
    const result = progressiveCompact("");

    expect(result.stage).toBe(0);
    expect(result.originalTokens).toBe(0);
    expect(result.compactedTokens).toBe(0);
    expect(result.code).toBe("");
  });

  it("directly applies targetStage when specified", () => {
    const result = progressiveCompact(SAMPLE_TS, { targetStage: 3 });

    expect(result.stage).toBe(3);
    expect(result.code).toContain("export interface UserDTO");
  });

  describe("literal preservation (Issue #101)", () => {
    it("preserves URLs and comment markers inside double-quoted strings", () => {
      const code = `
const endpoint = "https://example.test/api"; // fetch data
const blockInString = "/* not a comment */"; // comment
`;
      const stripped = stripComments(code);
      expect(stripped).toContain(
        'const endpoint = "https://example.test/api";',
      );
      expect(stripped).toContain(
        'const blockInString = "/* not a comment */";',
      );
      expect(stripped).not.toContain("fetch data");
      expect(stripped).not.toContain("// comment");
    });

    it("preserves comment markers inside single-quoted strings and handles escaped quotes", () => {
      const code = `
const singleUrl = 'https://example.test/api'; // single url
const escaped = 'He said: \\'// not a comment\\''; /* block comment */
`;
      const stripped = stripComments(code);
      expect(stripped).toContain(
        "const singleUrl = 'https://example.test/api';",
      );
      expect(stripped).toContain(
        "const escaped = 'He said: \\'// not a comment\\'';",
      );
      expect(stripped).not.toContain("single url");
      expect(stripped).not.toContain("block comment");
    });

    it("preserves URLs and comment markers inside template literals", () => {
      const code = `
const base = "example.com";
const fullUrl = \`https://\${base}/api/v1\`; // template url
const docStr = \`Multi-line
/* not a comment */
// still not a comment
template\`;
`;
      const stripped = stripComments(code);
      expect(stripped).toContain("const fullUrl = `https://${base}/api/v1`;");
      expect(stripped).toContain("/* not a comment */");
      expect(stripped).toContain("// still not a comment");
      expect(stripped).not.toContain("template url");
    });

    it("preserves regular expression literals containing slashes", () => {
      const code = `
const protocolRegex = /https:\\/\\//i; // matches https
const division = 10 / 2 / 1; // division test
`;
      const stripped = stripComments(code);
      expect(stripped).toContain("const protocolRegex = /https:\\/\\//i;");
      expect(stripped).toContain("const division = 10 / 2 / 1;");
      expect(stripped).not.toContain("matches https");
      expect(stripped).not.toContain("division test");
    });

    it("preserves '#' inside Python strings while stripping genuine Python comments", () => {
      const pyCode = `
# Genuine header comment
color = "#ff0000" # hex color
url = 'https://example.com#anchor' # url anchor
"""Genuine docstring"""
`;
      const stripped = stripComments(pyCode, "python");
      expect(stripped).toContain('color = "#ff0000"');
      expect(stripped).toContain("url = 'https://example.com#anchor'");
      expect(stripped).toContain('"""..."""');
      expect(stripped).not.toContain("# Genuine header comment");
      expect(stripped).not.toContain("# hex color");
      expect(stripped).not.toContain("# url anchor");
    });

    it("preserves string literals across progressive compaction direct and budget paths", () => {
      const codeWithUrl = `
// Module header comment
export function fetchClient() {
  const endpoint = "https://example.test/api";
  /* Inline block comment */
  return endpoint;
}
`;
      // Direct stage 1
      const stage1 = progressiveCompact(codeWithUrl, { targetStage: 1 });
      expect(stage1.code).toContain(
        'const endpoint = "https://example.test/api";',
      );
      expect(stage1.code).not.toContain("Module header comment");
      expect(stage1.code).not.toContain("Inline block comment");

      // Progressive budget selection targeting stage 1
      const budgeted = progressiveCompact(codeWithUrl, { maxTargetTokens: 30 });
      expect(budgeted.code).toContain(
        'const endpoint = "https://example.test/api";',
      );
      expect(budgeted.code).not.toContain("Module header comment");
    });
  });
});
