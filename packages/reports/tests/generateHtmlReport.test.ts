import { describe, it, expect } from "vitest";
import type { WorkspaceScanResult, WorkspaceFileInfo } from "@wma/core";
import { generateHtmlReport } from "../src/index.js";

function makeFile(
  relPath: string,
  tokens: number,
  bytes = tokens * 4,
  language = "TypeScript",
  included = true,
  riskFlags: string[] = [],
): WorkspaceFileInfo {
  return {
    path: `/workspace/${relPath}`,
    relativePath: relPath,
    extension: relPath.includes(".") ? `.${relPath.split(".").pop()}` : "",
    language,
    bytes,
    estimatedTokens: tokens,
    included,
    riskFlags: riskFlags as any,
  };
}

function makeScanResult(files: WorkspaceFileInfo[]): WorkspaceScanResult {
  const totalTokens = files.reduce((s, f) => s + f.estimatedTokens, 0);
  const totalBytes = files.reduce((s, f) => s + f.bytes, 0);
  return {
    rootPath: "/workspace/demo-app",
    files,
    totalFiles: files.length,
    scannedFiles: files.length,
    includedFiles: files.filter((f) => f.included).length,
    excludedFiles: files.filter((f) => !f.included).length,
    totalBytes,
    totalTokens,
    confidence: "high",
    scannedAt: "2026-09-18T00:00:00.000Z",
    durationMs: 25,
    folderStats: [],
    warnings: [],
  };
}

describe("generateHtmlReport", () => {
  it("generates a valid HTML5 document with title and container", () => {
    const scan = makeScanResult([makeFile("src/index.ts", 1000)]);
    const html = generateHtmlReport(scan, { title: "Custom Token Report" });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>Custom Token Report</title>");
    expect(html).toContain("demo-app — Token & Cost Report");
    expect(html).toContain("class=\"container\"");
  });

  it("renders metric cards with formatted numbers and bytes", () => {
    const scan = makeScanResult([
      makeFile("src/index.ts", 15000, 60000),
      makeFile("dist/bundle.js", 50000, 200000, "JavaScript", false),
    ]);
    const html = generateHtmlReport(scan);

    expect(html).toContain("Total Context Tokens");
    expect(html).toContain("65,000");
    expect(html).toContain("Scanned Files");
    expect(html).toContain("Workspace Size");
  });

  it("renders SVG token distribution treemap bar", () => {
    const scan = makeScanResult([
      makeFile("src/index.ts", 4000, 16000, "TypeScript"),
      makeFile("src/style.css", 1000, 4000, "CSS"),
    ]);
    const html = generateHtmlReport(scan);

    expect(html).toContain("<svg viewBox=");
    expect(html).toContain("<rect x=");
    expect(html).toContain("Token Distribution by Language");
    expect(html).toContain("TypeScript");
    expect(html).toContain("CSS");
  });

  it("renders model cost projections and context fit badges", () => {
    const scan = makeScanResult([makeFile("src/main.ts", 50000)]);
    const html = generateHtmlReport(scan);

    expect(html).toContain("Claude 3.7 Sonnet");
    expect(html).toContain("GPT-4o");
    expect(html).toContain("Gemini 2.0 Flash");
    expect(html).toContain("Llama 3.3 70B (Ollama)");
    expect(html).toContain("FREE (Local)");
    expect(html).toContain("badge-success");
  });

  it("escapes malicious HTML characters to prevent XSS", () => {
    const scan = makeScanResult([
      makeFile("<script>alert(1)</script>.ts", 500),
    ]);
    const html = generateHtmlReport(scan, { title: "<evil>&\"'</evil>" });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;.ts");
    expect(html).toContain("&lt;evil&gt;&amp;&quot;&#039;&lt;/evil&gt;");
  });

  it("includes client-side search filter script", () => {
    const scan = makeScanResult([makeFile("src/app.ts", 100)]);
    const html = generateHtmlReport(scan);

    expect(html).toContain("id=\"searchInput\"");
    expect(html).toContain("function filterFiles()");
    expect(html).toContain("onkeyup=\"filterFiles()\"");
  });

  it("handles empty scan results safely", () => {
    const scan = makeScanResult([]);
    const html = generateHtmlReport(scan);

    expect(html).toContain("Total Context Tokens");
    expect(html).toContain("0");
    expect(html).toContain("<!DOCTYPE html>");
  });
});
