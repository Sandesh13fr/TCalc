import * as vscode from "vscode";

const WELCOME_SEEN_KEY = "wma.welcomeSeen";

const welcomeMessage = [
  "## \u2705 Workspace Model Advisor (TCalc)",
  "",
  "**Local-first** — no code leaves your machine.",
  "**No telemetry** — nothing is tracked or sent.",
  "**No cloud calls** — everything runs locally.",
  "",
  "### Get started",
  "",
  "1. **Scan Workspace** \u2014 estimate token usage across your project",
  "2. **Compare Models** \u2014 find the cheapest sufficient model",
  "3. **Generate Repo Map** \u2014 build structured context for coding agents",
  "4. **Generate Agent Rules** \u2014 create .clinerules / cursor rules",
  "",
  "Use `TCalc: Quick Start` for a step-by-step guide.",
].join("\n");

export function registerShowWelcomeCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand("workspaceModelAdvisor.showWelcome", async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: welcomeMessage,
      language: "markdown",
    });
    await vscode.window.showTextDocument(doc, { preserveFocus: true, viewColumn: vscode.ViewColumn.Active });
  });
}

export async function showWelcomeOnFirstActivation(context: vscode.ExtensionContext): Promise<void> {
  const seen = context.globalState.get<boolean>(WELCOME_SEEN_KEY);
  if (seen) return;

  await context.globalState.update(WELCOME_SEEN_KEY, true);

  const selection = await vscode.window.showInformationMessage(
    "Welcome to TCalc \u2014 local-first workspace token analyzer and model recommender.",
    { modal: false },
    "Scan Workspace",
    "View Docs",
    "Dismiss",
  );

  if (selection === "Scan Workspace") {
    vscode.commands.executeCommand("workspaceModelAdvisor.scanWorkspace");
  } else if (selection === "View Docs") {
    vscode.env.openExternal(vscode.Uri.parse("https://github.com/Sandesh13fr/TCalc#readme"));
  }
}
