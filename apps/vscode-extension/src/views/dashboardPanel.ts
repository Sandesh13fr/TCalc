import * as vscode from "vscode";
import type { WorkspaceScanResult, RecommendationResult, ModelRecommendation } from "@wma/core";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function createDashboardPanel(
  context: vscode.ExtensionContext,
  scanResult: WorkspaceScanResult,
  recommendation: RecommendationResult | null,
): vscode.WebviewPanel {
  const panel = vscode.window.createWebviewPanel(
    "wmaDashboard",
    "Workspace Model Advisor",
    vscode.ViewColumn.One,
    { enableScripts: true, localResourceRoots: [] },
  );

  const webview = panel.webview;
  const nonce = getNonce();

  webview.html = getHtml(webview, nonce, scanResult, recommendation);

  webview.onDidReceiveMessage((message) => {
    switch (message.command) {
      case "exportReport":
        vscode.commands.executeCommand("workspaceModelAdvisor.exportReport");
        break;
      case "rescan":
        vscode.commands.executeCommand("workspaceModelAdvisor.scanWorkspace");
        break;
      case "changeGoal":
        vscode.commands.executeCommand("workspaceModelAdvisor.setWorkspaceGoal");
        break;
      case "compareModels":
        vscode.commands.executeCommand("workspaceModelAdvisor.compareModels");
        break;
      case "generateAgentRules":
        vscode.commands.executeCommand("workspaceModelAdvisor.generateAgentRules");
        break;
    }
  });

  return panel;
}

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 64; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function getHtml(
  webview: vscode.Webview,
  nonce: string,
  scan: WorkspaceScanResult,
  recommendation: RecommendationResult | null,
): string {
  const sortedFiles = [...scan.files]
    .filter((f) => f.included)
    .sort((a, b) => b.estimatedTokens - a.estimatedTokens);
  const topFiles = sortedFiles.slice(0, 10);

  const sortedFolders = [...scan.folders]
    .filter((f) => f.includedFiles > 0)
    .sort((a, b) => b.totalTokens - a.totalTokens);
  const topFolders = sortedFolders.slice(0, 10);

  const sortedLangs = [...scan.languages].sort((a, b) => b.totalTokens - a.totalTokens);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Workspace Model Advisor</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background, #1e1e1e);
      --fg: var(--vscode-editor-foreground, #d4d4d4);
      --border: var(--vscode-panel-border, #333);
      --card-bg: var(--vscode-editor-inactiveSelectionBackground, #2a2d2e);
      --heading: var(--vscode-editor-foreground, #e0e0e0);
      --accent: var(--vscode-textLink-foreground, #3794ff);
      --success: #4ec9b0;
      --warning: #cca700;
      --error: #f14c4c;
      --muted: var(--vscode-descriptionForeground, #8c8c8c);
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--fg);
      padding: 20px;
      line-height: 1.5;
      margin: 0;
    }
    h1, h2, h3 { color: var(--heading); font-weight: 600; }
    h1 { font-size: 1.6em; margin-top: 0; }
    h2 { font-size: 1.2em; border-bottom: 1px solid var(--border); padding-bottom: 6px; margin-top: 28px; }
    h3 { font-size: 1.05em; margin: 16px 0 8px; }
    .cards { display: flex; gap: 12px; flex-wrap: wrap; margin: 12px 0; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 14px 18px;
      flex: 1 1 160px;
      min-width: 140px;
    }
    .card-label { font-size: 0.78em; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .card-value { font-size: 1.5em; font-weight: 700; margin-top: 4px; }
    .card-rec { flex: 1 1 200px; min-width: 180px; }
    .rec-name { font-weight: 600; font-size: 1.05em; }
    .rec-detail { font-size: 0.85em; color: var(--muted); margin-top: 4px; }
    .rec-score { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 0.85em; font-weight: 600; }
    .score-high { background: #1a3a2a; color: var(--success); }
    .score-med { background: #3a351a; color: var(--warning); }
    .score-low { background: #3a1a1a; color: var(--error); }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 4px;
      font-size: 0.9em;
    }
    th, td {
      text-align: left;
      padding: 6px 10px;
      border-bottom: 1px solid var(--border);
    }
    th { color: var(--muted); font-weight: 500; font-size: 0.85em; text-transform: uppercase; }
    td { font-variant-numeric: tabular-nums; }
    .path { font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", monospace; font-size: 0.9em; }
    .warn-list { padding-left: 18px; }
    .warn-list li { margin: 4px 0; }
    .assumptions-list { padding-left: 18px; color: var(--muted); font-size: 0.9em; }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--accent); color: #fff; border: none; border-radius: 4px;
      padding: 8px 18px; font-size: 0.9em; cursor: pointer; margin: 12px 0 8px;
    }
    .btn:hover { opacity: 0.85; }
    .section-note { color: var(--muted); font-size: 0.85em; }
    td.num { text-align: right; }
    th.num { text-align: right; }
  </style>
</head>
<body>
  <h1>Workspace Model Advisor</h1>

  <h2>Summary</h2>
  <div class="cards">
    <div class="card">
      <div class="card-label">Total Files</div>
      <div class="card-value">${scan.totalFiles.toLocaleString()}</div>
      <div class="rec-detail">${scan.includedFiles.toLocaleString()} included / ${scan.excludedFiles.toLocaleString()} excluded</div>
    </div>
    <div class="card">
      <div class="card-label">Total Estimated Tokens</div>
      <div class="card-value">${scan.totalEstimatedTokens.toLocaleString()}</div>
      <div class="rec-detail">${scan.includedTokens.toLocaleString()} included tokens</div>
    </div>
    <div class="card">
      <div class="card-label">Included / Excluded</div>
      <div class="card-value">${((scan.includedFiles / Math.max(scan.totalFiles, 1)) * 100).toFixed(0)}%</div>
      <div class="rec-detail">${scan.includedFiles.toLocaleString()} of ${scan.totalFiles.toLocaleString()} files included</div>
    </div>
  </div>

  ${recommendation ? `
  <h2>Recommendations</h2>
  <div class="cards">
    ${renderRecCard("Cheapest Sufficient", recommendation.cheapestSufficient)}
    ${renderRecCard("Balanced", recommendation.balanced)}
    ${renderRecCard("High Confidence", recommendation.highConfidence)}
  </div>
  ` : `
  <h2>Recommendations</h2>
  <p class="section-note">No model recommendations available. The model catalog may be empty.</p>
  `}

  <h2>Top Files by Tokens</h2>
  ${topFiles.length > 0 ? `
  <table>
    <tr><th>#</th><th>File</th><th class="num">Tokens</th><th class="num">%</th></tr>
    ${topFiles.map((f, i) => `
    <tr>
      <td>${i + 1}</td>
      <td class="path">${escapeHtml(f.relativePath)}</td>
      <td class="num">${f.estimatedTokens.toLocaleString()}</td>
      <td class="num">${pct(f.estimatedTokens / scan.includedTokens)}</td>
    </tr>`).join("")}
  </table>` : `<p class="section-note">No included files.</p>`}

  <h2>Top Folders by Tokens</h2>
  ${topFolders.length > 0 ? `
  <table>
    <tr><th>#</th><th>Folder</th><th class="num">Files</th><th class="num">Tokens</th><th class="num">%</th></tr>
    ${topFolders.map((f, i) => `
    <tr>
      <td>${i + 1}</td>
      <td class="path">${escapeHtml(f.folderPath)}</td>
      <td class="num">${f.includedFiles}</td>
      <td class="num">${f.totalTokens.toLocaleString()}</td>
      <td class="num">${pct(f.totalTokens / scan.includedTokens)}</td>
    </tr>`).join("")}
  </table>` : `<p class="section-note">No folder data available.</p>`}

  <h2>Language Breakdown</h2>
  ${sortedLangs.length > 0 ? `
  <table>
    <tr><th>Language</th><th class="num">Files</th><th class="num">Tokens</th><th class="num">%</th></tr>
    ${sortedLangs.map((l) => `
    <tr>
      <td>${escapeHtml(l.language)}</td>
      <td class="num">${l.fileCount}</td>
      <td class="num">${l.totalTokens.toLocaleString()}</td>
      <td class="num">${pct(l.percentage)}</td>
    </tr>`).join("")}
  </table>` : `<p class="section-note">No language data available.</p>`}

  <h2>Warnings</h2>
  ${scan.warnings.length > 0 ? `
  <ul class="warn-list">
    ${scan.warnings.map((w: string) => `<li>${escapeHtml(w)}</li>`).join("")}
  </ul>` : `<p class="section-note">No warnings.</p>`}

  <h2>Assumptions</h2>
  ${recommendation && recommendation.assumptions.length > 0 ? `
  <ul class="assumptions-list">
    ${recommendation.assumptions.map((a: string) => `<li>${escapeHtml(a)}</li>`).join("")}
  </ul>` : `<p class="section-note">${recommendation ? "No assumptions recorded." : "No recommendations available."}</p>`}

  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;">
    <button class="btn" onclick="postCmd('rescan')">Re-scan Workspace</button>
    <button class="btn" onclick="postCmd('changeGoal')">Change Goal</button>
    <button class="btn" onclick="postCmd('compareModels')">Compare Models</button>
    <button class="btn" onclick="postCmd('generateAgentRules')">Generate Agent Rules</button>
    <button class="btn" onclick="postCmd('exportReport')">Export Markdown Report</button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    function postCmd(command) {
      vscode.postMessage({ command });
    }
  </script>
</body>
</html>`;
}

function renderRecCard(label: string, rec: ModelRecommendation): string {
  const scoreClass = rec.score.totalScore >= 0.7 ? "score-high" : rec.score.totalScore >= 0.5 ? "score-med" : "score-low";
  const reasons = rec.reasons.slice(0, 5).map((r: string) => escapeHtml(r)).join("<br>");
  return `
  <div class="card card-rec">
    <div class="card-label">${escapeHtml(label)}</div>
    <div class="rec-name">${escapeHtml(rec.displayName)}</div>
    <div class="rec-detail"><span class="rec-score ${scoreClass}">${(rec.score.totalScore * 100).toFixed(0)}/100</span></div>
    <div class="rec-detail">${fmtCost(rec.costEstimate.totalCost)}</div>
    ${reasons ? `<div class="rec-detail" style="margin-top:6px;font-size:0.8em;">${reasons}</div>` : ""}
  </div>`;
}
