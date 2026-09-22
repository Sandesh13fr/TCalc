import assert from "node:assert/strict";
import * as vscode from "vscode";
import { VIRTUAL_WORKSPACE_ERROR, isVirtualWorkspace } from "../../extension.js";

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension("Sandesh13fr.tcalc");
  assert.ok(extension, "TCalc extension should be installed in the test host");
  await extension.activate();

  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes("workspaceModelAdvisor.scanWorkspace"));
  assert.ok(commands.includes("workspaceModelAdvisor.openDashboard"));
  assert.ok(extension.packageJSON.contributes.viewsContainers.activitybar.some((view: { id: string }) => view.id === "tcalc"));
  assert.ok(extension.packageJSON.contributes.views.tcalc.some((view: { id: string }) => view.id === "tcalc.sidebar"));
  const fileChanges = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  const virtualProvider = vscode.workspace.registerFileSystemProvider("tcalc-test", {
    onDidChangeFile: fileChanges.event,
    stat: () => ({ type: vscode.FileType.Directory, ctime: 0, mtime: 0, size: 0 }),
    readDirectory: () => [],
    createDirectory: () => undefined,
    readFile: () => new Uint8Array(),
    writeFile: () => undefined,
    delete: () => undefined,
    rename: () => undefined,
    watch: () => new vscode.Disposable(() => undefined),
  });
  try {
    const virtualFolder: vscode.WorkspaceFolder = {
      uri: vscode.Uri.parse("tcalc-test://authority/workspace"),
      name: "virtual-workspace",
      index: 0,
    };
    assert.equal(isVirtualWorkspace([virtualFolder]), true);
    assert.match(VIRTUAL_WORKSPACE_ERROR, /reopen.*locally/i);
    assert.match(VIRTUAL_WORKSPACE_ERROR, /open folder/i);
  } finally {
    virtualProvider.dispose();
    fileChanges.dispose();
  }
}
