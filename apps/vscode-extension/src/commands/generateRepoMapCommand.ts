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

const MAP_TYPE_OPTIONS = [
  { label: "Code-aware repo map", description: "Extract symbols, imports, and routes using source analysis", value: true },
  { label: "Basic repo map", description: "File-tree based repo map without code analysis", value: false },
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

    const mapType = await vscode.window.showQuickPick(MAP_TYPE_OPTIONS, {
      placeHolder: "Select repo map type",
    });
    if (!mapType) return;

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

    const generated = generateRepoMapMarkdown(
      lastScan,
      tokenBudget,
      mapType.value,
    );
    if (generated.fallbackError) {
      vscode.window.showWarningMessage(
        `Code-aware repo map failed, generating basic map: ${generated.fallbackError.message}`,
      );
    }

    try {
      await showAndOfferToSaveRepoMap(context, rootPath, generated.markdown);
    } catch (err) {
      vscode.window.showErrorMessage(
        `Failed to display repo map: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });
}

type CreateRepoMap = typeof createRepoMap;
type FormatRepoMap = typeof formatRepoMapMarkdown;

export function generateRepoMapMarkdown(
  lastScan: WorkspaceScanResult,
  tokenBudget: number,
  enableSymbolExtraction: boolean,
  createMap: CreateRepoMap = createRepoMap,
  formatMap: FormatRepoMap = formatRepoMapMarkdown,
): { markdown: string; fallbackError?: Error } {
  try {
    const repoMap = createMap(lastScan, {
      tokenBudget,
      enableSymbolExtraction,
    });
    return { markdown: formatMap(repoMap) };
  } catch (err) {
    const repoMap = createMap(lastScan, {
      tokenBudget,
      enableSymbolExtraction: false,
    });
    return {
      markdown: formatMap(repoMap),
      fallbackError: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

export async function persistRepoMap(
  saveUri: vscode.Uri | undefined,
  markdown: string,
  writeFile: (uri: vscode.Uri, content: Uint8Array) => PromiseLike<void>,
  updatePath: (path: string) => PromiseLike<void>,
): Promise<boolean> {
  if (!saveUri) return false;
  await writeFile(saveUri, new TextEncoder().encode(markdown));
  await updatePath(saveUri.fsPath);
  return true;
}

async function showAndOfferToSaveRepoMap(
  context: vscode.ExtensionContext,
  rootPath: string,
  markdown: string,
): Promise<void> {
  const doc = await vscode.workspace.openTextDocument({
    content: markdown,
    language: "markdown",
  });
  await vscode.window.showTextDocument(doc);

  const saveUri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(path.join(rootPath, "repo-map.md")),
    filters: { Markdown: ["md"] },
  });

  try {
    const saved = await persistRepoMap(
      saveUri,
      markdown,
      (uri, content) => vscode.workspace.fs.writeFile(uri, content),
      (savedPath) => context.workspaceState.update("wma.repoMapPath", savedPath),
    );
    if (saved) {
      vscode.window.showInformationMessage(`Repo map saved to ${saveUri!.fsPath}`);
    }
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to save repo map: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
