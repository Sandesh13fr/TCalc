import { describe, it, expect } from "vitest";
import { executeScan } from "../src/commands/scan.js";

describe("scan command", () => {
  it("scan fixture workspace in JSON format", async () => {
    const output = await executeScan({
      target: "fixtures/small-node-app",
      format: "json",
    });
    const parsed = JSON.parse(output);
    expect(parsed.rootPath).toContain("small-node-app");
    expect(parsed.totalFiles).toBeGreaterThan(0);
    expect(parsed.includedFiles).toBeGreaterThan(0);
  });

  it("scan fixture workspace in markdown format contains expected sections", async () => {
    const output = await executeScan({
      target: "fixtures/small-node-app",
      format: "markdown",
    });
    expect(output).toContain("# Workspace Scan Report");
    expect(output).toContain("## Summary");
    expect(output).toContain("Total Files");
    expect(output).toContain("Included Files");
  });

  it("scan fixture workspace in table format", async () => {
    const output = await executeScan({
      target: "fixtures/small-node-app",
      format: "table",
    });
    expect(output).toContain("Workspace Root:");
    expect(output).toContain("Total Files:");
    expect(output).toContain("Included Files:");
    expect(output).toContain("Excluded Files:");
  });

  it("scan handles default path (cwd)", async () => {
    const output = await executeScan({ format: "json" });
    const parsed = JSON.parse(output);
    expect(parsed.rootPath).toBeDefined();
    expect(parsed.totalFiles).toBeGreaterThan(0);
  });
});
