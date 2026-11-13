import { beforeEach, describe, expect, it, vi } from "vitest";

const roots = {
  alpha: "C:/work/alpha",
  beta: "C:/work/beta",
};

const goals = new Map([
  [roots.alpha, "Goal A"],
  [roots.beta, "Goal B"],
]);
const registeredCommands = new Map<string, (...args: any[]) => unknown>();
const scanGoals: string[] = [];
const workspaceValues = new Map<string, unknown>();

const vscodeMock = {
  ConfigurationTarget: { WorkspaceFolder: "workspace-folder" },
  ProgressLocation: { Notification: "notification" },
  Uri: {
    file: (fsPath: string) => ({ fsPath }),
  },
  workspace: {
    openTextDocument: vi.fn(async () => ({})),
    fs: { writeFile: vi.fn(async () => undefined) },
    workspaceFolders: [
      { name: "alpha", uri: { fsPath: roots.alpha } },
      { name: "beta", uri: { fsPath: roots.beta } },
    ],
    getConfiguration: vi.fn((_: string, resource?: { fsPath: string }) => {
      const rootPath = resource?.fsPath;
      return {
        get: <T>(key: string) =>
          (key === "defaultGoal" && rootPath
            ? goals.get(rootPath)
            : undefined) as T | undefined,
        update: async (key: string, value: string, target: unknown) => {
          expect(key).toBe("defaultGoal");
          expect(target).toBe(vscodeMock.ConfigurationTarget.WorkspaceFolder);
          goals.set(rootPath!, value);
        },
      };
    }),
  },
  commands: {
    registerCommand: vi.fn(
      (id: string, handler: (...args: any[]) => unknown) => {
        registeredCommands.set(id, handler);
        return { dispose: vi.fn() };
      },
    ),
    executeCommand: vi.fn(),
  },
  window: {
    showTextDocument: vi.fn(),
    showSaveDialog: vi.fn(),
    showErrorMessage: vi.fn(),
    showQuickPick: vi.fn(),
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    withProgress: vi.fn(
      async (
        _options: unknown,
        callback: (progress: unknown, token: unknown) => Promise<void>,
      ) =>
        callback(
          { report: vi.fn() },
          {
            isCancellationRequested: false,
            onCancellationRequested: () => ({ dispose: vi.fn() }),
          },
        ),
    ),
  },
};

vi.mock("vscode", () => vscodeMock, { virtual: true });
vi.mock("@wma/scanner", () => ({
  scanWorkspace: vi.fn(async ({ rootPath }: { rootPath: string }) => ({
    rootPath,
    scannedAt: new Date().toISOString(),
    includedFiles: 1,
    includedTokens: 100,
    totalEstimatedTokens: 100,
    warnings: [],
  })),
}));
vi.mock("@wma/model-catalog", () => ({
  applyModelProfile: (models: unknown[]) => models,
  loadModelCatalog: () => ({ models: [{ id: "model-1" }] }),
  validateModelCatalog: () => [],
}));
vi.mock("@wma/recommender", () => ({
  recommendModels: vi.fn(({ goal }: { goal: string }) => {
    scanGoals.push(goal);
    return null;
  }),
}));
vi.mock("@wma/core", () => ({
  getActiveModelProfile: () => undefined,
  loadTeamPolicy: async () => undefined,
  WORKSPACE_GOALS: ["Goal A", "Goal B", "Goal B Updated"],
}));
vi.mock("@wma/repo-map", () => ({
  createRepoMap: vi.fn(),
  formatRepoMapMarkdown: vi.fn(() => "# Basic map"),
}));

const { registerScanWorkspaceCommand } =
  await import("../src/commands/scanWorkspaceCommand.js");
const { registerSetWorkspaceGoalCommand } =
  await import("../src/commands/setWorkspaceGoalCommand.js");
const { TCalcSidebarProvider } =
  await import("../src/views/sidebarProvider.js");
const { getWorkspaceState } = await import("../src/workspaceContext.js");
const { updateWorkspaceState } = await import("../src/workspaceContext.js");
const { createRepoMap } = await import("@wma/repo-map");
const { registerGenerateRepoMapCommand } =
  await import("../src/commands/generateRepoMapCommand.js");

function createContext() {
  return {
    extensionUri: { fsPath: "C:/extension" },
    workspaceState: {
      get: <T>(key: string) => workspaceValues.get(key) as T | undefined,
      update: async (key: string, value: unknown) => {
        workspaceValues.set(key, value);
      },
    },
  } as never;
}

async function runCommand(id: string, ...args: any[]): Promise<void> {
  await registeredCommands.get(id)?.(...args);
}

