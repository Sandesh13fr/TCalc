import assert from "node:assert/strict";
import * as vscode from "vscode";
import { writeGeneratedRules } from "../../commands/writeGeneratedRules.js";

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension("Sandesh13fr.tcalc");
  assert.ok(extension, "TCalc extension should be installed in the test host");
  await extension.activate();

  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes("workspaceModelAdvisor.scanWorkspace"));
  assert.ok(commands.includes("workspaceModelAdvisor.openDashboard"));
  assert.ok(extension.packageJSON.contributes.viewsContainers.activitybar.some((view: { id: string }) => view.id === "tcalc"));
  assert.ok(extension.packageJSON.contributes.views.tcalc.some((view: { id: string }) => view.id === "tcalc.sidebar"));

  let writes = 0;
  const existingFs = {
    stat: async () => ({}),
    writeFile: async () => { writes += 1; },
  };
  const cancelled = await writeGeneratedRules({
    uri: "AGENTS.md",
    content: new TextEncoder().encode("rules"),
    fs: existingFs,
    confirmOverwrite: async () => false,
    isFileNotFound: () => false,
  });
  assert.equal(cancelled, "cancelled");
  assert.equal(writes, 0, "declining overwrite must preserve the existing file");

  await assert.rejects(
    writeGeneratedRules({
      uri: "AGENTS.md",
      content: new TextEncoder().encode("rules"),
      fs: {
        stat: async () => { throw Object.assign(new Error("missing"), { code: "FileNotFound" }); },
        writeFile: async () => { throw new Error("disk full"); },
      },
      confirmOverwrite: async () => true,
      isFileNotFound: error => (error as { code?: string }).code === "FileNotFound",
    }),
    /disk full/,
    "write failures must propagate to the command error path",
  );
}
