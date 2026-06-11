import * as vscode from "vscode";
import { createDashboardPanel } from "../views/dashboardPanel.js";

export function registerOpenDashboardCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand("workspaceModelAdvisor.openDashboard", () => {
    const lastScan = context.workspaceState.get<unknown>("wma.lastScan");
    const lastRecommendation = context.workspaceState.get<unknown>("wma.lastRecommendation");

    if (!lastScan) {
      vscode.window.showInformationMessage("Run a workspace scan first.");
      return;
    }

    createDashboardPanel(context, lastScan as any, (lastRecommendation ?? null) as any);
  });
}
