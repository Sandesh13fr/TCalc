import * as vscode from "vscode";
import path from "node:path";
import { scanWorkspace } from "@wma/scanner";
import { loadModelCatalog } from "@wma/model-catalog";
import { recommendModels } from "@wma/recommender";
import type { RecommendationResult, WorkspaceScanResult } from "@wma/core";

export function registerScanWorkspaceCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand("workspaceModelAdvisor.scanWorkspace", async () => {
    const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!rootPath) {
      vscode.window.showErrorMessage("Open a workspace folder first.");
      return;
    }

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "Scanning workspace...", cancellable: true },
      async (progress, token) => {
        progress.report({ message: "Walking files..." });

        const scanResult: WorkspaceScanResult = await scanWorkspace({ rootPath });

        if (token.isCancellationRequested) return;

        progress.report({ message: "Loading model catalog..." });
        const extPath = context.extensionUri.fsPath;

        const bundledCatalogPath = path.join(extPath, "catalogs");
        let catalog = loadModelCatalog(bundledCatalogPath);

        const wsCatalog1 = loadModelCatalog(path.join(rootPath, "catalogs", "models.json"));
        const wsCatalog2 = loadModelCatalog(path.join(rootPath, ".workspace-model-advisor", "models.json"));

        if (wsCatalog1.models.length > 0) {
          catalog = wsCatalog1;
        } else if (wsCatalog2.models.length > 0) {
          catalog = wsCatalog2;
        } else if (catalog.models.length === 0) {
          const traditionalCatalogPath = path.join(extPath, "..", "..", "catalogs");
          catalog = loadModelCatalog(traditionalCatalogPath);
          if (catalog.models.length === 0) {
            scanResult.warnings.push("Model catalog not found in any search path");
          }
        }

        progress.report({ message: "Generating recommendations..." });
        const config = vscode.workspace.getConfiguration("wma");
        const goal = config.get<string>("defaultGoal") ?? "build-mvp";
        const privacyMode = config.get<string>("privacyMode") ?? "local-first";

        let recommendation: RecommendationResult | null = null;
        if (catalog.models.length === 0) {
          vscode.window.showWarningMessage("Model catalog is empty. No recommendations generated.");
        } else {
          try {
            recommendation = recommendModels({
              models: catalog.models,
              workspaceTokens: scanResult.includedTokens,
              goal: goal as any,
              privacyMode: privacyMode as any,
            });
          } catch (err) {
            scanResult.warnings.push(`Recommendations failed: ${err instanceof Error ? err.message : String(err)}`);
            vscode.window.showWarningMessage(
              `Recommendations failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }

        await context.workspaceState.update("wma.lastScan", scanResult);
        await context.workspaceState.update("wma.lastRecommendation", recommendation);
        await context.workspaceState.update("wma.lastModels", catalog.models);

        vscode.window.showInformationMessage(
          `Workspace scanned: ${scanResult.totalEstimatedTokens.toLocaleString()} estimated tokens`,
        );

        vscode.commands.executeCommand("workspaceModelAdvisor.openDashboard");
      },
    );
  });
}
