import * as vscode from "vscode";
import path from "node:path";

export type McpTarget = "cursor" | "continue" | "claude-desktop" | "generic";

interface McpTargetPick extends vscode.QuickPickItem {
  target: McpTarget;
}

const MCP_TARGETS: McpTargetPick[] = [
  { label: "Cursor", target: "cursor", description: ".cursor/mcp.json MCP config" },
  { label: "Continue", target: "continue", description: "config.yaml MCP entry" },
  {
    label: "Claude Desktop",
    target: "claude-desktop",
    description: "claude_desktop_config.json MCP entry",
  },
  { label: "Generic MCP", target: "generic", description: "Any stdio MCP client" },
];

export function generateMcpConfig(target: McpTarget, serverPath: string, workspaceRoot: string): string {
  switch (target) {
    case "cursor":
      return JSON.stringify(
        {
          mcpServers: {
            tcalc: {
              command: "node",
              args: [serverPath],
              env: { WMA_ALLOWED_ROOT: workspaceRoot },
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
      env:
        WMA_ALLOWED_ROOT: ${JSON.stringify(workspaceRoot)}
      description: TCalc workspace analysis tools
`;
    case "claude-desktop":
      return JSON.stringify(
        {
          mcpServers: {
            tcalc: {
              command: "node",
              args: [serverPath],
              env: { WMA_ALLOWED_ROOT: workspaceRoot },
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
              env: { WMA_ALLOWED_ROOT: workspaceRoot },
              description: "Local-first workspace analysis and AI model recommendations",
            },
          },
        },
        null,
        2,
      );
  }
}

export function getSuggestedFilename(target: McpTarget): string {
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

export function getDefaultMcpServerPath(extensionPath: string): string {
  return path.join(extensionPath, "packages", "mcp-server", "dist", "index.js");
}

export function getMcpTargets(): readonly McpTargetPick[] {
  return MCP_TARGETS;
}

export function registerGenerateMcpConfigCommand(context?: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand("workspaceModelAdvisor.generateMcpConfig", async () => {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const allowedRoot = workspaceRoot ?? process.cwd();

    const target = await vscode.window.showQuickPick(MCP_TARGETS, {
      placeHolder: "Select target tool for MCP config",
    });
    if (!target) return;

    const defaultServerPath = context
      ? getDefaultMcpServerPath(context.extensionPath)
      : path.join(process.cwd(), "packages", "mcp-server", "dist", "index.js");

    const input = await vscode.window.showInputBox({
      prompt: "Path to MCP server entry point",
      value: defaultServerPath,
      placeHolder: "/absolute/path/to/mcp-server/dist/index.js",
      title: `MCP Server Path for ${target.label}`,
      validateInput: (value) => (path.isAbsolute(value.trim()) ? undefined : "Use an absolute MCP server path."),
    });
    if (input === undefined) return;

    const serverPath = input.trim() || defaultServerPath;
    const configContent = generateMcpConfig(target.target, serverPath, allowedRoot);
    const suggestedName = getSuggestedFilename(target.target);

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
      const defaultUri = workspaceRoot ? vscode.Uri.file(path.join(workspaceRoot, suggestedName)) : undefined;
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
