import * as vscode from "vscode";
import path from "node:path";
import { loadModelCatalog, validateModelCatalog } from "@wma/model-catalog";

export function registerUpdateModelCatalogCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand("workspaceModelAdvisor.updateModelCatalog", async () => {
    const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const extPath = context.extensionUri.fsPath;

    const messages: string[] = [];

    const bundledPath = path.join(extPath, "catalogs");
    const bundledCatalog = loadModelCatalog(bundledPath);
    messages.push(`Bundled catalog: ${bundledCatalog.models.length} model(s) loaded.`);

    if (bundledCatalog.models.length > 0) {
      const bundledWarnings = validateModelCatalog(bundledCatalog.models);
      if (bundledWarnings.length > 0) {
        messages.push(`Bundled catalog warnings (${bundledWarnings.length}):`);
        bundledWarnings.forEach(w => messages.push(`  - ${w}`));
      } else {
        messages.push("Bundled catalog validation: OK");
      }
    }

    if (rootPath) {
      const workspaceCatalogPath1 = path.join(rootPath, "catalogs", "models.json");
      const workspaceCatalogPath2 = path.join(rootPath, ".tcalc", "models.json");

      // Missing files already return an empty catalog; only surface real
      // load failures (syntax, permission, ...) as diagnostics.
      try {
        const wsCatalog1 = loadModelCatalog(workspaceCatalogPath1, { warnIfMissing: false });
        if (wsCatalog1.models.length > 0) {
          messages.push(`Workspace override (catalogs/models.json): ${wsCatalog1.models.length} model(s).`);
          const wsWarnings = validateModelCatalog(wsCatalog1.models);
          if (wsWarnings.length > 0) {
            wsWarnings.forEach(w => messages.push(`  Workspace warning: ${w}`));
          }
        }
      } catch (error) {
        messages.push(`Workspace override (catalogs/models.json) error: ${error instanceof Error ? error.message : String(error)}`);
      }

      try {
        const wsCatalog2 = loadModelCatalog(workspaceCatalogPath2, { warnIfMissing: false });
        if (wsCatalog2.models.length > 0) {
          messages.push(`Workspace override (.tcalc/models.json): ${wsCatalog2.models.length} model(s).`);
          const wsWarnings2 = validateModelCatalog(wsCatalog2.models);
          if (wsWarnings2.length > 0) {
            wsWarnings2.forEach(w => messages.push(`  Workspace warning: ${w}`));
          }
        }
      } catch (error) {
        messages.push(`Workspace override (.tcalc/models.json) error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    messages.push("");
    messages.push("Optional feeds are explicit: use `wma catalog fetch <https-url> --output .tcalc/models.json`, then rerun this check.");

    vscode.window.showInformationMessage("Catalog check complete", { modal: true, detail: messages.join("\n") });
  });
}
