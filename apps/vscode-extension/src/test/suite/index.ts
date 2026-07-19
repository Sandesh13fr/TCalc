import assert from "node:assert/strict";
import * as vscode from "vscode";

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension("Sandesh13fr.tcalc");
  assert.ok(extension, "TCalc extension should be installed in the test host");
  await extension.activate();

  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes("workspaceModelAdvisor.scanWorkspace"));
  assert.ok(commands.includes("workspaceModelAdvisor.openDashboard"));
  assert.ok(extension.packageJSON.contributes.viewsContainers.activitybar.some((view: { id: string }) => view.id === "tcalc"));
  assert.ok(extension.packageJSON.contributes.views.tcalc.some((view: { id: string }) => view.id === "tcalc.sidebar"));
}
