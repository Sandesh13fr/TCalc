import { beforeEach, describe, expect, it, vi } from "vitest";

const vscodeMock = {
  workspace: {
    workspaceFolders: undefined as
      Array<{ name: string; uri: { fsPath: string } }> | undefined,
  },
  window: {
    showErrorMessage: vi.fn(),
    showQuickPick: vi.fn(),
  },
};

vi.mock("vscode", () => vscodeMock, { virtual: true });

const {
  getActiveWorkspaceRoot,
  getWorkspaceState,
  normalizeRootPath,
  selectWorkspaceRoot,
  updateWorkspaceState,
} = await import("../src/workspaceContext.js");

function createContext() {
  const values = new Map<string, unknown>();
  return {
    workspaceState: {
      get: <T>(key: string) => values.get(key) as T | undefined,
      update: async (key: string, value: unknown) => {
        values.set(key, value);
      },
    },
  } as never;
}

describe("workspace context", () => {
  beforeEach(() => {
    vscodeMock.workspace.workspaceFolders = undefined;
    vscodeMock.window.showErrorMessage.mockReset();
    vscodeMock.window.showQuickPick.mockReset();
  });

  it("uses the only workspace root without showing a picker", async () => {
    const root = { name: "alpha", uri: { fsPath: "C:/work/alpha" } };
    vscodeMock.workspace.workspaceFolders = [root];

    await expect(selectWorkspaceRoot()).resolves.toBe(root.uri.fsPath);
    expect(vscodeMock.window.showQuickPick).not.toHaveBeenCalled();
  });

  it("returns the selected root from a multi-root workspace", async () => {
    const roots = [
      { name: "alpha", uri: { fsPath: "C:/work/alpha" } },
      { name: "beta", uri: { fsPath: "C:/work/beta" } },
    ];
    vscodeMock.workspace.workspaceFolders = roots;
    vscodeMock.window.showQuickPick.mockResolvedValue({
      rootPath: roots[1].uri.fsPath,
    });

    await expect(selectWorkspaceRoot()).resolves.toBe(roots[1].uri.fsPath);
    expect(vscodeMock.window.showQuickPick).toHaveBeenCalledWith(
      [
        {
          label: "alpha",
          description: "C:/work/alpha",
          rootPath: "C:/work/alpha",
        },
        {
          label: "beta",
          description: "C:/work/beta",
          rootPath: "C:/work/beta",
        },
      ],
      { placeHolder: "Select a workspace folder" },
    );
  });

  it("stops cleanly when root selection is cancelled or no workspace is open", async () => {
    vscodeMock.workspace.workspaceFolders = [
      { name: "alpha", uri: { fsPath: "C:/work/alpha" } },
      { name: "beta", uri: { fsPath: "C:/work/beta" } },
    ];
    vscodeMock.window.showQuickPick.mockResolvedValue(undefined);
    await expect(selectWorkspaceRoot()).resolves.toBeUndefined();

    vscodeMock.workspace.workspaceFolders = undefined;
    await expect(selectWorkspaceRoot()).resolves.toBeUndefined();
    expect(vscodeMock.window.showErrorMessage).toHaveBeenCalledWith(
      "Open a workspace folder first.",
    );
  });

  it("keeps state independent for two normalized roots", async () => {
    const context = createContext();
    const rootA = "C:/work/alpha";
    const rootB = "C:/work/beta";

    await updateWorkspaceState(context, rootA, {
      scan: { rootPath: rootA } as never,
      repoMapPath: "alpha-map.md",
    });
    await updateWorkspaceState(context, rootB, {
      scan: { rootPath: rootB } as never,
      repoMapPath: "beta-map.md",
    });

    expect(getWorkspaceState(context, rootA)).toMatchObject({
      scan: { rootPath: rootA },
      repoMapPath: "alpha-map.md",
    });
    expect(getWorkspaceState(context, rootB)).toMatchObject({
      scan: { rootPath: rootB },
      repoMapPath: "beta-map.md",
    });
    expect(getWorkspaceState(context, "C:/work/missing")).toEqual({});
    expect(normalizeRootPath(`${rootA}/`)).toBe(normalizeRootPath(rootA));
  });

  it("falls back when the active root is no longer available", async () => {
    const context = createContext();
    const fallbackRoot = { name: "beta", uri: { fsPath: "C:/work/beta" } };
    await context.workspaceState.update(
      "wma.activeRootPath",
      "C:/work/removed",
    );
    vscodeMock.workspace.workspaceFolders = [fallbackRoot];

    expect(getActiveWorkspaceRoot(context)).toBe(fallbackRoot.uri.fsPath);

    vscodeMock.workspace.workspaceFolders = undefined;
    expect(getActiveWorkspaceRoot(context)).toBeUndefined();
  });
});
