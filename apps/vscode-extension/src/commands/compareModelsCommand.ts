import * as vscode from "vscode";
import { randomUUID } from "node:crypto";
import type { RecommendationResult, ModelRecommendation, ModelInfo } from "@wma/core";

export function registerCompareModelsCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand("workspaceModelAdvisor.compareModels", () => {
    const lastScan = context.workspaceState.get<unknown>("wma.lastScan");
    const lastRecommendation = context.workspaceState.get<unknown>("wma.lastRecommendation") as RecommendationResult | null;
    const lastModels = context.workspaceState.get<unknown>("wma.lastModels") as ModelInfo[] | null;

    if (!lastScan || !lastRecommendation) {
      vscode.window.showInformationMessage("Run a workspace scan first.");
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "wmaCompareModels",
      "Model Comparison",
      vscode.ViewColumn.One,
      { enableScripts: false, localResourceRoots: [] },
    );

    const tiers = [
      lastRecommendation.cheapestSufficient,
      lastRecommendation.balanced,
      lastRecommendation.highConfidence,
    ];

    const otherModels = lastRecommendation.allScored.filter(
      m => !tiers.some(t => t.modelId === m.modelId),
    );

    panel.webview.html = getComparisonHtml(panel.webview, randomUUID(), tiers, otherModels, lastModels ?? []);
  });
}

function fmtCost(cost: number): string {
  return `$${cost.toFixed(6)}`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getModelInfo(modelId: string, models: ModelInfo[]): ModelInfo | undefined {
  return models.find(m => m.id === modelId);
}

function getComparisonHtml(
  webview: vscode.Webview,
  nonce: string,
  tiers: ModelRecommendation[],
  otherModels: ModelRecommendation[],
  models: ModelInfo[],
): string {
  const allModels = [...tiers, ...otherModels];

  const fitRows = allModels.map(m => {
    const e = m.costEstimate;
    const oneTurnCost = e.totalCost;
    const tenTurnCost = oneTurnCost * 10;
    return `
    <tr>
      <td><strong>${escapeHtml(m.displayName)}</strong><br><span class="muted">${escapeHtml(m.modelId)}</span></td>
      <td>${escapeHtml(m.tier)}</td>
      <td class="num">${(m.score.totalScore * 100).toFixed(0)}</td>
      <td class="num">${escapeHtml(m.expectedQuality)}</td>
      <td class="num">${fmtCost(oneTurnCost)}</td>
      <td class="num">${fmtCost(tenTurnCost)}</td>
      <td class="reason">${m.reasons.slice(0, 2).map(r => escapeHtml(r)).join("<br>")}</td>
    </tr>`;
  }).join("");

  const modelRows = allModels.map(m => {
    const mi = getModelInfo(m.modelId, models);
    const contextWindow = mi?.contextWindow?.toLocaleString() ?? "—";
    const provider = mi?.provider ?? "—";
    const inputPrice = mi?.inputPricePerMillion != null ? `$${mi.inputPricePerMillion.toFixed(4)}/M` : "—";
    const outputPrice = mi?.outputPricePerMillion != null ? `$${mi.outputPricePerMillion.toFixed(4)}/M` : "—";
    return `
    <tr>
      <td><strong>${escapeHtml(m.displayName)}</strong></td>
      <td class="num">${contextWindow}</td>
      <td>${escapeHtml(provider)}</td>
      <td class="num">${inputPrice}</td>
      <td class="num">${outputPrice}</td>
      <td class="num">${fmtCost(m.costEstimate.totalCost)}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Model Comparison</title>
  <style nonce="${nonce}">
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); }
    h1 { font-size: 1.4em; }
    h2 { font-size: 1.1em; margin-top: 24px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85em; }
    th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--vscode-panel-border); }
    th { color: var(--vscode-descriptionForeground); font-weight: 500; text-transform: uppercase; font-size: 0.8em; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .reason { font-size: 0.85em; color: var(--vscode-descriptionForeground); }
    .muted { color: var(--vscode-descriptionForeground); font-size: 0.85em; }
  </style>
</head>
<body>
  <h1>Model Comparison</h1>
  <p>Comparing ${allModels.length} model(s) based on workspace scan.</p>

  <h2>Fit Summary</h2>
  <table>
    <tr><th>Model</th><th>Tier</th><th class="num">Score</th><th class="num">Quality</th><th class="num">1-Turn Cost</th><th class="num">10-Turn Cost</th><th>Reasons</th></tr>
    ${fitRows}
  </table>

  <h2>All Models</h2>
  <table>
    <tr><th>Model</th><th class="num">Context Window</th><th>Provider</th><th class="num">Input Price</th><th class="num">Output Price</th><th class="num">Est. Cost</th></tr>
    ${modelRows}
  </table>
</body>
</html>`;
}
