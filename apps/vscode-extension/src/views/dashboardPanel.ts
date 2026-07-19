import * as vscode from "vscode";
import type {
  WorkspaceScanResult,
  RecommendationResult,
  ModelRecommendation,
  ModelInfo,
} from "@wma/core";
import { randomBytes } from "node:crypto";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

function pct(n: number): string {
  return `${((Number.isFinite(n) ? n : 0) * 100).toFixed(1)}%`;
}

export function createDashboardPanel(
  context: vscode.ExtensionContext,
  scanResult: WorkspaceScanResult,
  recommendation: RecommendationResult | null,
  models: ModelInfo[],
): vscode.WebviewPanel {
  const panel = vscode.window.createWebviewPanel(
    "wmaDashboard",
    "TCalc",
    vscode.ViewColumn.One,
    { enableScripts: true, localResourceRoots: [] },
  );

  const webview = panel.webview;
  const nonce = getNonce();

  webview.html = getHtml(webview, nonce, scanResult, recommendation, models);

  webview.onDidReceiveMessage((message) => {
    switch (message.command) {
      case "exportReport":
        vscode.commands.executeCommand("workspaceModelAdvisor.exportReport");
        break;
      case "rescan":
        vscode.commands.executeCommand("workspaceModelAdvisor.scanWorkspace");
        break;
      case "changeGoal":
        vscode.commands.executeCommand(
          "workspaceModelAdvisor.setWorkspaceGoal",
        );
        break;
      case "compareModels":
        vscode.commands.executeCommand("workspaceModelAdvisor.compareModels");
        break;
      case "generateAgentRules":
        vscode.commands.executeCommand(
          "workspaceModelAdvisor.generateAgentRules",
        );
        break;
      case "generateRepoMap":
        vscode.commands.executeCommand("workspaceModelAdvisor.generateRepoMap");
        break;
      case "openSettings":
        vscode.commands.executeCommand("workspaceModelAdvisor.openSettings");
        break;
    }
  });

  return panel;
}

function getNonce(): string {
  return randomBytes(32).toString("base64");
}

