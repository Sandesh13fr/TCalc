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

const { registerScanWorkspaceCommand } =
  await import("../src/commands/scanWorkspaceCommand.js");
const { registerSetWorkspaceGoalCommand } =
  await import("../src/commands/setWorkspaceGoalCommand.js");
const { TCalcSidebarProvider } =
  await import("../src/views/sidebarProvider.js");
const { getWorkspaceState } = await import("../src/workspaceContext.js");

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
});
