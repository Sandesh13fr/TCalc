import * as vscode from "vscode";
import { registerScanWorkspaceCommand } from "./commands/scanWorkspaceCommand.js";
import { registerOpenDashboardCommand } from "./commands/openDashboardCommand.js";
import { registerExportReportCommand } from "./commands/exportReportCommand.js";
import { registerSetWorkspaceGoalCommand } from "./commands/setWorkspaceGoalCommand.js";
import { registerCompareModelsCommand } from "./commands/compareModelsCommand.js";
import { registerGenerateAgentRulesCommand } from "./commands/generateAgentRulesCommand.js";
import { registerUpdateModelCatalogCommand } from "./commands/updateModelCatalogCommand.js";
import { registerOpenSettingsCommand } from "./commands/openSettingsCommand.js";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(registerScanWorkspaceCommand(context));
  context.subscriptions.push(registerOpenDashboardCommand(context));
  context.subscriptions.push(registerExportReportCommand(context));
  context.subscriptions.push(registerSetWorkspaceGoalCommand(context));
  context.subscriptions.push(registerCompareModelsCommand(context));
  context.subscriptions.push(registerGenerateAgentRulesCommand(context));
  context.subscriptions.push(registerUpdateModelCatalogCommand(context));
  context.subscriptions.push(registerOpenSettingsCommand());
}

export function deactivate() {}
