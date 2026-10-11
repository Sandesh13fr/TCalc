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

  it("strips Python comments and docstrings but preserves assigned multiline strings", () => {
    const pyCode = `
# Module docstring
"""This is a service module"""
def process_data(items):
    # Process items in loop
    query = """
    SELECT * FROM table
    """
    result = []
    for item in items:
        result.append(item * 2)
    return result
`;
    const stripped = stripComments(pyCode, "python");

    expect(stripped).not.toContain("# Module docstring");
    expect(stripped).toContain('"""..."""'); // The module docstring is truncated
    expect(stripped).toContain('SELECT * FROM table'); // The assigned multiline is preserved
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
    const result = progressiveCompact("const x = 1;", { maxTargetTokens: 1000 });

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

  it("Issue 101: preserves string and regex literals", () => {
    const code = `
      const url = "https://example.com/api";
      const regex = /https:\\/\\//;
      // This is a real comment
      const template = \`
        // not a comment \${ "nested // string" }
      \`;
      const escapedQuote = "has \\\" // inside";
      const div = a/b; // note: c/d
      const regexTrailing = / hello/; // foo
    `;
    const stripped = stripComments(code);
    expect(stripped).toContain('"https://example.com/api"');
    expect(stripped).toContain('/https:\\/\\//');
    expect(stripped).toContain('// not a comment');
    expect(stripped).not.toContain('This is a real comment');
    expect(stripped).toContain('has \\" // inside');
    expect(stripped).toContain('a/b;');
    expect(stripped).not.toContain('note: c/d');
    expect(stripped).toContain('/ hello/;');
    expect(stripped).not.toContain('// foo');

    // Verify it is preserved through progressiveCompact with targetStage 1
    const stage1Result = progressiveCompact(code, { targetStage: 1 });
    expect(stage1Result.code).toContain('has \\" // inside');

    // Verify it is preserved through budget-driven Stage 1 selection
    const budgetResult = progressiveCompact(code, { maxTargetTokens: 100000 });
    // Assuming budget is large enough to stay at Stage 0 or 1, actually if it stays at 0 it didn't strip comments
    // Let's explicitly force Stage 1 via budget by ensuring it needs slight reduction
    const codeTokens = Math.max(1, Math.ceil(code.length / 3.8));
    const budgetResult2 = progressiveCompact(code, { maxTargetTokens: codeTokens - 1 });
    expect(budgetResult2.stage).toBeGreaterThanOrEqual(1);
    expect(budgetResult2.code).toContain('has \\" // inside');
  });

  it("Issue 101: processes interpolations and preserves nested templates", () => {
    const code = `
      const template = \`
        prefix
        \${
           // This comment should be stripped
           nestedFn(\`inner \${ // another comment to strip
             1 + 2
           } \`)
        }
        suffix
      \`;
    `;
    const stripped = stripComments(code);
    expect(stripped).not.toContain('This comment should be stripped');
    expect(stripped).not.toContain('another comment to strip');
    expect(stripped).toContain('prefix');
    expect(stripped).toContain('suffix');
    expect(stripped).toContain('inner');
    expect(stripped).toContain('1 + 2');
  });
});
