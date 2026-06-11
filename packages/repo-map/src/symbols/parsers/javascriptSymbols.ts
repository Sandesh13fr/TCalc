import type { RepoMapSymbol } from "@wma/core";

export function extractJavaScriptSymbols(content: string, relativePath: string, ext: string): RepoMapSymbol[] {
  const symbols: RepoMapSymbol[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    const isExport = /^(?:module\.exports\s*=|exports\.\w+\s*=|export\s+default\s+)/.test(line.trim()) ||
      /^\s*export\s+(?:default\s+)?/.test(line);
    const isAsync = /^\s*(?:export\s+)?(?:async\s+function|async\s+\()/.test(line);

    const stripped = line.replace(/^\s*(?:export\s+)?(?:default\s+)?/, "");

    // class X
    let m = stripped.match(/^class\s+(\w+)/);
    if (m) {
      symbols.push({
        name: m[1],
        kind: "class",
        relativePath,
        lineStart: lineNum,
        exported: isExport,
        priority: isExport ? 8 : 5,
      });
      continue;
    }

    // function name(...
    m = stripped.match(/^function\s+(\w+)/);
    if (m) {
      const isComponent = ext === ".jsx" && /^[A-Z]/.test(m[1]);
      symbols.push({
        name: m[1],
        kind: isComponent ? "component" : "function",
        relativePath,
        lineStart: lineNum,
        exported: isExport,
        async: isAsync,
        priority: isExport ? 7 : 4,
      });
      continue;
    }

    // const|let|var Name = ...
    m = stripped.match(/^(?:const|let|var)\s+(\w+)\s*=/);
    if (m) {
      const isComponent = ext === ".jsx" && /^[A-Z]/.test(m[1]);
      symbols.push({
        name: m[1],
        kind: isComponent ? "component" : "variable",
        relativePath,
        lineStart: lineNum,
        exported: isExport,
        priority: isExport && isComponent ? 8 : isExport ? 5 : 2,
      });
      continue;
    }

    // Arrow function: const X = (...) => ...
    // Handled above via const X = pattern
  }

  return symbols;
}
