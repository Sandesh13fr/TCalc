import * as vscode from "vscode";
import path from "node:path";
import { generateAgentRules } from "@wma/agent-rules";
import { AGENT_TARGETS, OPTIMIZATION_MODES, type AgentTarget, type OptimizationMode } from "@wma/core";

export function registerGenerateAgentRulesCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand("workspaceModelAdvisor.generateAgentRules", async () => {
    const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!rootPath) {
      vscode.window.showErrorMessage("Open a workspace folder first.");
      return;
    }

    const target = await vscode.window.showQuickPick(
      AGENT_TARGETS.map(t => ({ label: t, description: getTargetDescription(t) })),
      { placeHolder: "Select target agent" },
    );
    if (!target) return;

    const mode = await vscode.window.showQuickPick(
      OPTIMIZATION_MODES.map(m => ({ label: m, description: getModeDescription(m) })),
      { placeHolder: "Select optimization mode" },
    );
    if (!mode) return;

    const lastScan = context.workspaceState.get<unknown>("wma.lastScan") as any;
    const workspaceTokens = lastScan?.includedTokens ?? 0;

    const result = generateAgentRules({
      target: target.label as AgentTarget,
      mode: mode.label as OptimizationMode,
      workspaceTokens,
    });

    const write = await vscode.window.showInformationMessage(
      `Generate ${result.fileName} with ${mode.label} mode?`,
      { modal: true, detail: `Target: ${target.label}\nMode: ${mode.label}\nFile: ${result.fileName}\nToken budget: ${result.tokenBudget.toLocaleString()}` },
      "Write File",
    );

    if (write !== "Write File") return;

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(path.join(rootPath, result.fileName)),
    });
    if (!saveUri) return;

    try {
      await vscode.workspace.fs.writeFile(
        saveUri,
        new TextEncoder().encode(result.content),
      );
      vscode.window.showInformationMessage(`${saveUri.fsPath} generated successfully.`);
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to write ${result.fileName}: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}

function getTargetDescription(target: AgentTarget): string {
  switch (target) {
    case "cursor": return "Cursor editor AI rules (.cursorrules)";
    case "claude-code": return "Claude Code CLI instructions (CLAUDE.md)";
    case "generic": return "Generic agent rules (AGENTS.md)";
    default: return "";
  }
}

function getModeDescription(mode: OptimizationMode): string {
  switch (mode) {
    case "normal": return "Balanced behavior";
    case "concise": return "Minimize output token usage";
    case "patch-only": return "Only output patch/edit blocks";
    case "repo-map-first": return "Prefer repo map over file reads";
    case "ask-before-large-files": return "Ask permission before reading large files";
    default: return "";
  }
}
