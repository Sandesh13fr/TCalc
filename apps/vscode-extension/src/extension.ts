import * as vscode from "vscode";
import { registerScanWorkspaceCommand } from "./commands/scanWorkspaceCommand.js";
import { registerOpenDashboardCommand } from "./commands/openDashboardCommand.js";
import { registerExportReportCommand } from "./commands/exportReportCommand.js";
import { registerSetWorkspaceGoalCommand } from "./commands/setWorkspaceGoalCommand.js";
import { registerCompareModelsCommand } from "./commands/compareModelsCommand.js";
import { registerGenerateAgentRulesCommand } from "./commands/generateAgentRulesCommand.js";
import { registerGenerateRepoMapCommand } from "./commands/generateRepoMapCommand.js";
import { registerUpdateModelCatalogCommand } from "./commands/updateModelCatalogCommand.js";
import { registerOpenSettingsCommand } from "./commands/openSettingsCommand.js";
import { registerShowWelcomeCommand, showWelcomeOnFirstActivation } from "./commands/showWelcomeCommand.js";
import { registerQuickStartCommand } from "./commands/quickStartCommand.js";
import { registerGenerateMcpConfigCommand } from "./commands/generateMcpConfigCommand.js";
import { TCalcSidebarProvider } from "./views/sidebarProvider.js";

export function activate(context: vscode.ExtensionContext) {
  const sidebar = new TCalcSidebarProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("tcalc.sidebar", sidebar, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("wma")) sidebar.refresh();
    }),
  );
  context.subscriptions.push(registerScanWorkspaceCommand(context, () => sidebar.refresh()));
  context.subscriptions.push(registerOpenDashboardCommand(context));
  context.subscriptions.push(registerExportReportCommand(context));
  context.subscriptions.push(registerSetWorkspaceGoalCommand(context));
  context.subscriptions.push(registerCompareModelsCommand(context));
  context.subscriptions.push(registerGenerateAgentRulesCommand(context));
  context.subscriptions.push(registerGenerateRepoMapCommand(context));
  context.subscriptions.push(registerUpdateModelCatalogCommand(context));
  context.subscriptions.push(registerOpenSettingsCommand());
  context.subscriptions.push(registerShowWelcomeCommand(context));
  context.subscriptions.push(registerQuickStartCommand());
  context.subscriptions.push(registerGenerateMcpConfigCommand());

  showWelcomeOnFirstActivation(context);
}

export function deactivate() {}
