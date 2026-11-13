import * as vscode from "vscode";
import { createDashboardPanel } from "../views/dashboardPanel.js";
import type { ModelInfo } from "@wma/core";
import {
  getWorkspaceState,
  selectWorkspaceRoot,
  setActiveWorkspaceRoot,
} from "../workspaceContext.js";

export function registerOpenDashboardCommand(
  context: vscode.ExtensionContext,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "workspaceModelAdvisor.openDashboard",
    async (requestedRootPath?: string) => {
      const rootPath = await selectWorkspaceRoot(requestedRootPath);
      if (!rootPath) return;
      await setActiveWorkspaceRoot(context, rootPath);

      const state = getWorkspaceState(context, rootPath);
      const lastScan = state.scan;
      const lastRecommendation = state.recommendation;
      const lastModels = state.models ?? [];

      if (!lastScan) {
        vscode.window.showInformationMessage("Run a workspace scan first.");
        return;
      }

      createDashboardPanel(
        context,
        lastScan,
        lastRecommendation ?? null,
        lastModels,
      );
    },
  );
}
