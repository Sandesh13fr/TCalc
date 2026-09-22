import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { handleEstimateFilesTokens } from "../src/tools/estimateFilesTokensTool.js";
import { createServer } from "../src/server.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

describe("estimateFilesTokensTool", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "tcalc-batch-tokens-"));
    await mkdir(path.join(tempDir, "src"), { recursive: true });
    await writeFile(path.join(tempDir, "src", "index.ts"), "export const a = 1;\nexport const b = 2;\n");
    await writeFile(path.join(tempDir, "src", "utils.ts"), "export function add(x: number, y: number) { return x + y; }\n");
    process.env.WMA_ALLOWED_ROOT = tempDir;
  });

  afterEach(async () => {
    delete process.env.WMA_ALLOWED_ROOT;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("fails on invalid input missing filePaths", async () => {
    const result = await handleEstimateFilesTokens({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid arguments");
  });

  it("fails on empty filePaths array", async () => {
    const result = await handleEstimateFilesTokens({ filePaths: [] });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("At least one file path must be specified");
  });

  it("estimates tokens for existing files accurately", async () => {
    const result = await handleEstimateFilesTokens({
      workspaceRoot: tempDir,
      filePaths: ["src/index.ts", "src/utils.ts"],
      contextBudget: 1000,
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.totalFiles).toBe(2);
    expect(parsed.existingFiles).toBe(2);
    expect(parsed.totalTokens).toBeGreaterThan(5);
    expect(parsed.fitsBudget).toBe(true);
    expect(parsed.budgetUtilizationPercent).toBeGreaterThan(0);
    expect(parsed.files[0].relativePath).toBe("src/index.ts");
    expect(parsed.files[0].exists).toBe(true);
  });

  it("gracefully marks missing files as exists: false without aborting batch", async () => {
    const result = await handleEstimateFilesTokens({
      workspaceRoot: tempDir,
      filePaths: ["src/index.ts", "src/nonexistent.ts"],
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.totalFiles).toBe(2);
    expect(parsed.existingFiles).toBe(1);
    const missing = parsed.files.find((f: any) => f.relativePath === "src/nonexistent.ts");
    expect(missing.exists).toBe(false);
    expect(missing.error).toBe("File not found");
  });

  it("rejects path traversal attempts outside workspace", async () => {
    const result = await handleEstimateFilesTokens({
      workspaceRoot: tempDir,
      filePaths: ["../../etc/passwd"],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Path traversal denied");
  });

  it("advertises tool in server discovery schema", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createServer();
    const client = new Client({ name: "tcalc-test", version: "1.0.0" });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      const { tools } = await client.listTools();

      const tool = tools.find((t) => t.name === "estimate_files_tokens");
      expect(tool).toBeDefined();
      expect(tool!.description).toContain("Estimate token count");
      expect((tool!.inputSchema as any).required).toContain("filePaths");
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("invokes tool via client callTool", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createServer();
    const client = new Client({ name: "tcalc-test", version: "1.0.0" });

    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);

      const res = (await client.callTool({
        name: "estimate_files_tokens",
        arguments: {
          workspaceRoot: tempDir,
          filePaths: ["src/index.ts"],
        },
      })) as any;

      expect(res.isError).toBeFalsy();
      const parsed = JSON.parse(res.content[0].text);
      expect(parsed.totalFiles).toBe(1);
      expect(parsed.existingFiles).toBe(1);
    } finally {
      await client.close();
      await server.close();
    }
  });
});
