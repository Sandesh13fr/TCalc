import * as vscode from "vscode";
import { generateMarkdownReport } from "@wma/reports";

export function registerExportReportCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand("workspaceModelAdvisor.exportReport", async () => {
    const lastScan = context.workspaceState.get<unknown>("wma.lastScan");
    const lastRecommendation = context.workspaceState.get<unknown>("wma.lastRecommendation");
    const repoMapPath = context.workspaceState.get<string>("wma.repoMapPath");

    if (!lastScan) {
      vscode.window.showErrorMessage("Run a workspace scan first.");
      return;
    }

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file("workspace-model-report.md"),
      filters: { Markdown: ["md"] },
    });

    if (!uri) return;

    let report = generateMarkdownReport(lastScan as any, (lastRecommendation ?? null) as any);

    if (repoMapPath) {
      report += `\n\n## Repo Map\n\nA repo map has been generated at \`${repoMapPath}\`. Use it with long-context coding agents for targeted workspace awareness.\n`;
    } else {
      report += `\n\n## Repo Map\n\nGenerate a repo map before using long-context coding agents.\n`;
    }

    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(report));
    vscode.window.showInformationMessage(`Report saved to ${uri.fsPath}`);
  });
}