function getHtml(
  webview: vscode.Webview,
  nonce: string,
  scan: WorkspaceScanResult,
  recommendation: RecommendationResult | null,
  models: ModelInfo[],
): string {
  const sortedFiles = [...scan.files]
    .filter((f) => f.included)
    .sort((a, b) => b.estimatedTokens - a.estimatedTokens);
  const topFiles = sortedFiles.slice(0, 10);

  const sortedFolders = [...scan.folders]
    .filter((f) => f.includedFiles > 0)
    .sort((a, b) => b.totalTokens - a.totalTokens);
  const topFolders = sortedFolders.slice(0, 10);

  const sortedLangs = [...scan.languages].sort(
    (a, b) => b.totalTokens - a.totalTokens,
  );
  const providers = [...new Set(models.map((model) => model.provider))].sort();
  const eligibleCount = recommendation?.allScored.length ?? 0;
  const contextFitCount =
    recommendation?.allScored.filter((model) => model.overflowRisk === 0)
      .length ?? 0;
  const alternativeModels = recommendation
    ? [...recommendation.allScored]
        .sort((a, b) => b.score.totalScore - a.score.totalScore)
        .slice(0, 8)
    : [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TCalc</title>
  <style nonce="${nonce}">
    :root {
      --bg: var(--vscode-editor-background, #1e1e1e);
      --fg: var(--vscode-editor-foreground, #d4d4d4);
      --border: var(--vscode-panel-border, #333);
      --card-bg: var(--vscode-editor-inactiveSelectionBackground, #2a2d2e);
      --surface: var(--vscode-sideBar-background, var(--card-bg));
      --heading: var(--vscode-editor-foreground, #e0e0e0);
      --accent: var(--vscode-textLink-foreground, #3794ff);
      --success: #4ec9b0;
      --warning: #cca700;
      --error: #f14c4c;
      --muted: var(--vscode-descriptionForeground, #8c8c8c);
      --button-fg: var(--vscode-button-foreground, #fff);
      --button-bg: var(--vscode-button-background, var(--accent));
      --button-hover: var(--vscode-button-hoverBackground, var(--accent));
      --focus: var(--vscode-focusBorder, var(--accent));
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--fg);
      padding: 0;
      line-height: 1.5;
      margin: 0;
    }
    .shell { width: min(1180px, 100%); margin: 0 auto; padding: 28px 24px 48px; }
    h1, h2, h3 { color: var(--heading); font-weight: 600; text-wrap: balance; }
    h1 { font-size: clamp(1.6rem, 3vw, 2.15rem); margin: 0; }
    h2 { font-size: 1.15rem; margin: 32px 0 12px; }
    h3 { font-size: 1.05em; margin: 16px 0 8px; }
    p, li { text-wrap: pretty; }
    .hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding-bottom: 24px; border-bottom: 1px solid var(--border); }
    .eyebrow { color: var(--accent); font-weight: 600; margin-bottom: 4px; }
    .lede { color: var(--muted); max-width: 68ch; margin: 6px 0 0; }
    .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 12px 0; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 14px 18px;
      min-width: 0;
    }
    .card-label { font-size: 0.82em; color: var(--muted); font-weight: 600; }
    .card-value { font-size: 1.5em; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; }
    .card-rec { border-top: 2px solid var(--accent); }
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
    .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 6px; }
    .table-wrap table { margin: 0; }
    th, td {
      text-align: left;
      padding: 6px 10px;
      border-bottom: 1px solid var(--border);
    }
    th { color: var(--muted); font-weight: 600; font-size: 0.85em; }
    td { font-variant-numeric: tabular-nums; }
    .path { font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", monospace; font-size: 0.9em; }
    .warn-list { padding-left: 18px; }
    .warn-list li { margin: 4px 0; }
    .assumptions-list { padding-left: 18px; color: var(--muted); font-size: 0.9em; }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      min-height: 44px; background: var(--button-bg); color: var(--button-fg); border: 1px solid transparent; border-radius: 4px;
      padding: 8px 16px; font: inherit; font-weight: 600; cursor: pointer;
    }
    .btn:hover { background: var(--button-hover); }
    .btn-secondary { background: transparent; color: var(--fg); border-color: var(--border); }
    .btn-secondary:hover { background: var(--card-bg); }
    .btn:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 24px; }
    .rec-reasons { margin-top: 6px; font-size: 0.8em; }
    .section-note { color: var(--muted); font-size: 0.85em; }
    td.num { text-align: right; }
    th.num { text-align: right; }
    .catalog { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .chip { border: 1px solid var(--border); border-radius: 999px; padding: 4px 9px; color: var(--muted); }
    .callout { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 16px; border: 1px solid var(--warning); border-radius: 6px; background: var(--surface); }
    .callout p { margin: 0; }
    @media (max-width: 760px) {
      body { font-size: 16px; }
      .shell { padding: 20px 16px 40px; }
      .hero, .callout { align-items: stretch; flex-direction: column; }
      .cards { grid-template-columns: 1fr; }
      .hero .btn { width: 100%; justify-content: center; }
    }
  </style>
</head>
<body>
  <main class="shell">
  <header class="hero">
    <div>
      <div class="eyebrow">Workspace intelligence</div>
      <h1>TCalc dashboard</h1>
      <p class="lede">Understand repository size, compare model fit, and act on the recommendation without leaving VS Code.</p>
    </div>
    <button class="btn" onclick="postCmd('rescan')">Re-scan workspace</button>
  </header>

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
      <div class="card-label">Model catalogue</div>
      <div class="card-value">${models.length.toLocaleString()}</div>
      <div class="rec-detail">${providers.length.toLocaleString()} providers · ${eligibleCount.toLocaleString()} policy-eligible · ${contextFitCount.toLocaleString()} context-fit</div>
    </div>
  </div>

  <div class="catalog" aria-label="Configured providers">
    ${providers.map((provider) => `<span class="chip">${escapeHtml(provider)}</span>`).join("")}
  </div>

  ${
    recommendation
      ? `
  <h2>Recommendations</h2>
  <div class="cards">
    ${renderRecCard("Cheapest sufficient", recommendation.cheapestSufficient, models)}
    ${renderRecCard("Balanced", recommendation.balanced, models)}
    ${renderRecCard("High confidence", recommendation.highConfidence, models)}
  </div>
  ${
    contextFitCount <= 1
      ? `
  <div class="callout" role="status">
    <p><strong>Only ${contextFitCount} ${contextFitCount === 1 ? "model fits" : "models fit"} the required context.</strong> ${eligibleCount <= 1 ? "Privacy mode or a team model profile is narrowing the catalogue." : "The ranked alternatives below may need a smaller repo map."}</p>
    <button class="btn btn-secondary" onclick="postCmd('${eligibleCount <= 1 ? "openSettings" : "generateRepoMap"}')">${eligibleCount <= 1 ? "Review settings" : "Generate repo map"}</button>
  </div>`
      : ""
  }

  ${
    alternativeModels.length > 0
      ? `
  <h2>Ranked catalogue</h2>
  <div class="table-wrap"><table>
    <tr><th>Model</th><th>Provider</th><th class="num">Fit</th><th class="num">Est. cost</th><th class="num">Context</th></tr>
    ${alternativeModels.map((rec) => renderModelRow(rec, models)).join("")}
  </table></div>`
      : ""
  }
  `
      : `
  <h2>Recommendations</h2>
  <p class="section-note">No model recommendations available. The model catalog may be empty.</p>
  `
  }

  <h2>Top Files by Tokens</h2>
  ${
    topFiles.length > 0
      ? `
  <div class="table-wrap"><table>
    <tr><th>#</th><th>File</th><th class="num">Tokens</th><th class="num">%</th></tr>
    ${topFiles
      .map(
        (f, i) => `
    <tr>
      <td>${i + 1}</td>
      <td class="path">${escapeHtml(f.relativePath)}</td>
      <td class="num">${f.estimatedTokens.toLocaleString()}</td>
      <td class="num">${pct(f.estimatedTokens / scan.includedTokens)}</td>
    </tr>`,
      )
      .join("")}
  </table></div>`
      : `<p class="section-note">No included files.</p>`
  }

  <h2>Top Folders by Tokens</h2>
  ${
    topFolders.length > 0
      ? `
  <div class="table-wrap"><table>
    <tr><th>#</th><th>Folder</th><th class="num">Files</th><th class="num">Tokens</th><th class="num">%</th></tr>
    ${topFolders
      .map(
        (f, i) => `
    <tr>
      <td>${i + 1}</td>
      <td class="path">${escapeHtml(f.folderPath)}</td>
      <td class="num">${f.includedFiles}</td>
      <td class="num">${f.totalTokens.toLocaleString()}</td>
      <td class="num">${pct(f.totalTokens / scan.includedTokens)}</td>
    </tr>`,
      )
      .join("")}
  </table></div>`
      : `<p class="section-note">No folder data available.</p>`
  }

  <h2>Language Breakdown</h2>
  ${
    sortedLangs.length > 0
      ? `
  <div class="table-wrap"><table>
    <tr><th>Language</th><th class="num">Files</th><th class="num">Tokens</th><th class="num">%</th></tr>
    ${sortedLangs
      .map(
        (l) => `
    <tr>
      <td>${escapeHtml(l.language)}</td>
      <td class="num">${l.fileCount}</td>
      <td class="num">${l.totalTokens.toLocaleString()}</td>
      <td class="num">${pct(l.percentage)}</td>
    </tr>`,
      )
      .join("")}
  </table></div>`
      : `<p class="section-note">No language data available.</p>`
  }

  <h2>Warnings</h2>
  ${
    scan.warnings.length > 0
      ? `
  <ul class="warn-list">
    ${scan.warnings.map((w: string) => `<li>${escapeHtml(w)}</li>`).join("")}
  </ul>`
      : `<p class="section-note">No warnings.</p>`
  }

  <h2>Assumptions</h2>
  ${
    recommendation && recommendation.assumptions.length > 0
      ? `
  <ul class="assumptions-list">
    ${recommendation.assumptions.map((a: string) => `<li>${escapeHtml(a)}</li>`).join("")}
  </ul>`
      : `<p class="section-note">${recommendation ? "No assumptions recorded." : "No recommendations available."}</p>`
  }

  <div class="actions">
    <button class="btn" onclick="postCmd('rescan')">Re-scan workspace</button>
    <button class="btn btn-secondary" onclick="postCmd('changeGoal')">Change goal</button>
    <button class="btn btn-secondary" onclick="postCmd('compareModels')">Compare models</button>
    <button class="btn btn-secondary" onclick="postCmd('generateAgentRules')">Generate agent rules</button>
    <button class="btn btn-secondary" onclick="postCmd('generateRepoMap')">Generate repo map</button>
    <button class="btn btn-secondary" onclick="postCmd('exportReport')">Export report</button>
  </div>
  </main>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    function postCmd(command) {
      vscode.postMessage({ command });
    }
  </script>
</body>
</html>`;
}

function renderRecCard(
  label: string,
  rec: ModelRecommendation,
  models: ModelInfo[],
): string {
  const scoreClass =
    rec.score.totalScore >= 0.7
      ? "score-high"
      : rec.score.totalScore >= 0.5
        ? "score-med"
        : "score-low";
  const reasons = rec.reasons
    .slice(0, 5)
    .map((r: string) => escapeHtml(r))
    .join("<br>");
  const model = models.find((candidate) => candidate.id === rec.modelId);
  return `
  <div class="card card-rec">
    <div class="card-label">${escapeHtml(label)}</div>
    <div class="rec-name">${escapeHtml(rec.displayName)}</div>
    <div class="rec-detail">${escapeHtml(model?.provider ?? "Unknown provider")} · ${model?.contextWindow.toLocaleString() ?? "—"} context</div>
    <div class="rec-detail"><span class="rec-score ${scoreClass}">${(rec.score.totalScore * 100).toFixed(0)}/100</span></div>
    <div class="rec-detail">${fmtCost(rec.costEstimate.totalCost)}</div>
    ${reasons ? `<div class="rec-detail rec-reasons">${reasons}</div>` : ""}
  </div>`;
}

function renderModelRow(rec: ModelRecommendation, models: ModelInfo[]): string {
  const model = models.find((candidate) => candidate.id === rec.modelId);
  return `<tr>
    <td><strong>${escapeHtml(rec.displayName)}</strong><br><span class="section-note path">${escapeHtml(rec.modelId)}</span></td>
    <td>${escapeHtml(model?.provider ?? "—")}</td>
    <td class="num">${(rec.score.totalScore * 100).toFixed(0)}/100</td>
    <td class="num">${fmtCost(rec.costEstimate.totalCost)}</td>
    <td class="num">${model?.contextWindow.toLocaleString() ?? "—"}</td>
  </tr>`;
}
