import type { WorkspaceScanResult } from "@wma/core";

export interface HtmlReportOptions {
  title?: string;
  projectName?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function generateHtmlReport(
  scanResult: WorkspaceScanResult,
  options: HtmlReportOptions = {},
): string {
  const title = escapeHtml(options.title ?? "TCalc — Workspace Token & Cost Report");
  const projectName = escapeHtml(options.projectName ?? scanResult.rootPath.split(/[/\\]/).pop() ?? "Workspace");
  const scannedAt = new Date(scanResult.scannedAt || Date.now()).toUTCString();

  const totalTokens = scanResult.totalTokens ?? 0;
  const includedCount = scanResult.includedFiles ?? 0;
  const excludedCount = scanResult.excludedFiles ?? 0;
  const totalFiles = scanResult.totalFiles ?? 0;
  const totalBytes = scanResult.totalBytes ?? 0;

  // Language aggregation for distribution bar
  const langTokens = new Map<string, number>();
  for (const f of scanResult.files) {
    if (!f.included) continue;
    const lang = f.language || "Other";
    langTokens.set(lang, (langTokens.get(lang) ?? 0) + f.estimatedTokens);
  }

  const sortedLangs = Array.from(langTokens.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const langPalette = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#64748B"];

  let svgSegments = "";
  let currentX = 0;
  const svgWidth = 800;

  sortedLangs.forEach(([lang, tokens], idx) => {
    const pct = totalTokens > 0 ? tokens / totalTokens : 0;
    const segmentWidth = Math.max(2, Math.round(pct * svgWidth));
    const color = langPalette[idx % langPalette.length];
    svgSegments += `<rect x="${currentX}" y="0" width="${segmentWidth}" height="24" fill="${color}"><title>${escapeHtml(lang)}: ${tokens.toLocaleString()} tokens (${(pct * 100).toFixed(1)}%)</title></rect>`;
    currentX += segmentWidth;
  });

  if (currentX < svgWidth) {
    const remainder = svgWidth - currentX;
    svgSegments += `<rect x="${currentX}" y="0" width="${remainder}" height="24" fill="${langPalette[5]}"><title>Other: ${remainder} tokens</title></rect>`;
  }

  // Model estimations table
  const models = [
    { name: "Claude 3.7 Sonnet", provider: "Anthropic", window: "200k", costPer1M: 3.0, fits: totalTokens <= 200000 },
    { name: "GPT-4o", provider: "OpenAI", window: "128k", costPer1M: 2.5, fits: totalTokens <= 128000 },
    { name: "Gemini 2.0 Flash", provider: "Google", window: "1,000k", costPer1M: 0.1, fits: totalTokens <= 1000000 },
    { name: "DeepSeek V3", provider: "DeepSeek", window: "64k", costPer1M: 0.27, fits: totalTokens <= 64000 },
    { name: "Llama 3.3 70B (Ollama)", provider: "Local", window: "128k", costPer1M: 0.0, fits: totalTokens <= 128000 },
  ];

  const modelRows = models
    .map((m) => {
      const cost = m.costPer1M > 0 ? `$${((totalTokens / 1000000) * m.costPer1M).toFixed(4)}` : "FREE (Local)";
      const fitBadge = m.fits
        ? `<span class="badge badge-success">✓ Fits (${Math.round((totalTokens / parseInt(m.window.replace(/,/g, "").replace("k", "000"))) * 100)}% context)</span>`
        : `<span class="badge badge-danger">✗ Overflow</span>`;
      return `
        <tr>
          <td><strong>${escapeHtml(m.name)}</strong></td>
          <td>${escapeHtml(m.provider)}</td>
          <td>${m.window} tokens</td>
          <td>${cost}</td>
          <td>${fitBadge}</td>
        </tr>`;
    })
    .join("\n");

  // File rows
  const fileRows = scanResult.files
    .slice(0, 500)
    .map((f) => {
      const statusBadge = f.included
        ? `<span class="badge badge-success">Included</span>`
        : `<span class="badge badge-muted">${escapeHtml(f.excludedReason ?? "Excluded")}</span>`;

      const riskBadges = f.riskFlags.map((r) => `<span class="badge badge-warning">${escapeHtml(r)}</span>`).join(" ");

      return `
        <tr class="file-row">
          <td class="file-path"><code>${escapeHtml(f.relativePath)}</code></td>
          <td>${escapeHtml(f.language || "Unknown")}</td>
          <td>${formatBytes(f.bytes)}</td>
          <td><strong>${f.estimatedTokens.toLocaleString()}</strong></td>
          <td>${statusBadge}</td>
          <td>${riskBadges || "—"}</td>
        </tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root {
      --bg: #0B0F19;
      --card-bg: #151D2F;
      --border: #23314E;
      --text: #F1F5F9;
      --text-muted: #94A3B8;
      --primary: #3B82F6;
      --accent: #10B981;
      --danger: #EF4444;
      --warning: #F59E0B;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 2rem 1rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header {
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
    }
    h1 { font-size: 1.75rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; }
    .subtitle { color: var(--text-muted); font-size: 0.9rem; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.25rem;
    }
    .card-title { font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600; margin-bottom: 0.5rem; }
    .card-value { font-size: 1.75rem; font-weight: 700; color: #fff; }
    .card-meta { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; }
    .section {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    h2 { font-size: 1.15rem; font-weight: 600; margin-bottom: 1rem; color: #fff; }
    .svg-bar-container { width: 100%; overflow: hidden; border-radius: 6px; margin: 1rem 0; }
    .legend { display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.85rem; color: var(--text-muted); }
    .legend-item { display: flex; align-items: center; gap: 0.4rem; }
    .legend-color { width: 12px; height: 12px; border-radius: 3px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th { text-align: left; padding: 0.75rem 1rem; border-bottom: 2px solid var(--border); color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; }
    td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); }
    tr:hover td { background-color: rgba(255, 255, 255, 0.02); }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.85rem; color: #93C5FD; }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-success { background: rgba(16, 185, 129, 0.15); color: #34D399; }
    .badge-danger { background: rgba(239, 68, 68, 0.15); color: #F87171; }
    .badge-warning { background: rgba(245, 158, 11, 0.15); color: #FBBF24; }
    .badge-muted { background: rgba(148, 163, 184, 0.15); color: #94A3B8; }
    .search-input {
      width: 100%;
      max-width: 350px;
      background: #0B0F19;
      border: 1px solid var(--border);
      color: #fff;
      padding: 0.6rem 0.9rem;
      border-radius: 6px;
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }
    .search-input:focus { outline: none; border-color: var(--primary); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${projectName} — Token & Cost Report</h1>
      <div class="subtitle">Scanned: ${scannedAt} | Root: <code>${escapeHtml(scanResult.rootPath)}</code></div>
    </header>

    <div class="grid">
      <div class="card">
        <div class="card-title">Total Context Tokens</div>
        <div class="card-value">${totalTokens.toLocaleString()}</div>
        <div class="card-meta">${includedCount} active files included</div>
      </div>
      <div class="card">
        <div class="card-title">Scanned Files</div>
        <div class="card-value">${totalFiles}</div>
        <div class="card-meta">${excludedCount} files excluded by policy</div>
      </div>
      <div class="card">
        <div class="card-title">Workspace Size</div>
        <div class="card-value">${formatBytes(totalBytes)}</div>
        <div class="card-meta">${(totalBytes > 0 ? (totalTokens / (totalBytes / 1024)).toFixed(1) : 0)} tokens/KB</div>
      </div>
      <div class="card">
        <div class="card-title">Estimated 1M Cost</div>
        <div class="card-value">$${((totalTokens / 1000000) * 3.0).toFixed(3)}</div>
        <div class="card-meta">Base rate (Claude 3.7 Sonnet)</div>
      </div>
    </div>

    <div class="section">
      <h2>Token Distribution by Language</h2>
      <div class="svg-bar-container">
        <svg viewBox="0 0 ${svgWidth} 24" preserveAspectRatio="none" style="width: 100%; height: 24px; display: block;">
          ${svgSegments}
        </svg>
      </div>
      <div class="legend">
        ${sortedLangs
          .map(
            ([lang, tks], idx) => `
          <div class="legend-item">
            <span class="legend-color" style="background-color: ${langPalette[idx % langPalette.length]}"></span>
            <span>${escapeHtml(lang)} (${tks.toLocaleString()})</span>
          </div>`,
          )
          .join("")}
      </div>
    </div>

    <div class="section">
      <h2>Model Context Fit & Cost Projections</h2>
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Provider</th>
            <th>Context Window</th>
            <th>Prompt Cost</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${modelRows}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>File Inventory (${scanResult.files.length} items)</h2>
      <input type="text" id="searchInput" class="search-input" placeholder="Search files by path or language..." onkeyup="filterFiles()">
      <div style="overflow-x: auto;">
        <table id="filesTable">
          <thead>
            <tr>
              <th>File Path</th>
              <th>Language</th>
              <th>Size</th>
              <th>Tokens</th>
              <th>Status</th>
              <th>Risk Flags</th>
            </tr>
          </thead>
          <tbody>
            ${fileRows}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    function filterFiles() {
      const q = document.getElementById('searchInput').value.toLowerCase();
      const rows = document.querySelectorAll('.file-row');
      for (const r of rows) {
        const text = r.textContent.toLowerCase();
        r.style.display = text.includes(q) ? '' : 'none';
      }
    }
  </script>
</body>
</html>`;
}
