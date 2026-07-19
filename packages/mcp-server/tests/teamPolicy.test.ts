import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { handleScanWorkspace } from "../src/tools/scanWorkspaceTool.js";

const cleanup: string[] = [];
afterEach(() => cleanup.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));

describe("MCP team policy", () => {
  it("enforces shared exclusions", async () => {
    const root = mkdtempSync(path.join(process.cwd(), ".tcalc-team-policy-"));
    cleanup.push(root);
    mkdirSync(path.join(root, ".tcalc"));
    writeFileSync(path.join(root, ".tcalc", "team.json"), JSON.stringify({ schemaVersion: "1.0", exclude: ["private.ts"] }));
    writeFileSync(path.join(root, "private.ts"), "export const privateValue = 1;");
    writeFileSync(path.join(root, "public.ts"), "export const publicValue = 1;");
    const result = await handleScanWorkspace({ rootPath: root });
    const summary = JSON.parse(result.content[0].text);
    expect(summary.includedFiles).toBe(2);
    expect(summary.excludedFiles).toBe(1);
  });
});
