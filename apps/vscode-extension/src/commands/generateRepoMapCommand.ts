import * as vscode from "vscode";
import path from "node:path";
import { createRepoMap, formatRepoMapMarkdown } from "@wma/repo-map";
import type { WorkspaceScanResult } from "@wma/core";

const BUDGET_OPTIONS = [
  { label: "2K", description: "Ultra concise repo map (~2,000 tokens)", value: 2000 },
  { label: "8K", description: "Standard repo map (~8,000 tokens)", value: 8000 },
  { label: "16K", description: "Detailed repo map (~16,000 tokens)", value: 16000 },
  { label: "32K", description: "Comprehensive repo map (~32,000 tokens)", value: 32000 },
  { label: "Custom", description: "Enter a custom token budget", value: -1 },
];

export function registerGenerateRepoMapCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand("workspaceModelAdvisor.generateRepoMap", async () => {
    const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!rootPath) {
      vscode.window.showErrorMessage("Open a workspace folder first.");
      return;
    }

    const lastScan = context.workspaceState.get<unknown>("wma.lastScan") as WorkspaceScanResult | undefined;

    if (!lastScan) {
      const scanNow = await vscode.window.showInformationMessage(
        "No workspace scan found. Scan now?",
        { modal: true },
        "Scan Workspace",
        "Cancel",
      );
      if (scanNow === "Scan Workspace") {
        await vscode.commands.executeCommand("workspaceModelAdvisor.scanWorkspace");
      }
      return;
    }

    const selected = await vscode.window.showQuickPick(BUDGET_OPTIONS, {
      placeHolder: "Select token budget for repo map",
    });
    if (!selected) return;

    let tokenBudget = selected.value;
    if (tokenBudget === -1) {
      const input = await vscode.window.showInputBox({
        prompt: "Enter token budget (number)",
        validateInput: (value) => {
          const n = Number(value);
          if (!Number.isInteger(n) || n < 100) {
            return "Enter a positive integer of at least 100";
          }
          return null;
        },
      });
      if (!input) return;
      tokenBudget = Number(input);
    }

    const repoMap = createRepoMap(lastScan, { tokenBudget });
    const markdown = formatRepoMapMarkdown(repoMap);

    const doc = await vscode.workspace.openTextDocument({
      content: markdown,
      language: "markdown",
    });
    await vscode.window.showTextDocument(doc);

    const save = await vscode.window.showInformationMessage(
      "Save repo map to workspace root?",
      "Save",
      "Don't Save",
    );

    if (save === "Save") {
      const filePath = path.join(rootPath, "repo-map.md");
      try {
        await vscode.workspace.fs.writeFile(
          vscode.Uri.file(filePath),
          new TextEncoder().encode(markdown),
        );
        await context.workspaceState.update("wma.repoMapPath", filePath);
        vscode.window.showInformationMessage(`Repo map saved to repo-map.md`);
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to save repo map: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  });
}
