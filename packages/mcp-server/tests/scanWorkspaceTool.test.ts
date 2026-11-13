import { describe, it, expect, beforeAll, vi } from "vitest";
import { handleScanWorkspace } from "../src/tools/scanWorkspaceTool.js";
import { createServer } from "../src/server.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(__dirname, "../../../fixtures/small-node-app");

describe("scanWorkspaceTool", () => {
  it("should return compact JSON summary for valid workspace", async () => {
    const result = await handleScanWorkspace({ rootPath: fixturePath });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.rootPath).toBe(fixturePath);
    expect(parsed.totalFiles).toBeGreaterThan(0);
    expect(parsed.includedFiles).toBeGreaterThan(0);
    expect(parsed.totalEstimatedTokens).toBeGreaterThan(0);
    expect(parsed.topFiles).toBeInstanceOf(Array);
    expect(parsed.topFolders).toBeInstanceOf(Array);
    expect(parsed.languages).toBeInstanceOf(Array);
    expect(parsed.warnings).toBeInstanceOf(Array);
  });

  it("should default to current working directory when no rootPath provided", async () => {
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(fixturePath);
    try {
      const result = await handleScanWorkspace({});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.rootPath).toBe(fixturePath);
      expect(parsed.totalFiles).toBeGreaterThan(0);
    } finally {
      cwd.mockRestore();
    }
  });

  it("should include goal and privacyMode in schema validation", async () => {
    const result = await handleScanWorkspace({
      rootPath: fixturePath,
      goal: "debug",
      privacyMode: "cloud-ok",
    });

    expect(result).toBeDefined();
    expect(result.content[0].type).toBe("text");
  });

  it("should reject invalid goal values", async () => {
    await expect(
      handleScanWorkspace({ rootPath: fixturePath, goal: "invalid-goal" as any })
    ).rejects.toThrow();
  });

  it("should reject invalid privacyMode values", async () => {
    await expect(
      handleScanWorkspace({ rootPath: fixturePath, privacyMode: "invalid" as any })
    ).rejects.toThrow();
  });

  it("should accept a configurable timeoutMs", async () => {
    const result = await handleScanWorkspace({ rootPath: fixturePath, timeoutMs: 5000 });
    expect(result).toBeDefined();
  });

  it("should reject out-of-range timeoutMs", async () => {
    await expect(handleScanWorkspace({ rootPath: fixturePath, timeoutMs: 0 })).rejects.toThrow();
    await expect(handleScanWorkspace({ rootPath: fixturePath, timeoutMs: 300001 })).rejects.toThrow();
  });

  it("should advertise timeoutMs in tool discovery with matching constraints", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createServer();
    const client = new Client({ name: "tcalc-test", version: "1.0.0" });
    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      const { tools } = await client.listTools();
      const scanTool = tools.find((t) => t.name === "scan_workspace");
      expect(scanTool).toBeDefined();
      const props = (scanTool!.inputSchema as any).properties as Record<string, any>;
      expect(props.timeoutMs).toBeDefined();
      expect(props.timeoutMs.minimum).toBe(1);
      expect(props.timeoutMs.maximum).toBe(300000);
      expect(props.timeoutMs.description).toMatch(/60000/);
    } finally {
      await client.close();
      await server.close();
    }
  });
});
