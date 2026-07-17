import * as vscode from "vscode";
import path from "node:path";

type McpTarget = "cursor" | "continue" | "claude-desktop" | "generic";

function generateMcpConfig(target: McpTarget, serverPath: string): string {
  switch (target) {
    case "cursor":
      return JSON.stringify(
        {
          mcpServers: {
            tcalc: {
              command: "node",
              args: [serverPath],
              description: "Local-first workspace analysis and AI model recommendations",
            },
          },
        },
        null,
        2,
      );
    case "continue":
      return `# Continue MCP Configuration (add to config.yaml)
experimental:
  modelContextProtocolServers:
    - transport: stdio
      command: node
      args:
        - ${JSON.stringify(serverPath)}
      description: TCalc workspace analysis tools
`;
    case "claude-desktop":
      return JSON.stringify(
        {
          mcpServers: {
            tcalc: {
              command: "node",
              args: [serverPath],
              description: "Local-first workspace analysis and AI model recommendations",
              disabled: false,
              autoApprove: [],
            },
          },
        },
        null,
        2,
      );
    case "generic":
      return JSON.stringify(
        {
          mcpServers: {
            tcalc: {
              command: "node",
              args: [serverPath],
              description: "Local-first workspace analysis and AI model recommendations",
            },
          },
        },
        null,
        2,
      );
  }
}

function getSuggestedFilename(target: McpTarget): string {
  switch (target) {
    case "cursor":
      return "cursor.mcp.json";
    case "continue":
      return "continue-mcp.yaml";
    case "claude-desktop":
      return "claude-desktop-mcp.json";
    case "generic":
      return "mcp-stdio.json";
  }
}

export function registerGenerateMcpConfigCommand(): vscode.Disposable {
  return vscode.commands.registerCommand("workspaceModelAdvisor.generateMcpConfig", async () => {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    const target = await vscode.window.showQuickPick(
      [
        { label: "Cursor", description: ".cursor/mcp.json MCP config" },
        { label: "Continue", description: "config.yaml MCP entry" },
        { label: "Claude Desktop", description: "claude_desktop_config.json MCP entry" },
        { label: "Generic MCP", description: "Any stdio MCP client" },
      ],
      { placeHolder: "Select target tool for MCP config" },
    );
    if (!target) return;

    let serverPath = "node /path/to/tcalc/packages/mcp-server/dist/index.js";
    if (workspaceRoot) {
      const suggested = path.join(workspaceRoot, "packages", "mcp-server", "dist", "index.js");
      const input = await vscode.window.showInputBox({
        prompt: "Path to MCP server entry point",
        value: suggested,
        placeHolder: "/absolute/path/to/mcp-server/dist/index.js",
        title: `MCP Server Path for ${target.label}`,
      });
      if (input === undefined) return;
      serverPath = input || serverPath;
    }

    const mcpTarget = target.label.toLowerCase() as McpTarget;
    const configContent = generateMcpConfig(mcpTarget, serverPath);
    const suggestedName = getSuggestedFilename(mcpTarget);

    const doc = await vscode.workspace.openTextDocument({
      content: configContent,
      language: /yaml/i.test(suggestedName) ? "yaml" : "json",
    });
    await vscode.window.showTextDocument(doc);

    const save = await vscode.window.showInformationMessage(
      `Generated ${target.label} MCP config. Save to file?`,
      "Save",
    );

    if (save === "Save") {
      const defaultUri = workspaceRoot
        ? vscode.Uri.file(path.join(workspaceRoot, suggestedName))
        : undefined;
      const uri = await vscode.window.showSaveDialog({
        defaultUri,
        filters: { "Config files": ["json", "yaml"] },
        title: `Save ${target.label} MCP Config`,
      });
      if (uri) {
        await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(configContent));
        vscode.window.showInformationMessage(`MCP config saved to ${uri.fsPath}`);
      }
    }
  });
}
