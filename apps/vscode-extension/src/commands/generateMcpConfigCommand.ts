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
  return path.join(extensionPath, "node_modules", "@wma", "mcp-server", "dist", "index.js");
}

export function getMcpTargets(): readonly McpTargetPick[] {
  return MCP_TARGETS;
}

async function selectWorkspaceRoot(): Promise<string | undefined> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 1) return folders[0].uri.fsPath;

  if (folders.length > 1) {
    const selected = await vscode.window.showQuickPick(
      folders.map((folder) => ({
        label: folder.name,
        description: folder.uri.fsPath,
        folder,
      })),
      { placeHolder: "Select the workspace folder this MCP configuration may access" },
    );
    return selected?.folder.uri.fsPath;
  }

  const selected = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    title: "Select the workspace directory this MCP configuration may access",
  });
  return selected?.[0]?.fsPath;
}

export function registerGenerateMcpConfigCommand(context?: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand("workspaceModelAdvisor.generateMcpConfig", async () => {
    const workspaceRoot = await selectWorkspaceRoot();
    if (!workspaceRoot) return;

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
    const configContent = generateMcpConfig(target.target, serverPath, workspaceRoot);
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
      const defaultUri = vscode.Uri.file(path.join(workspaceRoot, suggestedName));
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
