import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

describe("MCP protocol", () => {
  it("handshakes and serves tools through SDK transport", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createServer();
    const client = new Client({ name: "tcalc-test", version: "1.0.0" });
    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      expect((await client.listTools()).tools.some((tool) => tool.name === "compact_completed_goal")).toBe(true);
      const result = await client.callTool({ name: "compact_completed_goal", arguments: { goal: "debug", summary: "Done" } });
      expect(result.content[0]).toMatchObject({ type: "text" });
    } finally {
      await client.close();
      await server.close();
    }
  });
});
