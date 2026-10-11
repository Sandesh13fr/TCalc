import * as vscode from "vscode";
import { WORKSPACE_GOALS } from "@wma/core";
import {
  getWorkspaceState,
  selectWorkspaceRoot,
  setActiveWorkspaceRoot,
} from "../workspaceContext.js";

export function registerSetWorkspaceGoalCommand(
  context: vscode.ExtensionContext,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "workspaceModelAdvisor.setWorkspaceGoal",
    async (requestedRootPath?: string) => {
      const rootPath = await selectWorkspaceRoot(requestedRootPath);
      if (!rootPath) return;
      await setActiveWorkspaceRoot(context, rootPath);

      const config = vscode.workspace.getConfiguration(
        "wma",
        vscode.Uri.file(rootPath),
      );
      const currentGoal = config.get<string>("defaultGoal") ?? "build-mvp";

      const selected = await vscode.window.showQuickPick(
        WORKSPACE_GOALS.map((g) => ({
          label: g,
          description: g === currentGoal ? "current" : undefined,
        })),
        { placeHolder: "Select workspace goal" },
      );

      if (!selected) return;

      await config.update(
        "defaultGoal",
        selected.label,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );

      const lastScan = getWorkspaceState(context, rootPath).scan;
      if (lastScan) {
        vscode.commands.executeCommand(
          "workspaceModelAdvisor.scanWorkspace",
          rootPath,
        );
      } else {
        vscode.window.showInformationMessage(
          `Goal set to "${selected.label}". Run a scan to generate recommendations.`,
        );
      }
    },
  );
}
