import assert from "node:assert/strict";
import path from "node:path";
import * as vscode from "vscode";
import {
  generateMcpConfig,
  getDefaultMcpServerPath,
  getMcpTargets,
  getSuggestedFilename,
  type McpTarget,
} from "../../commands/generateMcpConfigCommand.js";

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension("Sandesh13fr.tcalc");
  assert.ok(extension, "TCalc extension should be installed in the test host");
  await extension.activate();

  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes("workspaceModelAdvisor.scanWorkspace"));
  assert.ok(commands.includes("workspaceModelAdvisor.openDashboard"));
  assert.ok(extension.packageJSON.contributes.viewsContainers.activitybar.some((view: { id: string }) => view.id === "tcalc"));
  assert.ok(extension.packageJSON.contributes.views.tcalc.some((view: { id: string }) => view.id === "tcalc.sidebar"));

  const expectedTargets: McpTarget[] = ["cursor", "continue", "claude-desktop", "generic"];
  assert.deepEqual(
    getMcpTargets().map((item) => item.target),
    expectedTargets,
  );

  for (const target of expectedTargets) {
    const filename = getSuggestedFilename(target);
    const config = generateMcpConfig(target, "/opt/tcalc/packages/mcp-server/dist/index.js", "/workspace/project");

    assert.ok(filename.length > 0, `${target} should provide a filename`);
    assert.ok(config.includes("/opt/tcalc/packages/mcp-server/dist/index.js"));
    assert.ok(config.includes("WMA_ALLOWED_ROOT"));
    assert.ok(config.includes("/workspace/project"));

    if (filename.endsWith(".yaml")) {
      assert.match(config, /modelContextProtocolServers/);
    } else {
      assert.doesNotThrow(() => JSON.parse(config));
    }
  }

  assert.equal(getSuggestedFilename("claude-desktop"), "claude-desktop-mcp.json");
  assert.equal(getSuggestedFilename("generic"), "mcp-stdio.json");
  assert.equal(
    getDefaultMcpServerPath("/opt/tcalc"),
    path.join("/opt/tcalc", "packages", "mcp-server", "dist", "index.js"),
  );
}
