import { describe, it, expect } from "vitest";
import { generateMcpConfig } from "../src/commands/mcpConfig.js";

describe("mcp-config command", () => {
  it("generates valid JSON for Cursor target", () => {
    const output = generateMcpConfig({
      target: "cursor",
      command: "/path/to/mcp-server/dist/index.js",
    });
    const parsed = JSON.parse(output);
    expect(parsed.mcpServers).toBeDefined();
    expect(parsed.mcpServers.tcalc).toBeDefined();
    expect(parsed.mcpServers.tcalc.command).toBe("node");
    expect(parsed.mcpServers.tcalc.args).toContain("/path/to/mcp-server/dist/index.js");
  });

  it("generates valid JSON for generic target", () => {
    const output = generateMcpConfig({
      target: "generic",
      command: "/path/to/mcp-server/dist/index.js",
    });
    const parsed = JSON.parse(output);
    expect(parsed.mcpServers).toBeDefined();
    expect(parsed.mcpServers.tcalc.command).toBe("node");
  });

  it("generates valid JSON for claude-desktop target", () => {
    const output = generateMcpConfig({
      target: "claude-desktop",
      command: "/path/to/mcp-server/dist/index.js",
    });
    const parsed = JSON.parse(output);
    expect(parsed.mcpServers.tcalc.disabled).toBe(false);
    expect(parsed.mcpServers.tcalc.autoApprove).toEqual([]);
  });

  it("generates YAML output for continue target", () => {
    const output = generateMcpConfig({
      target: "continue",
      command: "/path/to/mcp-server/dist/index.js",
    });
    expect(output).toContain("experimental:");
    expect(output).toContain("modelContextProtocolServers:");
    expect(output).toContain("transport: stdio");
    expect(output).toContain("command: node");
    expect(output).toContain("/path/to/mcp-server/dist/index.js");
  });

  it("uses default command when not specified", () => {
    const output = generateMcpConfig({ target: "generic" });
    const parsed = JSON.parse(output);
    expect(parsed.mcpServers.tcalc.args[0].length).toBeGreaterThan(0);
    expect(parsed.mcpServers.tcalc.args[0]).toContain("packages");
  });

  it("generates JSON without secrets", () => {
    const output = generateMcpConfig({
      target: "cursor",
      command: "/path/to/mcp-server/dist/index.js",
    });
    expect(output).not.toContain("token");
    expect(output).not.toContain("secret");
    expect(output).not.toContain("password");
    expect(output).not.toContain("api_key");
    expect(output).not.toContain("authorization");
  });
});
