import assert from "node:assert/strict";
import * as vscode from "vscode";
import { generateRepoMapMarkdown, persistRepoMap } from "../../commands/generateRepoMapCommand.js";

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension("Sandesh13fr.tcalc");
  assert.ok(extension, "TCalc extension should be installed in the test host");
  await extension.activate();

  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes("workspaceModelAdvisor.scanWorkspace"));
  assert.ok(commands.includes("workspaceModelAdvisor.openDashboard"));
  assert.ok(extension.packageJSON.contributes.viewsContainers.activitybar.some((view: { id: string }) => view.id === "tcalc"));
  assert.ok(extension.packageJSON.contributes.views.tcalc.some((view: { id: string }) => view.id === "tcalc.sidebar"));

  const generationModes: boolean[] = [];
  const generated = generateRepoMapMarkdown(
    {} as never,
    8000,
    true,
    (_scan, options) => {
      generationModes.push(options.enableSymbolExtraction);
      if (options.enableSymbolExtraction) {
        throw new Error("symbol extraction failed");
      }
      return {} as never;
    },
    () => "# Basic repo map",
  );
  assert.deepEqual(generationModes, [true, false]);
  assert.equal(generated.markdown, "# Basic repo map");
  assert.equal(generated.fallbackError?.message, "symbol extraction failed");

  const saveUri = vscode.Uri.file("/tmp/repo-map.md");
  let writtenMarkdown = "";
  let persistedPath = "";
  const saved = await persistRepoMap(
    saveUri,
    "# Basic repo map",
    async (_uri, content) => {
      writtenMarkdown = new TextDecoder().decode(content);
    },
    async (savedPath) => {
      persistedPath = savedPath;
    },
  );
  assert.equal(saved, true);
  assert.equal(writtenMarkdown, "# Basic repo map");
  assert.equal(persistedPath, saveUri.fsPath);

  let cancellationSideEffect = false;
  const cancelled = await persistRepoMap(
    undefined,
    "# Basic repo map",
    async () => {
      cancellationSideEffect = true;
    },
    async () => {
      cancellationSideEffect = true;
    },
  );
  assert.equal(cancelled, false);
  assert.equal(cancellationSideEffect, false);
}
