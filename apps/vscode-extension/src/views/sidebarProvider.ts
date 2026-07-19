import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import type { ModelInfo, RecommendationResult, WorkspaceScanResult } from "@wma/core";

const commands: Record<string, string> = {
  scan: "workspaceModelAdvisor.scanWorkspace",
  dashboard: "workspaceModelAdvisor.openDashboard",
  compare: "workspaceModelAdvisor.compareModels",
  goal: "workspaceModelAdvisor.setWorkspaceGoal",
  repoMap: "workspaceModelAdvisor.generateRepoMap",
  rules: "workspaceModelAdvisor.generateAgentRules",
  report: "workspaceModelAdvisor.exportReport",
  mcp: "workspaceModelAdvisor.generateMcpConfig",
  settings: "workspaceModelAdvisor.openSettings",
};

export class TCalcSidebarProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [] };
    view.webview.onDidReceiveMessage((message: { command?: string }) => {
      const command = message.command && commands[message.command];
      if (command) void vscode.commands.executeCommand(command);
    });
    this.refresh();
  }

  refresh(): void {
    if (this.view) this.view.webview.html = this.html(this.view.webview);
  }

  private html(webview: vscode.Webview): string {
    const scan = this.context.workspaceState.get<WorkspaceScanResult>("wma.lastScan");
    const recommendation = this.context.workspaceState.get<RecommendationResult | null>("wma.lastRecommendation");
    const models = this.context.workspaceState.get<ModelInfo[]>("wma.lastModels") ?? [];
    const nonce = randomBytes(24).toString("base64");
    const workspace = vscode.workspace.workspaceFolders?.[0]?.name;
    const goal = vscode.workspace.getConfiguration("wma").get<string>("defaultGoal") ?? "build-mvp";
    const privacy = vscode.workspace.getConfiguration("wma").get<string>("privacyMode") ?? "local-first";

    return `<!doctype html>
<html lang="en"><head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style nonce="${nonce}">
    *{box-sizing:border-box}body{margin:0;padding:14px;color:var(--vscode-sideBar-foreground);background:var(--vscode-sideBar-background);font:var(--vscode-font-size) var(--vscode-font-family);line-height:1.45}
    button{font:inherit}.top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:16px}.brand{display:flex;align-items:center;gap:8px;font-weight:700}.mark{display:grid;grid-template-columns:repeat(3,4px);align-items:end;gap:2px;width:22px;height:22px;padding:4px;background:var(--vscode-foreground)}.mark i{background:var(--vscode-sideBar-background)}.mark i:nth-child(1){height:6px}.mark i:nth-child(2){height:13px}.mark i:nth-child(3){height:9px}
    .tag{padding:2px 6px;border:1px solid var(--vscode-panel-border);color:var(--vscode-descriptionForeground);font-size:10px;text-transform:uppercase}.empty{padding:20px 0;border-top:1px solid var(--vscode-panel-border);border-bottom:1px solid var(--vscode-panel-border)}h2{margin:0 0 6px;font-size:16px}.muted{margin:0;color:var(--vscode-descriptionForeground);font-size:12px}.primary,.secondary,.link{width:100%;min-height:36px;margin-top:10px;border:1px solid transparent;padding:7px 10px;cursor:pointer}.primary{background:var(--vscode-button-background);color:var(--vscode-button-foreground);font-weight:600}.primary:hover{background:var(--vscode-button-hoverBackground)}.secondary{border-color:var(--vscode-button-secondaryBackground);background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground)}.secondary:hover{background:var(--vscode-button-secondaryHoverBackground)}button:focus-visible{outline:2px solid var(--vscode-focusBorder);outline-offset:2px}
    .scan{padding:12px 0;border-top:1px solid var(--vscode-panel-border)}.workspace{overflow:hidden;margin:0;text-overflow:ellipsis;white-space:nowrap;font-weight:600}.meta{display:flex;gap:6px;margin-top:4px;color:var(--vscode-descriptionForeground);font-size:11px}.metric{display:grid;grid-template-columns:1fr auto;align-items:end;padding:12px 0;border-bottom:1px solid var(--vscode-panel-border)}.metric span{color:var(--vscode-descriptionForeground);font-size:11px;text-transform:uppercase}.metric strong{grid-row:1/3;grid-column:2;font-size:20px;font-variant-numeric:tabular-nums}.metric small{color:var(--vscode-descriptionForeground)}
    .section{margin-top:18px}.section-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;color:var(--vscode-descriptionForeground);font-size:10px;font-weight:700;text-transform:uppercase}.pick{display:grid;grid-template-columns:1fr auto;gap:2px 8px;padding:9px 0;border-top:1px solid var(--vscode-panel-border)}.pick strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pick small{color:var(--vscode-descriptionForeground)}.pick b{grid-row:1/3;grid-column:2;align-self:center;color:var(--vscode-charts-green);font-variant-numeric:tabular-nums}.actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.actions button{min-height:52px;margin:0;text-align:left;border:1px solid var(--vscode-panel-border);background:transparent;color:inherit;padding:8px;cursor:pointer}.actions button:hover{background:var(--vscode-list-hoverBackground)}.actions small{display:block;margin-top:3px;color:var(--vscode-descriptionForeground);font-size:10px}.foot{display:flex;justify-content:space-between;margin-top:18px;padding-top:10px;border-top:1px solid var(--vscode-panel-border)}.link{width:auto;min-height:28px;margin:0;padding:2px;border:0;background:transparent;color:var(--vscode-textLink-foreground);font-size:11px}.link:hover{text-decoration:underline}
  </style></head><body>
  <div class="top"><div class="brand"><span class="mark" aria-hidden="true"><i></i><i></i><i></i></span>TCalc</div><span class="tag">${escapeHtml(privacy)}</span></div>
  ${scan ? `
    <section class="scan"><p class="workspace">${escapeHtml(workspace ?? "Workspace")}</p><div class="meta"><span>${escapeHtml(goal)}</span><span>·</span><span>${relativeTime(scan.scannedAt)}</span></div></section>
    <div class="metric"><span>Included tokens</span><small>${scan.includedFiles.toLocaleString()} files</small><strong>${compact(scan.includedTokens)}</strong></div>
    <div class="metric"><span>Catalogue</span><small>${new Set(models.map((model) => model.provider)).size} providers</small><strong>${models.length}</strong></div>
    ${recommendation ? `<section class="section"><div class="section-title"><span>Top recommendations</span><span>Fit</span></div>${[
      recommendation.cheapestSufficient,
      recommendation.balanced,
      recommendation.highConfidence,
    ].map((model) => `<div class="pick"><strong>${escapeHtml(model.displayName)}</strong><small>${escapeHtml(model.tier.replaceAll("-", " "))}</small><b>${Math.round(model.score.totalScore * 100)}</b></div>`).join("")}<button class="secondary" data-command="compare">Compare full catalogue</button></section>` : ""}
    <section class="section"><div class="section-title"><span>Workspace tools</span></div><div class="actions">
      <button data-command="dashboard"><strong>Dashboard</strong><small>Full analysis</small></button><button data-command="goal"><strong>Goal</strong><small>${escapeHtml(goal)}</small></button>
      <button data-command="repoMap"><strong>Repo map</strong><small>Budgeted context</small></button><button data-command="rules"><strong>Agent rules</strong><small>Goal-aware</small></button>
      <button data-command="report"><strong>Export</strong><small>Markdown / HTML</small></button><button data-command="mcp"><strong>MCP config</strong><small>Connect an agent</small></button>
    </div></section>
    <button class="primary" data-command="scan">Re-scan workspace</button>
  ` : `<section class="empty"><h2>${workspace ? "Ready to measure this workspace" : "Open a folder to begin"}</h2><p class="muted">${workspace ? "Scan locally to see token usage, ranked models, and agent-ready actions." : "TCalc needs one open workspace folder. No source leaves your machine."}</p>${workspace ? `<button class="primary" data-command="scan">Scan workspace</button>` : ""}</section>`}
  <div class="foot"><button class="link" data-command="settings">Settings</button>${scan ? `<button class="link" data-command="dashboard">Open dashboard →</button>` : ""}</div>
  <script nonce="${nonce}">const vscode=acquireVsCodeApi();document.addEventListener("click",event=>{const button=event.target.closest("[data-command]");if(button)vscode.postMessage({command:button.dataset.command});});</script>
</body></html>`;
  }
}

function compact(value: number): string {
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function relativeTime(value: string): string {
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 60_000) return "just now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`;
  return `${Math.floor(elapsed / 86_400_000)}d ago`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
