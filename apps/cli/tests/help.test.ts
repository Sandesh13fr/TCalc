import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const cliPath = path.resolve("apps/cli/dist/index.js");

describe("CLI help", () => {
  it("shows common usage examples", () => {
    const output = execFileSync(process.execPath, [cliPath, "--help"], {
      encoding: "utf-8",
    });

    expect(output).toContain("Examples:");
    expect(output).toContain("$ wma scan ./my-project");
    expect(output).toContain("$ wma recommend ./my-project");
    expect(output).toContain("$ wma repo-map ./my-project");
    expect(output).toContain("$ wma rules ./my-project --target cursor");
  });
});