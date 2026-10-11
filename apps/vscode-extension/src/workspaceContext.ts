import * as vscode from "vscode";
import path from "node:path";
import type {
  ModelInfo,
  RecommendationResult,
  WorkspaceScanResult,
} from "@wma/core";

const WORKSPACE_STATE_KEY = "wma.workspaceState";
const ACTIVE_ROOT_KEY = "wma.activeRootPath";

export interface RootWorkspaceState {
  scan?: WorkspaceScanResult;
  recommendation?: RecommendationResult | null;
  models?: ModelInfo[];
  repoMapPath?: string;
}

export function normalizeRootPath(rootPath: string): string {
  const normalized = path.normalize(path.resolve(rootPath));
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

export async function selectWorkspaceRoot(
  rootPath?: string,
): Promise<string | undefined> {
  if (rootPath) return rootPath;

  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    vscode.window.showErrorMessage("Open a workspace folder first.");
    return undefined;
  }

  if (folders.length === 1) return folders[0].uri.fsPath;

  const selected = await vscode.window.showQuickPick(
    folders.map((folder) => ({
      label: folder.name,
      description: folder.uri.fsPath,
      rootPath: folder.uri.fsPath,
    })),
    { placeHolder: "Select a workspace folder" },
  );

  return selected?.rootPath;
}

export async function setActiveWorkspaceRoot(
  context: vscode.ExtensionContext,
  rootPath: string,
): Promise<void> {
  await context.workspaceState.update(ACTIVE_ROOT_KEY, rootPath);
}

export function getActiveWorkspaceRoot(
  context: vscode.ExtensionContext,
): string | undefined {
  const activeRoot = context.workspaceState.get<string>(ACTIVE_ROOT_KEY);
  if (!activeRoot) return undefined;

  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return undefined;

  const activeKey = normalizeRootPath(activeRoot);
  const currentFolder = folders.find(
    (folder) => normalizeRootPath(folder.uri.fsPath) === activeKey,
  );
  return currentFolder?.uri.fsPath ?? folders[0].uri.fsPath;
}

export function getWorkspaceState(
  context: vscode.ExtensionContext,
  rootPath: string,
): RootWorkspaceState {
  const allState =
    context.workspaceState.get<Record<string, RootWorkspaceState>>(
      WORKSPACE_STATE_KEY,
    ) ?? {};
  return allState[normalizeRootPath(rootPath)] ?? {};
}

export async function updateWorkspaceState(
  context: vscode.ExtensionContext,
  rootPath: string,
  update: Partial<RootWorkspaceState>,
): Promise<void> {
  const allState =
    context.workspaceState.get<Record<string, RootWorkspaceState>>(
      WORKSPACE_STATE_KEY,
    ) ?? {};
  const key = normalizeRootPath(rootPath);
  await context.workspaceState.update(WORKSPACE_STATE_KEY, {
    ...allState,
    [key]: {
      ...allState[key],
      ...update,
    },
  });
}
