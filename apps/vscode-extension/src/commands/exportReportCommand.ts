import * as vscode from "vscode";
import { generateMarkdownReport } from "@wma/reports";
import { markdownCode, type WorkspaceScanResult } from "@wma/core";
import path from "node:path";
import {
  getWorkspaceState,
  selectWorkspaceRoot,
  setActiveWorkspaceRoot,
} from "../workspaceContext.js";

export function registerExportReportCommand(
  context: vscode.ExtensionContext,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "workspaceModelAdvisor.exportReport",
    async (requestedRootPath?: string) => {
      const rootPath = await selectWorkspaceRoot(requestedRootPath);
      if (!rootPath) return;
      await setActiveWorkspaceRoot(context, rootPath);

      const state = getWorkspaceState(context, rootPath);
      const lastScan = state.scan;
      const lastRecommendation = state.recommendation;
      const repoMapPath = state.repoMapPath;

      if (!lastScan) {
        vscode.window.showErrorMessage("Run a workspace scan first.");
        return;
      }

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(
          path.join(
            (lastScan as WorkspaceScanResult).rootPath,
            "workspace-model-report.md",
          ),
        ),
        filters: { Markdown: ["md"] },
      });

      if (!uri) return;

      let report = generateMarkdownReport(
        lastScan as any,
        (lastRecommendation ?? null) as any,
      );

      if (repoMapPath) {
        report += `\n\n## Repo Map\n\nA repo map has been generated at ${markdownCode(repoMapPath)}. Use it with long-context coding agents for targeted workspace awareness.\n`;
      } else {
        report += `\n\n## Repo Map\n\nGenerate a repo map before using long-context coding agents.\n`;
      }

      await vscode.workspace.fs.writeFile(
        uri,
        new TextEncoder().encode(report),
      );
      vscode.window.showInformationMessage(`Report saved to ${uri.fsPath}`);
    },
  );
}