describe("VS Code multi-root commands", () => {
  beforeEach(() => {
    goals.set(roots.alpha, "Goal A");
    goals.set(roots.beta, "Goal B");
    workspaceValues.clear();
    registeredCommands.clear();
    scanGoals.length = 0;
    vi.clearAllMocks();
  });

  it("isolates goals, scans, state, and sidebar display per workspace root", async () => {
    const context = createContext();
    registerSetWorkspaceGoalCommand(context);
    registerScanWorkspaceCommand(context);

    vscodeMock.window.showQuickPick.mockResolvedValueOnce({
      label: "Goal A",
    });
    await runCommand("workspaceModelAdvisor.setWorkspaceGoal", roots.alpha);
    expect(vscodeMock.window.showQuickPick).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ label: "Goal A", description: "current" }),
      ]),
      { placeHolder: "Select workspace goal" },
    );

    vscodeMock.window.showQuickPick.mockResolvedValueOnce({
      label: "Goal B Updated",
    });
    await runCommand("workspaceModelAdvisor.setWorkspaceGoal", roots.beta);
    expect(vscodeMock.window.showQuickPick.mock.calls[1][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Goal B", description: "current" }),
      ]),
    );
    expect(goals.get(roots.alpha)).toBe("Goal A");
    expect(goals.get(roots.beta)).toBe("Goal B Updated");
    expect(vscodeMock.workspace.getConfiguration).toHaveBeenCalledWith("wma", {
      fsPath: roots.beta,
    });

    await runCommand("workspaceModelAdvisor.scanWorkspace", roots.alpha);
    await runCommand("workspaceModelAdvisor.scanWorkspace", roots.beta);

    expect(scanGoals).toEqual(["Goal A", "Goal B Updated"]);
    expect(getWorkspaceState(context, roots.alpha).scan).toMatchObject({
      rootPath: roots.alpha,
    });
    expect(getWorkspaceState(context, roots.beta).scan).toMatchObject({
      rootPath: roots.beta,
    });

    let sidebarHtml = "";
    const view = {
      webview: {
        options: undefined,
        onDidReceiveMessage: vi.fn(),
        set html(value: string) {
          sidebarHtml = value;
        },
      },
    } as never;
    const sidebar = new TCalcSidebarProvider(context);
    await runCommand("workspaceModelAdvisor.scanWorkspace", roots.beta);
    sidebar.resolveWebviewView(view);
    expect(sidebarHtml).toContain("Goal B Updated");
    expect(sidebarHtml).not.toContain("Goal A");
  });

  it.each(["save", "cancel", "write failure"])(
    "preserves fallback document and root state on %s",
    async (outcome) => {
      const context = createContext();
      const scan = { rootPath: roots.beta } as never;
      await updateWorkspaceState(context, roots.beta, { scan });
      registerGenerateRepoMapCommand(context);
      vscodeMock.window.showQuickPick
        .mockResolvedValueOnce({ value: true })
        .mockResolvedValueOnce({ value: 8000 });
      vi.mocked(createRepoMap)
        .mockImplementationOnce(() => {
          throw new Error("analysis failed");
        })
        .mockReturnValueOnce({} as never);
      const saveUri = { fsPath: "C:/saved/map.md" };
      vscodeMock.window.showSaveDialog.mockResolvedValueOnce(
        outcome === "cancel" ? undefined : saveUri,
      );
      if (outcome === "write failure") {
        vscodeMock.workspace.fs.writeFile.mockRejectedValueOnce(
          new Error("disk full"),
        );
      }

      await runCommand("workspaceModelAdvisor.generateRepoMap", roots.beta);

      expect(createRepoMap).toHaveBeenNthCalledWith(2, scan, {
        tokenBudget: 8000,
        enableSymbolExtraction: false,
      });
      expect(vscodeMock.workspace.openTextDocument).toHaveBeenCalledWith({
        content: "# Basic map",
        language: "markdown",
      });
      expect(vscodeMock.window.showSaveDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultUri: {
            fsPath: expect.stringMatching(/beta[\\/]repo-map\.md$/),
          },
        }),
      );
      expect(
        getWorkspaceState(context, roots.alpha).repoMapPath,
      ).toBeUndefined();
      expect(getWorkspaceState(context, roots.beta).repoMapPath).toBe(
        outcome === "save" ? saveUri.fsPath : undefined,
      );
      expect(vscodeMock.workspace.fs.writeFile).toHaveBeenCalledTimes(
        outcome === "cancel" ? 0 : 1,
      );
      if (outcome !== "cancel") {
        expect(vscodeMock.workspace.fs.writeFile).toHaveBeenCalledWith(
          saveUri,
          new TextEncoder().encode("# Basic map"),
        );
      }
      if (outcome === "write failure") {
        expect(vscodeMock.window.showErrorMessage).toHaveBeenCalledWith(
          "Failed to save repo map: disk full",
        );
        expect(vscodeMock.window.showInformationMessage).not.toHaveBeenCalled();
      }
    },
  );
});
