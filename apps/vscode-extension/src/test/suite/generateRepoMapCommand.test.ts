import assert from "node:assert/strict";
import * as vscode from "vscode";
import path from "node:path";
import { deps } from "../../commands/generateRepoMapCommand.js";

export async function testGenerateRepoMapCommand() {
  const extension = vscode.extensions.getExtension("Sandesh13fr.tcalc")!;
  await extension.activate();

  const originalShowQuickPick = vscode.window.showQuickPick;
  const originalShowSaveDialog = vscode.window.showSaveDialog;
  const originalShowTextDocument = vscode.window.showTextDocument;
  const originalShowWarningMessage = vscode.window.showWarningMessage;
  const originalShowErrorMessage = vscode.window.showErrorMessage;
  const originalOpenTextDocument = vscode.workspace.openTextDocument;
  const originalCreateRepoMap = deps.createRepoMap;
  const originalWriteFile = deps.writeFile;
  const originalWorkspaceFolders = vscode.workspace.workspaceFolders;

  let quickPickCount = 0;
  let saveDialogCalled = false;
  let textDocumentOpened = false;
  let warningMessageShown = false;
  let errorMessageShown = false;

  // First, ensure we have a scan in the workspace state
  await vscode.commands.executeCommand("workspaceModelAdvisor.scanWorkspace");

  try {
    const context = deps.getContext()!;
    assert.ok(context, "Extension context should be captured");

    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      get: () => [{ uri: vscode.Uri.file("/fake/workspace") }],
      configurable: true
    });

    // Clean up and setup state
    await context.workspaceState.update("wma.repoMapPath", undefined);
    await context.workspaceState.update("wma.lastScan", {
      folders: [],
      languages: [],
      files: [],
      rootPath: "/",
      totalFiles: 0,
      totalEstimatedTokens: 0,
      includedFiles: 0,
      excludedFiles: 0
    });

    // Test 1: Cancellation -> no save/state update
    Object.defineProperty(vscode.window, 'showQuickPick', {
      value: async () => undefined, // Cancel on first prompt
      configurable: true
    });

    await vscode.commands.executeCommand("workspaceModelAdvisor.generateRepoMap");
    assert.ok(true, "Cancellation path completed without errors");
    
    let updatedPath = context.workspaceState.get("wma.repoMapPath");
    assert.equal(updatedPath, undefined, "Cancellation should not update state");

    // Test 2: Code-aware createRepoMap throws -> fallback is executed -> successful save -> state updated
    quickPickCount = 0;
    Object.defineProperty(vscode.window, 'showQuickPick', {
      value: async (items: any[]) => {
        quickPickCount++;
        if (quickPickCount === 1) {
          return { value: true }; // Force code-aware map
        } else {
          return { value: 2000 };
        }
      },
      configurable: true
    });

    Object.defineProperty(vscode.workspace, 'openTextDocument', {
      value: async (options: any) => {
        textDocumentOpened = true;
        return { uri: vscode.Uri.file("untitled:repo-map.md") }; // mock doc
      },
      configurable: true
    });

    Object.defineProperty(vscode.window, 'showTextDocument', {
      value: async () => undefined,
      configurable: true
    });

    Object.defineProperty(vscode.window, 'showWarningMessage', {
      value: async (msg: string) => {
        if (msg.includes("Code-aware repo map failed")) {
          warningMessageShown = true;
        }
        return undefined;
      },
      configurable: true
    });

    let fakeSaveUri = vscode.Uri.file(path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "/fake/path", "repo-map-test.md"));
    Object.defineProperty(vscode.window, 'showSaveDialog', {
      value: async () => {
        saveDialogCalled = true;
        return fakeSaveUri;
      },
      configurable: true
    });

    // Mock createRepoMap to throw when enableSymbolExtraction is true
    let fallbackExecuted = false;
    deps.createRepoMap = (scanResult: any, options: any) => {
      if (options.enableSymbolExtraction) {
        throw new Error("Code-aware failure");
      }
      fallbackExecuted = true;
      return { 
        rootPath: "/",
        generatedAt: new Date().toISOString(),
        tokenBudget: 2000,
        estimatedTokens: 0,
        workspaceTotalTokens: 0,
        summary: "Fallback map",
        topLevelFolders: [],
        languageBreakdown: [],
        importantFiles: [],
        entryPoints: [],
        testFiles: [],
        configFiles: [],
        documentationFiles: [],
        riskyFiles: [],
        largeFiles: [],
        generatedFiles: [],
        excludedFiles: [],
        recommendedInclude: [],
        recommendedExclude: [],
        agentInstructions: [],
        overflowNotes: [],
        symbols: [],
        imports: [],
        routes: [],
        symbolSummary: [],
      } as any;
    };

    let writeShouldFail = false;
    let fileWritten = false;
    deps.writeFile = async (uri: vscode.Uri, content: Uint8Array) => {
      if (writeShouldFail) throw new Error("Mock write failure");
      fileWritten = true;
    };

    await vscode.commands.executeCommand("workspaceModelAdvisor.generateRepoMap");

    assert.ok(warningMessageShown, "Warning message should be shown on code-aware failure");
    assert.ok(fallbackExecuted, "Fallback should be executed when code-aware fails");
    assert.ok(saveDialogCalled, "Save dialog should be called for fallback result");
    assert.ok(fileWritten, "File should be written for fallback result");
    
    updatedPath = context.workspaceState.get("wma.repoMapPath");
    assert.equal(updatedPath, fakeSaveUri.fsPath, "wma.repoMapPath should be updated on successful write");

    // Test 3: Write failure -> wma.repoMapPath is not updated
    quickPickCount = 0;
    saveDialogCalled = false;
    fileWritten = false;
    await context.workspaceState.update("wma.repoMapPath", undefined);
    
    Object.defineProperty(vscode.window, 'showErrorMessage', {
      value: async (msg: string) => {
        errorMessageShown = true;
        return undefined;
      },
      configurable: true
    });

    writeShouldFail = true;

    await vscode.commands.executeCommand("workspaceModelAdvisor.generateRepoMap");

    assert.ok(errorMessageShown, "Error message should be shown on write failure");
    updatedPath = context.workspaceState.get("wma.repoMapPath");
    assert.equal(updatedPath, undefined, "wma.repoMapPath should NOT be updated on write failure");

  } finally {
    Object.defineProperty(vscode.window, 'showQuickPick', { value: originalShowQuickPick, configurable: true });
    Object.defineProperty(vscode.window, 'showSaveDialog', { value: originalShowSaveDialog, configurable: true });
    Object.defineProperty(vscode.window, 'showTextDocument', { value: originalShowTextDocument, configurable: true });
    Object.defineProperty(vscode.window, 'showWarningMessage', { value: originalShowWarningMessage, configurable: true });
    Object.defineProperty(vscode.window, 'showErrorMessage', { value: originalShowErrorMessage, configurable: true });
    Object.defineProperty(vscode.workspace, 'openTextDocument', { value: originalOpenTextDocument, configurable: true });
    Object.defineProperty(vscode.workspace, 'workspaceFolders', { get: () => originalWorkspaceFolders, configurable: true });
    deps.writeFile = originalWriteFile;
    deps.createRepoMap = originalCreateRepoMap;
  }
}
