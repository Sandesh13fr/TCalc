import * as vscode from "vscode";

const GOALS = [
  "build-mvp", "add-feature", "debug", "refactor", "migration",
  "security-review", "test-generation", "documentation", "architecture-planning", "cleanup",
];

export function registerSetWorkspaceGoalCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand("workspaceModelAdvisor.setWorkspaceGoal", async () => {
    const currentGoal = vscode.workspace.getConfiguration("wma").get<string>("defaultGoal") ?? "build-mvp";

    const selected = await vscode.window.showQuickPick(
      GOALS.map(g => ({
        label: g,
        description: g === currentGoal ? "current" : undefined,
      })),
      { placeHolder: "Select workspace goal" },
    );

    if (!selected) return;

    await vscode.workspace.getConfiguration("wma").update("defaultGoal", selected.label, vscode.ConfigurationTarget.Workspace);

    const lastScan = context.workspaceState.get<unknown>("wma.lastScan");
    if (lastScan) {
      vscode.commands.executeCommand("workspaceModelAdvisor.scanWorkspace");
    } else {
      vscode.window.showInformationMessage(`Goal set to "${selected.label}". Run a scan to generate recommendations.`);
    }
  });
}
