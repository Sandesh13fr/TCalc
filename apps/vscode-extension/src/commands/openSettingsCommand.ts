import * as vscode from "vscode";

export function registerOpenSettingsCommand(): vscode.Disposable {
  return vscode.commands.registerCommand("workspaceModelAdvisor.openSettings", () => {
    vscode.commands.executeCommand("workbench.action.openSettings", "@ext:workspace-model-advisor");
  });
}
